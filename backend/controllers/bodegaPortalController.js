const db = require('../config/db');
const { emailActualizacionEnvio } = require('../services/emailService');

// Portal de autogestión de la bodega: TODO acá se filtra siempre por req.user.bodega_id
// (viene del JWT, ver authController.js) — nunca por un bodega_id que mande el cliente
// en el body/params, así una bodega jamás puede ver ni tocar pedidos/catálogo de otra.

function normalizarVino(v) {
    return { ...v, imagen_url: v.imagen_url || v.imagen || v.foto || null };
}

// ---------------------------------------------------------------------
// Perfil de la bodega
// ---------------------------------------------------------------------

exports.getMiPerfil = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM bodegas WHERE id = ?', [req.user.bodega_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Bodega no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en getMiPerfil (bodega):', error.message);
        res.status(500).json({ error: 'Error al obtener el perfil de la bodega' });
    }
};

// Actualización parcial del propio perfil — a propósito NO incluye 'estado' ni
// 'comision_pct': la activación y la comisión las define Roberto desde el panel admin,
// no la bodega misma.
exports.updateMiPerfil = async (req, res) => {
    const camposPermitidos = [
        'zona', 'subzona', 'direccion', 'telefono', 'whatsapp', 'sitio_web',
        'descripcion', 'descripcion_en', 'contacto_nombre'
    ];
    const sets = [];
    const params = [];
    for (const campo of camposPermitidos) {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
            sets.push(`${campo} = ?`);
            params.push(req.body[campo]);
        }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    params.push(req.user.bodega_id);
    try {
        await db.query(`UPDATE bodegas SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Perfil actualizado con éxito' });
    } catch (error) {
        console.error('Error en updateMiPerfil (bodega):', error.message);
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
};

// ---------------------------------------------------------------------
// Catálogo propio (vinos)
// ---------------------------------------------------------------------

exports.getMiCatalogo = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM vinos WHERE bodega_id = ? ORDER BY nombre ASC',
            [req.user.bodega_id]
        );
        res.json(rows.map(normalizarVino));
    } catch (error) {
        console.error('Error en getMiCatalogo:', error.message);
        res.status(500).json({ error: 'Error al obtener el catálogo' });
    }
};

exports.crearMiVino = async (req, res) => {
    const { nombre, varietal, cosecha, descripcion, formato, moneda, precio_unitario, stock, imagen_url, activo } = req.body;
    if (!nombre || precio_unitario == null) {
        return res.status(400).json({ error: 'nombre y precio_unitario son obligatorios' });
    }
    try {
        // bodega_id SIEMPRE sale del token, nunca del body — una bodega no puede cargar
        // vinos "a nombre de" otra.
        const [result] = await db.query(
            `INSERT INTO vinos (nombre, varietal, cosecha, descripcion, formato, moneda, precio_unitario, stock, imagen_url, bodega_id, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, varietal || null, cosecha || null, descripcion || null,
                formato || 'botella', moneda || 'USD', precio_unitario,
                stock || 0, imagen_url || null, req.user.bodega_id,
                activo != null ? activo : 1
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Vino creado con éxito' });
    } catch (error) {
        console.error('Error en crearMiVino:', error.message);
        res.status(500).json({ error: 'Error al crear el vino' });
    }
};

async function esVinoPropio(vinoId, bodegaId) {
    const [rows] = await db.query('SELECT id FROM vinos WHERE id = ? AND bodega_id = ?', [vinoId, bodegaId]);
    return rows.length > 0;
}

exports.actualizarMiVino = async (req, res) => {
    const { id } = req.params;
    if (!(await esVinoPropio(id, req.user.bodega_id))) {
        return res.status(404).json({ error: 'Vino no encontrado en tu catálogo' });
    }
    // Igual que arriba: 'bodega_id' queda afuera de los campos editables (no se puede
    // "mover" un vino a otra bodega desde este portal).
    const camposPermitidos = ['nombre', 'varietal', 'cosecha', 'descripcion', 'formato', 'moneda', 'precio_unitario', 'stock', 'imagen_url', 'activo'];
    const sets = [];
    const params = [];
    for (const campo of camposPermitidos) {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
            sets.push(`${campo} = ?`);
            params.push(req.body[campo]);
        }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    params.push(id);
    try {
        await db.query(`UPDATE vinos SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Vino actualizado con éxito' });
    } catch (error) {
        console.error('Error en actualizarMiVino:', error.message);
        res.status(500).json({ error: 'Error al actualizar el vino' });
    }
};

exports.eliminarMiVino = async (req, res) => {
    const { id } = req.params;
    if (!(await esVinoPropio(id, req.user.bodega_id))) {
        return res.status(404).json({ error: 'Vino no encontrado en tu catálogo' });
    }
    try {
        await db.query('DELETE FROM vinos WHERE id = ?', [id]);
        res.json({ message: 'Vino eliminado correctamente' });
    } catch (error) {
        console.error('Error en eliminarMiVino:', error.message);
        res.status(500).json({ error: 'Error al eliminar el vino' });
    }
};

// ---------------------------------------------------------------------
// Pedidos propios
// ---------------------------------------------------------------------

exports.getMisPedidos = async (req, res) => {
    try {
        const { estado } = req.query;
        let sql = `SELECT o.* FROM orders o WHERE o.bodega_id = ?`;
        const params = [req.user.bodega_id];
        if (estado) { sql += ' AND o.estado = ?'; params.push(estado); }
        sql += ' ORDER BY o.created_at DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error en getMisPedidos:', error.message);
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
};

exports.getMiPedidoById = async (req, res) => {
    try {
        const { id } = req.params;
        const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ? AND bodega_id = ?', [id, req.user.bodega_id]);
        if (orderRows.length === 0) return res.status(404).json({ message: 'Pedido no encontrado' });
        const order = orderRows[0];
        const [items] = await db.query(
            `SELECT oi.*, v.nombre AS vino_nombre, v.imagen_url FROM order_items oi
             JOIN vinos v ON v.id = oi.vino_id WHERE oi.order_id = ?`, [id]
        );
        const [shipmentRows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [id]);
        res.json({ ...order, items, shipment: shipmentRows[0] || null });
    } catch (error) {
        console.error('Error en getMiPedidoById:', error.message);
        res.status(500).json({ error: 'Error al obtener el pedido' });
    }
};

// Marca un pedido propio como despachado: pasa orders.estado a 'enviada' y el shipment
// a status='enviado' (con shipped_at). Body opcional: carrier, tracking_number, tracking_url.
exports.despacharMiPedido = async (req, res) => {
    const { id } = req.params;
    const { carrier, tracking_number, tracking_url } = req.body;
    try {
        const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ? AND bodega_id = ?', [id, req.user.bodega_id]);
        if (orderRows.length === 0) return res.status(404).json({ message: 'Pedido no encontrado' });
        const order = orderRows[0];

        if (!['confirmada', 'en_preparacion'].includes(order.estado)) {
            return res.status(409).json({
                error: `No se puede despachar un pedido en estado '${order.estado}'. Tiene que estar confirmado antes de despacharlo.`
            });
        }

        await db.query(`UPDATE orders SET estado = 'enviada' WHERE id = ?`, [id]);

        const [existingShipment] = await db.query('SELECT id FROM shipments WHERE order_id = ?', [id]);
        if (existingShipment.length === 0) {
            await db.query(
                `INSERT INTO shipments (order_id, carrier, tracking_number, tracking_url, status, shipped_at)
                 VALUES (?, ?, ?, ?, 'enviado', NOW())`,
                [id, carrier || null, tracking_number || null, tracking_url || null]
            );
        } else {
            await db.query(
                `UPDATE shipments SET
                    carrier = COALESCE(?, carrier),
                    tracking_number = COALESCE(?, tracking_number),
                    tracking_url = COALESCE(?, tracking_url),
                    status = 'enviado',
                    shipped_at = COALESCE(shipped_at, NOW())
                 WHERE order_id = ?`,
                [carrier || null, tracking_number || null, tracking_url || null, id]
            );
        }

        try {
            const [bodegaRows] = await db.query('SELECT nombre FROM bodegas WHERE id = ?', [req.user.bodega_id]);
            const [shipmentRows] = await db.query('SELECT * FROM shipments WHERE order_id = ?', [id]);
            await emailActualizacionEnvio({
                buyerEmail: order.buyer_email,
                buyerName: order.buyer_name,
                bodegaNombre: bodegaRows[0] ? bodegaRows[0].nombre : '',
                shipment: shipmentRows[0],
                cartGroupId: order.cart_group_id
            });
        } catch (emailError) {
            console.error('Error enviando email de despacho (no afecta la operación):', emailError.message);
        }

        res.json({ message: 'Pedido marcado como despachado' });
    } catch (error) {
        console.error('Error en despacharMiPedido:', error.message);
        res.status(500).json({ error: 'Error al marcar el pedido como despachado' });
    }
};
