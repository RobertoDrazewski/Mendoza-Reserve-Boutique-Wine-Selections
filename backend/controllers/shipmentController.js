const db = require('../config/db');
const { emailActualizacionEnvio } = require('../services/emailService');

// Obtener el envío de una orden (dueño de la orden o admin) — reutilizado también por
// getOrderById/getOrderGroupPublic, pero se deja como endpoint propio por si hace falta.
exports.getShipmentByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const [rows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [orderId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Sin datos de envío todavía' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en getShipmentByOrder:', error.message);
        res.status(500).json({ error: 'Error al obtener el envío' });
    }
};

// ADMIN: cargar/actualizar tracking de un envío (carrier, nº de seguimiento, estado)
exports.updateShipment = async (req, res) => {
    const { orderId } = req.params;
    const { carrier, tracking_number, tracking_url, status, estimated_delivery } = req.body;

    const sets = [];
    const params = [];
    if (carrier !== undefined) { sets.push('carrier = ?'); params.push(carrier); }
    if (tracking_number !== undefined) { sets.push('tracking_number = ?'); params.push(tracking_number); }
    if (tracking_url !== undefined) { sets.push('tracking_url = ?'); params.push(tracking_url); }
    if (estimated_delivery !== undefined) { sets.push('estimated_delivery = ?'); params.push(estimated_delivery); }
    if (status !== undefined) {
        sets.push('status = ?');
        params.push(status);
        if (status === 'enviado') sets.push('shipped_at = COALESCE(shipped_at, NOW())');
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

    try {
        const [existing] = await db.query('SELECT id FROM shipments WHERE order_id = ?', [orderId]);
        if (existing.length === 0) {
            await db.query(
                `INSERT INTO shipments (order_id, carrier, tracking_number, tracking_url, status, estimated_delivery)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, carrier || null, tracking_number || null, tracking_url || null, status || 'preparando', estimated_delivery || null]
            );
        } else {
            params.push(orderId);
            await db.query(`UPDATE shipments SET ${sets.join(', ')} WHERE order_id = ?`, params);
        }

        // Si el envío pasa a 'enviado' o más, reflejarlo también en el estado general de la orden
        if (status && ['enviado', 'en_transito', 'entregado'].includes(status)) {
            const estadoOrder = status === 'entregado' ? 'entregada' : (status === 'en_transito' ? 'en_transito' : 'enviada');
            await db.query('UPDATE orders SET estado = ? WHERE id = ?', [estadoOrder, orderId]);
        }

        if (status) {
            try {
                const [orderRows] = await db.query(
                    `SELECT o.buyer_email, o.buyer_name, o.cart_group_id, b.nombre AS bodega_nombre
                     FROM orders o JOIN bodegas b ON b.id = o.bodega_id WHERE o.id = ?`,
                    [orderId]
                );
                const [shipmentRows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [orderId]);
                if (orderRows.length > 0 && shipmentRows.length > 0) {
                    await emailActualizacionEnvio({
                        buyerEmail: orderRows[0].buyer_email,
                        buyerName: orderRows[0].buyer_name,
                        bodegaNombre: orderRows[0].bodega_nombre,
                        shipment: shipmentRows[0],
                        cartGroupId: orderRows[0].cart_group_id
                    });
                }
            } catch (emailError) {
                console.error('Error enviando email de actualización de envío (no afecta la operación):', emailError.message);
            }
        }

        res.json({ message: 'Envío actualizado' });
    } catch (error) {
        console.error('Error en updateShipment:', error.message);
        res.status(500).json({ error: 'Error al actualizar el envío' });
    }
};
