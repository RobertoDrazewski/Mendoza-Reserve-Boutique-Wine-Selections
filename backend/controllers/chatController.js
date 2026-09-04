const db = require('../config/db');
const { emailNuevoChatCliente } = require('../services/emailService');
const { openai, MODEL } = require('../services/openaiClient');

// Este chat es un asistente ACOTADO: sólo puede consultar el pedido puntual
// (cart_group_id + email) que ya se verificó en la página de seguimiento —
// nunca tiene acceso libre a la base de datos ni a pedidos de otra persona.
// Requiere que Roberto configure su propia OPENAI_API_KEY para el SaaS
// (independiente de cualquier otra integración).

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
        type: 'function',
        function: {
            name: 'get_order_status',
            description: 'Devuelve el estado actual, los vinos pedidos y los datos de envío del pedido del comprador de esta conversación. No recibe parámetros: siempre consulta el pedido ya identificado en este chat (nunca otro).',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    }
];

exports.chatOrderStatus = async (req, res) => {
    if (!openai) {
        return res.status(503).json({ error: 'El chat con IA todavía no está configurado (falta OPENAI_API_KEY en el servidor).' });
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
            { role: 'system', content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-10).map((h) => ({ role: h.role, content: h.content })) : []),
            { role: 'user', content: message }
        ];

        let response = await openai.chat.completions.create({
            model: MODEL, max_tokens: 500, tools, messages
        });
        let choice = response.choices[0];

        let safety = 0;
        while (choice.finish_reason === 'tool_calls' && safety < 3) {
            safety += 1;
            const toolCalls = choice.message.tool_calls || [];
            if (toolCalls.length === 0) break;

            const orders = await buscarPedido(cartGroupId, email);
            const toolResultContent = orders.length > 0 ? orders : { error: 'No se encontró ningún pedido con ese código y email.' };

            messages.push(choice.message);
            for (const toolCall of toolCalls) {
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResultContent)
                });
            }

            response = await openai.chat.completions.create({
                model: MODEL, max_tokens: 500, tools, messages
            });
            choice = response.choices[0];
        }

        const reply = choice.message.content || 'No tengo una respuesta en este momento, probá de nuevo en un rato.';
        res.json({ reply });

        // Aviso interno a Roberto sólo en el primer mensaje de la conversación (para saber
        // que alguien está consultando, sin inundarle la casilla en cada ida y vuelta del chat).
        const mensajesDeUsuario = Array.isArray(history) ? history.filter((h) => h.role === 'user').length : 1;
        if (mensajesDeUsuario <= 1) {
            try {
                await emailNuevoChatCliente({ cartGroupId, email, mensajeCliente: message, respuestaIA: reply });
            } catch (emailError) {
                console.error('Error enviando aviso de nuevo chat:', emailError.message);
            }
        }
    } catch (error) {
        console.error('Error en chatOrderStatus:', error.message);
        res.status(500).json({ error: 'Error al procesar el mensaje del chat' });
    }
};
