const Anthropic = require('@anthropic-ai/sdk');
const db = require('../config/db');

// Este chat es un asistente ACOTADO: sólo puede consultar el pedido puntual
// (cart_group_id + email) que ya se verificó en la página de seguimiento —
// nunca tiene acceso libre a la base de datos ni a pedidos de otra persona.
// Requiere que Roberto configure su propia ANTHROPIC_API_KEY para el SaaS
// (independiente de cualquier sesión de Claude Code).
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

async function buscarPedido(cartGroupId, email) {
    const [orders] = await db.query(
        `SELECT o.id, o.estado, o.subtotal, o.moneda, o.comision_estado, o.shipping_address,
                o.shipping_country, o.created_at, o.confirmed_at, b.nombre AS bodega_nombre
         FROM orders o JOIN bodegas b ON b.id = o.bodega_id
         WHERE o.cart_group_id = ? AND o.buyer_email = ?`,
        [cartGroupId, email]
    );
    for (const order of orders) {
        const [items] = await db.query(
            `SELECT oi.cantidad, oi.precio_unitario, v.nombre AS vino_nombre
             FROM order_items oi JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`,
            [order.id]
        );
        const [shipmentRows] = await db.query('SELECT status, carrier, tracking_number, tracking_url, shipped_at, estimated_delivery FROM shipments WHERE order_id = ?', [order.id]);
        order.items = items;
        order.shipment = shipmentRows[0] || null;
    }
    return orders;
}

const tools = [
    {
        name: 'get_order_status',
        description: 'Devuelve el estado actual, los vinos pedidos y los datos de envío del pedido del comprador de esta conversación. No recibe parámetros: siempre consulta el pedido ya identificado en este chat (nunca otro).',
        input_schema: { type: 'object', properties: {}, required: [] }
    }
];

exports.chatOrderStatus = async (req, res) => {
    if (!anthropic) {
        return res.status(503).json({ error: 'El chat con IA todavía no está configurado (falta ANTHROPIC_API_KEY en el servidor).' });
    }

    const { cartGroupId, email, message, history } = req.body;
    if (!cartGroupId || !email || !message) {
        return res.status(400).json({ error: 'Faltan cartGroupId, email o message' });
    }
    if (typeof message !== 'string' || message.length > 1000) {
        return res.status(400).json({ error: 'Mensaje inválido' });
    }

    const systemPrompt = `Sos el asistente virtual de Mendoza Reserve, un marketplace que conecta bodegas boutique de Mendoza con compradores de vino en Reino Unido.
Tu único trabajo en este chat es ayudar al comprador a entender el estado de SU PEDIDO puntual (el identificado por el cart_group_id de esta conversación).
Usá la herramienta get_order_status para consultar los datos reales antes de responder cualquier pregunta sobre el pedido — nunca inventes estados, fechas ni números de seguimiento.
Respondé en el mismo idioma en el que escribe el comprador (español o inglés). Sé breve, cálido y concreto.
Si preguntan algo que no tiene que ver con este pedido (otras bodegas, otros pedidos, temas generales), explicá amablemente que sólo podés ayudar con el seguimiento de este pedido.`;

    try {
        const messages = [
            ...(Array.isArray(history) ? history.slice(-10).map((h) => ({ role: h.role, content: h.content })) : []),
            { role: 'user', content: message }
        ];

        let response = await anthropic.messages.create({
            model: MODEL, max_tokens: 500, system: systemPrompt, tools, messages
        });

        let safety = 0;
        while (response.stop_reason === 'tool_use' && safety < 3) {
            safety += 1;
            const toolUse = response.content.find((c) => c.type === 'tool_use');
            if (!toolUse) break;

            const orders = await buscarPedido(cartGroupId, email);
            const toolResultContent = orders.length > 0 ? orders : { error: 'No se encontró ningún pedido con ese código y email.' };

            messages.push({ role: 'assistant', content: response.content });
            messages.push({
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResultContent) }]
            });

            response = await anthropic.messages.create({
                model: MODEL, max_tokens: 500, system: systemPrompt, tools, messages
            });
        }

        const textBlock = response.content.find((c) => c.type === 'text');
        res.json({ reply: textBlock ? textBlock.text : 'No tengo una respuesta en este momento, probá de nuevo en un rato.' });
    } catch (error) {
        console.error('Error en chatOrderStatus:', error.message);
        res.status(500).json({ error: 'Error al procesar el mensaje del chat' });
    }
};
