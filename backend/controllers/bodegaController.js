const db = require('../config/db');

// Genera un slug simple a partir del nombre (usado al crear una bodega sin slug explícito)
function slugify(nombre) {
    const sinAcentos = String(nombre)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, ''); // saca tildes/diacríticos
    return sinAcentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const CAMPOS_PUBLICOS = `
    id, nombre, slug, zona, subzona, direccion, telefono, whatsapp, email,
    sitio_web, descripcion, logo_url, imagen, estado, fecha_alta
`;

// 1. Listado PÚBLICO: sólo bodegas activas (lo que ve el comprador en UK)
exports.getAllBodegas = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ${CAMPOS_PUBLICOS} FROM bodegas WHERE estado = 'activa' ORDER BY nombre ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en getAllBodegas:', error.message);
        res.status(500).json({ error: 'Error al obtener bodegas' });
    }
};

// 2. Listado ADMIN: todas las bodegas, con filtro opcional ?estado=
exports.getAllBodegasAdmin = async (req, res) => {
    try {
        const { estado } = req.query;
        let sql = 'SELECT * FROM bodegas';
        const params = [];
        if (estado) {
            sql += ' WHERE estado = ?';
            params.push(estado);
        }
        sql += ' ORDER BY fecha_alta DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error en getAllBodegasAdmin:', error.message);
        res.status(500).json({ error: 'Error al obtener bodegas (admin)' });
    }
};

// 3. Obtener por ID o slug (pública; si está inactiva sólo la ve un admin autenticado)
exports.getBodegaById = async (req, res) => {
    try {
        const { id } = req.params;
        const byId = /^\d+$/.test(id);
        const [rows] = await db.query(
            `SELECT * FROM bodegas WHERE ${byId ? 'id' : 'slug'} = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'No encontrada' });

        const bodega = rows[0];
        const esAdminAutenticado = req.user && req.user.rol === 'admin';
        if (bodega.estado !== 'activa' && !esAdminAutenticado) {
            return res.status(404).json({ message: 'No encontrada' });
        }
        res.json(bodega);
    } catch (error) {
        console.error('Error en getBodegaById:', error.message);
        res.status(500).json({ error: 'Error al obtener la bodega' });
    }
};

// 4. Crear bodega (admin) — arranca en 'pendiente_contacto' salvo que se indique otro estado
exports.createBodega = async (req, res) => {
    const {
        nombre, zona, subzona, direccion, telefono, whatsapp, email, sitio_web,
        descripcion, logo_url, imagen, comision_pct, estado, contacto_nombre, notas
    } = req.body;

    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    try {
        let slug = slugify(nombre);
        const [existing] = await db.query('SELECT id FROM bodegas WHERE slug = ?', [slug]);
        if (existing.length > 0) slug = `${slug}-${Date.now().toString().slice(-5)}`;

        const [result] = await db.query(
            `INSERT INTO bodegas
                (nombre, slug, zona, subzona, direccion, telefono, whatsapp, email, sitio_web,
                 descripcion, logo_url, imagen, comision_pct, estado, contacto_nombre, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, slug, zona || null, subzona || null, direccion || null,
                telefono || null, whatsapp || null, email || null, sitio_web || null,
                descripcion || null, logo_url || null, imagen || null,
                comision_pct != null ? comision_pct : 12.0,
                estado || 'pendiente_contacto',
                contacto_nombre || null, notas || null
            ]
        );
        res.status(201).json({ id: result.insertId, slug, message: 'Bodega creada con éxito' });
    } catch (error) {
        console.error('Error al crear bodega:', error.message);
        res.status(500).json({ error: 'Error al crear la bodega' });
    }
};

// 5. Actualizar bodega (admin) — actualización parcial (sólo pisa los campos enviados)
exports.updateBodega = async (req, res) => {
    const camposPermitidos = [
        'nombre', 'zona', 'subzona', 'direccion', 'telefono', 'whatsapp', 'email',
        'sitio_web', 'descripcion', 'logo_url', 'imagen', 'comision_pct', 'estado',
        'contacto_nombre', 'notas'
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

    // Si la bodega pasa a 'activa' por primera vez, registramos fecha_activacion
    if (req.body.estado === 'activa') {
        sets.push('fecha_activacion = COALESCE(fecha_activacion, NOW())');
    }

    params.push(req.params.id);

    try {
        await db.query(`UPDATE bodegas SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Bodega actualizada con éxito' });
    } catch (error) {
        console.error('Error al actualizar bodega:', error.message);
        res.status(500).json({ error: 'Error al actualizar la bodega' });
    }
};

// 6. Atajo: cambiar sólo el estado (activar / desactivar / marcar contactada, etc.)
exports.cambiarEstadoBodega = async (req, res) => {
    const { estado } = req.body;
    const estadosValidos = ['pendiente_contacto', 'contactada', 'activa', 'inactiva', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
    }
    try {
        const extra = estado === 'activa' ? ", fecha_activacion = COALESCE(fecha_activacion, NOW())" : '';
        await db.query(`UPDATE bodegas SET estado = ?${extra} WHERE id = ?`, [estado, req.params.id]);
        res.json({ message: `Bodega actualizada a estado '${estado}'` });
    } catch (error) {
        console.error('Error al cambiar estado de bodega:', error.message);
        res.status(500).json({ error: 'Error al cambiar el estado de la bodega' });
    }
};

// 7. Eliminar bodega (admin) — uso poco frecuente, mejor usar estado 'rechazada'/'inactiva'
exports.deleteBodega = async (req, res) => {
    try {
        await db.query('DELETE FROM bodegas WHERE id = ?', [req.params.id]);
        res.json({ message: 'Bodega eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar bodega:', error.message);
        res.status(500).json({ error: 'Error al eliminar la bodega' });
    }
};
