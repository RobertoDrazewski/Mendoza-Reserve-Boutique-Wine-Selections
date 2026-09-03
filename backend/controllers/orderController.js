const crypto = require('crypto');
const db = require('../config/db');
const {
    emailNuevaOrdenBodega,
    emailConfirmacionComprador,
    emailRespuestaBodega
} = require('../services/emailService');

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

        // Emails salen DESPUÉS del commit y nunca deben tumbar la respuesta al comprador
        // si Resend falla — por eso van en su propio try/catch, no dentro de la transacción.
        try {
            for (const o of ordenesCreadas) {
                await emailNuevaOrdenBodega({
                    bodegaEmail: o.bodegaEmail,
                    bodegaNombre: o.bodegaNombre,
                    order: {
                        moneda: o.moneda, subtotal: o.subtotal, accept_token: o.acceptToken,
                        comision_pct_aplicada: o.comisionPct, comision_monto: o.comisionMonto,
                        shipping_address: shipping.address, shipping_country: shipping.country || 'United Kingdom'
                    },
                    items: o.items
                });
            }
            await emailConfirmacionComprador({
                buyerEmail: buyer.email, buyerName: buyer.name, cartGroupId, ordenesCreadas
            });
        } catch (emailError) {
            console.error('Error enviando emails de la orden (no afecta la compra):', emailError.message);
        }

        res.status(201).json({
            success: true,
            cartGroupId,
            orders: ordenesCreadas.map((o) => ({ orderId: o.orderId, bodegaId: o.bodegaId, bodegaNombre: o.bodegaNombre, subtotal: o.subtotal })),
            msg: 'Pedido generado con éxito'
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
