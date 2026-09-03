const db = require('../config/db');

// Normaliza la fila del vino antes de mandarla al frontend (compat con nombres de columna viejos)
function normalizar(v) {
    return {
        ...v,
        imagen_url: v.imagen_url || v.imagen || v.foto || null,
    };
}

// 1. Catálogo PÚBLICO completo: sólo vinos activos de bodegas activas
exports.getAllVinos = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT v.*, b.nombre AS bodega_nombre, b.slug AS bodega_slug
             FROM vinos v
             JOIN bodegas b ON b.id = v.bodega_id
             WHERE v.activo = 1 AND b.estado = 'activa'
             ORDER BY b.nombre ASC, v.nombre ASC`
        );
        res.json(rows.map(normalizar));
    } catch (error) {
        console.error('Error en getAllVinos:', error.message);
        res.status(500).json({ error: 'Error al obtener los vinos' });
    }
};

// 2. Catálogo de UNA bodega (para la ficha de bodega + agregar al carrito)
exports.getVinosByBodega = async (req, res) => {
    try {
        const { bodegaId } = req.params;
        const [rows] = await db.query(
            `SELECT v.* FROM vinos v
             JOIN bodegas b ON b.id = v.bodega_id
             WHERE v.bodega_id = ? AND v.activo = 1 AND b.estado = 'activa'
             ORDER BY v.nombre ASC`,
            [bodegaId]
        );
        res.json(rows.map(normalizar));
    } catch (error) {
        console.error('Error en getVinosByBodega:', error.message);
        res.status(500).json({ error: 'Error al obtener el catálogo de la bodega' });
    }
};

// 2.b Catálogo de UNA bodega para el panel de ADMIN — sin filtrar por activo/estado,
// así Roberto puede ver y editar el catálogo completo (incluidos vinos pausados) aunque
// la bodega todavía no esté activa.
exports.getVinosByBodegaAdmin = async (req, res) => {
    try {
        const { bodegaId } = req.params;
        const [rows] = await db.query('SELECT * FROM vinos WHERE bodega_id = ? ORDER BY nombre ASC', [bodegaId]);
        res.json(rows.map(normalizar));
    } catch (error) {
        console.error('Error en getVinosByBodegaAdmin:', error.message);
        res.status(500).json({ error: 'Error al obtener el catálogo (admin)' });
    }
};

// 3. Obtener vino por ID (público)
exports.getVinoById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM vinos WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vino no encontrado' });
        }
        res.json(normalizar(rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el vino' });
    }
};

// 4. Crear vino (admin) — carga de catálogo por bodega
exports.createVino = async (req, res) => {
    const {
        nombre, varietal, cosecha, descripcion, formato, moneda,
        precio_unitario, stock, imagen_url, bodega_id, activo
    } = req.body;

    if (!nombre || !bodega_id || precio_unitario == null) {
        return res.status(400).json({ error: 'nombre, bodega_id y precio_unitario son obligatorios' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO vinos
                (nombre, varietal, cosecha, descripcion, formato, moneda, precio_unitario,
                 stock, imagen_url, bodega_id, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, varietal || null, cosecha || null, descripcion || null,
                formato || 'botella', moneda || 'USD', precio_unitario,
                stock || 0, imagen_url || null, bodega_id,
                activo != null ? activo : 1
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Vino creado con éxito' });
    } catch (error) {
        console.error('Error al crear vino:', error.message);
        res.status(500).json({ error: 'Error al crear el vino' });
    }
};

// 5. Actualizar vino (admin) — parcial
exports.updateVino = async (req, res) => {
    const camposPermitidos = [
        'nombre', 'varietal', 'cosecha', 'descripcion', 'formato', 'moneda',
        'precio_unitario', 'stock', 'imagen_url', 'bodega_id', 'activo'
    ];
    const sets = [];
    const params = [];
    for (const campo of camposPermitidos) {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
            sets.push(`${campo} = ?`);
            params.push(req.body[campo]);
        }
    }
    if (sets.length === 0) {
        return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }
    params.push(req.params.id);
    try {
        await db.query(`UPDATE vinos SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Vino actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar vino:', error.message);
        res.status(500).json({ error: 'Error al actualizar el vino' });
    }
};

// 6. Eliminar vino (admin)
exports.deleteVino = async (req, res) => {
    try {
        await db.query('DELETE FROM vinos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Vino eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el vino' });
    }
};
