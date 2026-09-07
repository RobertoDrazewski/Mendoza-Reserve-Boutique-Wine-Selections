const crypto = require('crypto');
const db = require('../config/db');
const {
    emailNuevaOrdenBodega,
    emailReservaPendiente,
    emailConfirmacionComprador,
    emailRespuestaBodega
} = require('../services/emailService');
const { crearOrdenReserva, reembolsarOrden } = require('../services/revolutClient');
const { verificarFirmaWebhook } = require('../services/revolutWebhookAuth');
const { generarInvoicePDF } = require('../services/invoiceService');

// Genera un token largo y aleatorio para que la bodega confirme el pedido por email sin login
function generarAcceptToken() {
    return crypto.randomBytes(32).toString('hex'); // 64 caracteres hex
}

function redondear2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/**
 * 1. Crear una nueva orden.
 * El carrito puede traer vinos de varias bodegas: acá se separa en UNA fila de `orders`
 * por bodega (todas comparten el mismo cart_group_id), y se calcula la comisión de la
 * plataforma usando el comision_pct real de cada bodega (nunca el que mande el frontend).
 *
 * Body esperado:
 * {
 *   items: [{ id: <vino_id>, quantity: <int> }, ...],
 *   buyer: { name, company, email, phone },
 *   shipping: { address, country }
 * }
 */
exports.createOrder = async (req, res) => {
    const { items, buyer, shipping } = req.body;
    const user_id = req.user ? req.user.id : null;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }
    if (!buyer || !buyer.name || !buyer.email) {
        return res.status(400).json({ error: 'Faltan datos del comprador (nombre y email)' });
    }
    if (!shipping || !shipping.address) {
        return res.status(400).json({ error: 'Falta la dirección de envío' });
    }

    // Agrupar items por bodega
    const porBodega = {};
    for (const item of items) {
        if (!item.bodega_id) {
            return res.status(400).json({ error: `El item ${item.id} no tiene bodega_id` });
        }
        if (!porBodega[item.bodega_id]) porBodega[item.bodega_id] = [];
        porBodega[item.bodega_id].push(item);
    }
    const bodegaIds = Object.keys(porBodega).map(Number);

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [bodegasRows] = await connection.query(
            `SELECT id, nombre, email, comision_pct, estado FROM bodegas WHERE id IN (?)`,
            [bodegaIds]
        );
        const bodegasMap = {};
        bodegasRows.forEach((b) => { bodegasMap[b.id] = b; });

        const cartGroupId = crypto.randomUUID();
        const ordenesCreadas = [];

        for (const bodegaId of bodegaIds) {
            const bodega = bodegasMap[bodegaId];
            if (!bodega || bodega.estado !== 'activa') {
                throw new Error(`La bodega ${bodegaId} no está disponible para la venta en este momento`);
            }

            const itemsBodega = porBodega[bodegaId];
            const vinoIds = itemsBodega.map((i) => i.id);
            const [vinosRows] = await connection.query(
                `SELECT id, nombre, precio_unitario, moneda FROM vinos
                 WHERE id IN (?) AND bodega_id = ? AND activo = 1`,
                [vinoIds, bodegaId]
            );
            const vinosMap = {};
            vinosRows.forEach((v) => { vinosMap[v.id] = v; });

            let subtotal = 0;
            let moneda = null;
            const filasItems = [];
            for (const item of itemsBodega) {
                const vino = vinosMap[item.id];
                if (!vino) throw new Error(`El vino ${item.id} ya no está disponible`);
                const cantidad = Math.max(1, parseInt(item.quantity, 10) || 1);
                subtotal += Number(vino.precio_unitario) * cantidad;
                moneda = moneda || vino.moneda;
                filasItems.push({ vino_id: vino.id, vino_nombre: vino.nombre, cantidad, precio_unitario: vino.precio_unitario });
            }
            subtotal = redondear2(subtotal);

            const comisionPct = Number(bodega.comision_pct);
            const comisionMonto = redondear2((subtotal * comisionPct) / 100);
            const acceptToken = generarAcceptToken();

            const [orderResult] = await connection.query(
                `INSERT INTO orders
                    (cart_group_id, user_id, bodega_id, subtotal, moneda,
                     comision_pct_aplicada, comision_monto, estado,
                     buyer_name, buyer_company, buyer_email, buyer_phone,
                     shipping_address, shipping_country, accept_token)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente_bodega', ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cartGroupId, user_id, bodegaId, subtotal, moneda || 'USD',
                    comisionPct, comisionMonto,
                    buyer.name, buyer.company || null, buyer.email, buyer.phone || null,
                    shipping.address, shipping.country || 'United Kingdom', acceptToken
                ]
            );
            const orderId = orderResult.insertId;

            const itemValues = filasItems.map((f) => [orderId, f.vino_id, bodegaId, f.cantidad, f.precio_unitario]);
            await connection.query(
                `INSERT INTO order_items (order_id, vino_id, bodega_id, cantidad, precio_unitario) VALUES ?`,
                [itemValues]
            );

            await connection.query(`INSERT INTO shipments (order_id, status) VALUES (?, 'preparando')`, [orderId]);

            ordenesCreadas.push({
                orderId, bodegaId, bodegaNombre: bodega.nombre, bodegaEmail: bodega.email,
                subtotal, moneda: moneda || 'USD', acceptToken, comisionPct, comisionMonto,
                items: filasItems
            });
        }

        await connection.commit();

        // IMPORTANTE — acá cambia el flujo respecto de antes: ya NO se le avisa nada a
        // la bodega en este punto. Primero el comprador tiene que pagar la "reserva"
        // (nuestra comisión del 12%, cobrada directo por Mendoza Reserve vía Revolut).
        // Recién cuando Revolut confirma ese pago (webhookRevolut más abajo) se le manda
        // el pedido a la/las bodega/s por email. Así Mendoza Reserve nunca depende de que
        // la bodega le pague después, y nunca toca la plata de la bodega tampoco.
        //
        // Si el carrito mezcla bodegas que facturan en distinta moneda, se genera una
        // reserva (y un checkout de Revolut) por cada moneda — el comprador paga cada
        // una por separado. Es un caso raro (hoy casi todo el catálogo es USD), pero no
        // rompe si pasa.
        const porMoneda = {};
        for (const o of ordenesCreadas) {
            if (!porMoneda[o.moneda]) porMoneda[o.moneda] = [];
            porMoneda[o.moneda].push(o);
        }

        const trackingUrl = `${(process.env.SITE_URL || 'https://mendoza-reserve.co.uk').replace(/\/$/, '')}/seguimiento/${cartGroupId}?email=${encodeURIComponent(buyer.email)}`;
        const reservasCreadas = [];

        for (const [moneda, ordenesDeEstaMoneda] of Object.entries(porMoneda)) {
            const montoReserva = redondear2(
                ordenesDeEstaMoneda.reduce((acc, o) => acc + Number(o.comisionMonto), 0)
            );

            let revolutOrder;
            try {
                revolutOrder = await crearOrdenReserva({
                    monto: montoReserva,
                    moneda,
                    descripcion: `Reserva Mendoza Reserve — pedido ${cartGroupId}`,
                    referencia: cartGroupId,
                    redirectUrl: trackingUrl
                });
            } catch (revolutError) {
                // El pedido YA está creado y comprometido en la base — no lo revertimos
                // por esto. Lo que hacemos es devolverle al frontend el error puntual de
                // esta moneda para que pueda avisarle al comprador y reintentar el pago
                // (la orden queda visible en el admin con la reserva en estado 'pendiente').
                console.error(`❌ Error creando la orden de Revolut para la reserva en ${moneda}:`, revolutError.message);
                reservasCreadas.push({ moneda, monto: montoReserva, error: revolutError.message });
                continue;
            }

            await connection.query(
                `INSERT INTO reservas (cart_group_id, monto, moneda, estado, revolut_order_id, checkout_url)
                 VALUES (?, ?, ?, 'pendiente', ?, ?)`,
                [cartGroupId, montoReserva, moneda, revolutOrder.id, revolutOrder.checkoutUrl]
            );

            reservasCreadas.push({ moneda, monto: montoReserva, checkoutUrl: revolutOrder.checkoutUrl });
        }

        // Email de respaldo con el link de pago, por si el redirect automático del
        // frontend al checkout de Revolut no le funciona (bloqueador de pop-ups, etc.)
        try {
            for (const r of reservasCreadas) {
                if (r.checkoutUrl) {
                    await emailReservaPendiente({
                        buyerEmail: buyer.email, buyerName: buyer.name,
                        checkoutUrl: r.checkoutUrl, monto: r.monto, moneda: r.moneda
                    });
                }
            }
        } catch (emailError) {
            console.error('Error enviando el email de reserva pendiente (no afecta la compra):', emailError.message);
        }

        res.status(201).json({
            success: true,
            cartGroupId,
            orders: ordenesCreadas.map((o) => ({ orderId: o.orderId, bodegaId: o.bodegaId, bodegaNombre: o.bodegaNombre, subtotal: o.subtotal })),
            reservas: reservasCreadas,
            msg: 'Pedido generado — falta completar el pago de la reserva para que se le avise a la/las bodega/s'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al generar orden:', error.message);
        res.status(400).json({ error: error.message || 'No se pudo procesar la compra' });
    } finally {
        if (connection) connection.release();
    }
};

// 2. Historial de órdenes del usuario logueado
exports.getUserOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const [rows] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre
             FROM orders o JOIN bodegas b ON b.id = o.bodega_id
             WHERE o.user_id = ? ORDER BY o.created_at DESC`,
            [user_id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener órdenes:', error.message);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
};

// 3. Detalle de una orden puntual (dueño de la cuenta o admin)
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [orderRows] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre FROM orders o
             JOIN bodegas b ON b.id = o.bodega_id WHERE o.id = ?`, [id]
        );
        if (orderRows.length === 0) return res.status(404).json({ message: 'Orden no encontrada' });

        const order = orderRows[0];
        const esDueno = req.user && order.user_id === req.user.id;
        const esAdmin = req.user && req.user.rol === 'admin';
        if (!esDueno && !esAdmin) return res.status(403).json({ message: 'No autorizado' });

        const [items] = await db.query(
            `SELECT oi.*, v.nombre AS vino_nombre, v.imagen_url FROM order_items oi
             JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`, [id]
        );
        const [shipmentRows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [id]);

        res.json({ ...order, items, shipment: shipmentRows[0] || null });
    } catch (error) {
        console.error('Error al obtener detalle de orden:', error.message);
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
};

/**
 * 4. Seguimiento PÚBLICO de un pedido completo (todas las bodegas de un mismo carrito).
 * No requiere login: alcanza con el cart_group_id (que se le muestra/manda por email al
 * comprador) + su email, para que nadie más pueda espiar el pedido de otro.
 * Esta es la base de datos que después va a consumir el chat con IA (Fase 5).
 */
exports.getOrderGroupPublic = async (req, res) => {
    try {
        const { cartGroupId } = req.params;
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Falta el email del comprador' });

        const [orders] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre, b.email AS bodega_email
             FROM orders o JOIN bodegas b ON b.id = o.bodega_id
             WHERE o.cart_group_id = ? AND o.buyer_email = ?`,
            [cartGroupId, email]
        );
        if (orders.length === 0) return res.status(404).json({ message: 'Pedido no encontrado' });

        for (const order of orders) {
            const [items] = await db.query(
                `SELECT oi.cantidad, oi.precio_unitario, v.nombre AS vino_nombre, v.imagen_url
                 FROM order_items oi JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`,
                [order.id]
            );
            const [shipmentRows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [order.id]);
            order.items = items;
            order.shipment = shipmentRows[0] || null;
        }

        res.json({ cartGroupId, orders });
    } catch (error) {
        console.error('Error en getOrderGroupPublic:', error.message);
        res.status(500).json({ error: 'Error al buscar el pedido' });
    }
};

// 5. Vista PÚBLICA de la orden para la bodega (desde el link del email, sin login)
exports.getOrderByAcceptToken = async (req, res) => {
    try {
        const { token } = req.params;
        const [orderRows] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre FROM orders o
             JOIN bodegas b ON b.id = o.bodega_id WHERE o.accept_token = ?`, [token]
        );
        if (orderRows.length === 0) return res.status(404).json({ message: 'Enlace inválido o vencido' });

        const order = orderRows[0];
        const [items] = await db.query(
            `SELECT oi.cantidad, oi.precio_unitario, v.nombre AS vino_nombre, v.varietal, v.cosecha
             FROM order_items oi JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`,
            [order.id]
        );
        res.json({ ...order, items });
    } catch (error) {
        console.error('Error en getOrderByAcceptToken:', error.message);
        res.status(500).json({ error: 'Error al buscar el pedido' });
    }
};

// 6. La bodega confirma o rechaza el pedido (desde el link del email, sin login)
exports.respondToOrder = async (req, res) => {
    try {
        const { token } = req.params;
        const { action, notas_bodega } = req.body; // action: 'confirmar' | 'rechazar'

        if (!['confirmar', 'rechazar'].includes(action)) {
            return res.status(400).json({ error: "action debe ser 'confirmar' o 'rechazar'" });
        }

        const [orderRows] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre FROM orders o
             JOIN bodegas b ON b.id = o.bodega_id WHERE o.accept_token = ?`, [token]
        );
        if (orderRows.length === 0) return res.status(404).json({ message: 'Enlace inválido o vencido' });
        const order = orderRows[0];

        if (order.estado !== 'pendiente_bodega') {
            return res.status(409).json({ message: `Este pedido ya fue actualizado (estado actual: ${order.estado})` });
        }

        const nuevoEstado = action === 'confirmar' ? 'confirmada' : 'cancelada';
        await db.query(
            `UPDATE orders SET estado = ?, notas_bodega = ?, confirmed_at = NOW() WHERE id = ?`,
            [nuevoEstado, notas_bodega || null, order.id]
        );

        // Si la bodega rechaza el pedido, se le devuelve al comprador la parte de la
        // reserva que le correspondía a ESTA bodega (no toda la reserva del carrito,
        // si el comprador había pedido a más de una bodega en el mismo checkout).
        if (action === 'rechazar') {
            try {
                await reembolsarPorRechazo(order);
            } catch (refundError) {
                // Esto no debe bloquear la respuesta a la bodega, pero queda bien logueado
                // porque implica plata real que hay que revisar y devolver a mano si falló.
                console.error(`❌ No se pudo reembolsar automáticamente la reserva de la orden ${order.id}:`, refundError.message);
            }
        }

        try {
            await emailRespuestaBodega({
                buyerEmail: order.buyer_email, buyerName: order.buyer_name, bodegaNombre: order.bodega_nombre,
                accion: action, cartGroupId: order.cart_group_id
            });
        } catch (emailError) {
            console.error('Error enviando email de respuesta de bodega (no afecta la operación):', emailError.message);
        }

        const mensaje = action === 'confirmar' ? 'Pedido confirmado' : 'Pedido cancelado';
        res.json({ message: mensaje, estado: nuevoEstado });
    } catch (error) {
        console.error('Error en respondToOrder:', error.message);
        res.status(500).json({ error: 'Error al actualizar el pedido' });
    }
};

// Reembolsa, vía Revolut, la porción de la reserva que le correspondía a la bodega
// que acaba de rechazar un pedido. Se usa desde respondToOrder.
async function reembolsarPorRechazo(order) {
    const [reservaRows] = await db.query(
        `SELECT * FROM reservas WHERE cart_group_id = ? AND moneda = ? AND estado IN ('pagada', 'parcialmente_reembolsada')
         ORDER BY id DESC LIMIT 1`,
        [order.cart_group_id, order.moneda]
    );
    const reserva = reservaRows[0];
    if (!reserva) {
        console.warn(`⚠️ La orden ${order.id} se rechazó pero no se encontró una reserva pagada para reembolsar (cart_group_id ${order.cart_group_id}, moneda ${order.moneda})`);
        return;
    }

    const montoAReembolsar = redondear2(order.comision_monto);
    const refund = await reembolsarOrden({
        revolutOrderId: reserva.revolut_order_id,
        monto: montoAReembolsar,
        moneda: reserva.moneda,
        descripcion: `Reembolso — la bodega rechazó el pedido #${order.id}`
    });

    const nuevoReembolsado = redondear2(Number(reserva.reembolsado_monto) + montoAReembolsar);
    const nuevoEstadoReserva = nuevoReembolsado >= Number(reserva.monto) ? 'reembolsada' : 'parcialmente_reembolsada';
    await db.query(
        `UPDATE reservas SET reembolsado_monto = ?, estado = ? WHERE id = ?`,
        [nuevoReembolsado, nuevoEstadoReserva, reserva.id]
    );
    console.log(`↩️  Reembolsados ${reserva.moneda} ${montoAReembolsar} al comprador por el rechazo de la orden ${order.id} (reembolso Revolut: ${refund.id})`);
}

// Cuando Revolut confirma que la reserva se pagó, recién ahí se le manda el pedido
// a la/las bodega/s correspondientes (las de esa misma moneda, por si el carrito
// tenía más de una y cada una paga su reserva por separado).
async function marcarReservaPagada(revolutOrderId) {
    const [reservaRows] = await db.query(`SELECT * FROM reservas WHERE revolut_order_id = ?`, [revolutOrderId]);
    if (reservaRows.length === 0) {
        console.warn(`⚠️ Webhook ORDER_COMPLETED de una orden de Revolut que no tenemos registrada: ${revolutOrderId}`);
        return;
    }
    const reserva = reservaRows[0];
    if (reserva.estado === 'pagada') return; // idempotencia: Revolut puede reenviar el mismo evento

    await db.query(`UPDATE reservas SET estado = 'pagada', paid_at = NOW() WHERE id = ?`, [reserva.id]);

    const [ordenes] = await db.query(
        `SELECT o.*, b.nombre AS bodega_nombre, b.email AS bodega_email
         FROM orders o JOIN bodegas b ON b.id = o.bodega_id
         WHERE o.cart_group_id = ? AND o.moneda = ?`,
        [reserva.cart_group_id, reserva.moneda]
    );

    for (const orden of ordenes) {
        const [items] = await db.query(
            `SELECT oi.cantidad, oi.precio_unitario, v.nombre AS vino_nombre FROM order_items oi
             JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`,
            [orden.id]
        );
        try {
            await emailNuevaOrdenBodega({ bodegaEmail: orden.bodega_email, bodegaNombre: orden.bodega_nombre, order: orden, items });
        } catch (e) {
            console.error(`Error enviando email a la bodega ${orden.bodega_id} tras pago de reserva (orden ${orden.id}):`, e.message);
        }
    }

    if (ordenes.length > 0) {
        try {
            await emailConfirmacionComprador({
                buyerEmail: ordenes[0].buyer_email,
                buyerName: ordenes[0].buyer_name,
                cartGroupId: reserva.cart_group_id,
                ordenesCreadas: ordenes.map((o) => ({ bodegaNombre: o.bodega_nombre, subtotal: o.subtotal }))
            });
        } catch (e) {
            console.error('Error enviando confirmación al comprador tras pago de reserva:', e.message);
        }
    }
}

/**
 * Webhook público de Revolut — Mendoza Reserve se entera acá de que el comprador
 * efectivamente pagó (o falló al pagar) la reserva.
 *
 * OJO: esta ruta se registra en index.js con express.raw() en vez del
 * express.json() global, porque la verificación de firma necesita el body
 * CRUDO tal cual llegó, no ya parseado — por eso acá `req.body` es un Buffer.
 */
exports.webhookRevolut = async (req, res) => {
    try {
        const { valido, motivo } = verificarFirmaWebhook({
            rawBody: req.body,
            signatureHeader: req.headers['revolut-signature'],
            timestampHeader: req.headers['revolut-request-timestamp'],
            signingSecret: process.env.REVOLUT_WEBHOOK_SECRET
        });

        if (!valido) {
            console.warn('⚠️ Webhook de Revolut rechazado:', motivo);
            return res.status(401).json({ error: 'Firma inválida' });
        }

        const evento = JSON.parse(req.body.toString('utf8'));

        if (evento.event === 'ORDER_COMPLETED') {
            await marcarReservaPagada(evento.order_id);
        } else if (evento.event === 'ORDER_PAYMENT_DECLINED' || evento.event === 'ORDER_CANCELLED') {
            await db.query(`UPDATE reservas SET estado = 'fallida' WHERE revolut_order_id = ? AND estado = 'pendiente'`, [evento.order_id]);
        }
        // Cualquier otro evento (ej. de reembolsos que iniciamos nosotros mismos) se ignora
        // silenciosamente — no necesitamos reaccionar a esos acá.

        res.json({ received: true });
    } catch (error) {
        console.error('Error procesando webhook de Revolut:', error.message);
        res.status(500).json({ error: 'Error procesando el webhook' });
    }
};

// 6.b Descargar la invoice (PDF) de la reserva pagada — dueño de la orden o admin.
// OJO: es el comprobante de la RESERVA (comisión del 12%), no la factura del vino en
// sí, que la bodega emite y cobra aparte, directamente al comprador.
exports.downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const lang = req.query.lang === 'en' ? 'en' : 'es';
        const [orderRows] = await db.query(
            `SELECT o.*, b.nombre AS bodega_nombre FROM orders o
             JOIN bodegas b ON b.id = o.bodega_id WHERE o.id = ?`, [id]
        );
        if (orderRows.length === 0) return res.status(404).json({ message: 'Orden no encontrada' });

        const order = orderRows[0];
        const esDueno = req.user && order.user_id === req.user.id;
        const esAdmin = req.user && req.user.rol === 'admin';
        if (!esDueno && !esAdmin) return res.status(403).json({ message: 'No autorizado' });

        const [items] = await db.query(
            `SELECT oi.*, v.nombre AS vino_nombre, v.varietal, v.cosecha FROM order_items oi
             JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`, [id]
        );

        const pdfBuffer = await generarInvoicePDF({ order, items, lang });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="mendoza-reserve-invoice-${order.id}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error en downloadInvoice:', error.message);
        res.status(500).json({ error: 'Error al generar la invoice' });
    }
};

// 7. ADMIN: listado de todas las órdenes (para el panel — comisiones, estado, etc.)
exports.getAllOrdersAdmin = async (req, res) => {
    try {
        const { estado, comision_estado } = req.query;
        let sql = `SELECT o.*, b.nombre AS bodega_nombre FROM orders o JOIN bodegas b ON b.id = o.bodega_id`;
        const conditions = [];
        const params = [];
        if (estado) { conditions.push('o.estado = ?'); params.push(estado); }
        if (comision_estado) { conditions.push('o.comision_estado = ?'); params.push(comision_estado); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY o.created_at DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error en getAllOrdersAdmin:', error.message);
        res.status(500).json({ error: 'Error al obtener las órdenes' });
    }
};

// 8. ADMIN: actualizar estado logístico / comisión de una orden puntual
exports.updateOrderAdmin = async (req, res) => {
    const camposPermitidos = ['estado', 'comision_estado', 'notas_bodega'];
    const sets = [];
    const params = [];
    for (const campo of camposPermitidos) {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
            sets.push(`${campo} = ?`);
            params.push(req.body[campo]);
        }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    params.push(req.params.id);
    try {
        await db.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Orden actualizada' });
    } catch (error) {
        console.error('Error en updateOrderAdmin:', error.message);
        res.status(500).json({ error: 'Error al actualizar la orden' });
    }
};
