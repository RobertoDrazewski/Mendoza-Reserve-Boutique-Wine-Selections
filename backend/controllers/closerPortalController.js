const db = require('../config/db');

// Portal del closer (vendedor UK): carga sus propios leads (restaurantes/compradores) y
// consulta la red de bodegas activas para saber qué ofrecer. Todo acá se filtra por
// req.user.id como closer_id — nunca por un closer_id que mande el body, así un closer
// jamás puede ver ni tocar los leads de otro closer.

// ---------------------------------------------------------------------
// Leads propios (restaurantes / compradores que este closer va sumando)
// ---------------------------------------------------------------------

exports.getMisLeads = async (req, res) => {
    try {
        const { estado, tipo } = req.query;
        let sql = 'SELECT * FROM leads_uk WHERE closer_id = ?';
        const params = [req.user.id];
        if (estado) { sql += ' AND estado = ?'; params.push(estado); }
        if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
        sql += ' ORDER BY fecha_creacion DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error en getMisLeads:', error.message);
        res.status(500).json({ error: 'Error al obtener tus leads' });
    }
};

exports.crearMiLead = async (req, res) => {
    const { nombre_contacto, negocio, tipo, email, telefono, ciudad, sitio_web, notas } = req.body;
    if (!negocio) return res.status(400).json({ error: 'El nombre del negocio/restaurante es obligatorio' });
    try {
        // closer_id SIEMPRE sale del token — un closer no puede cargar un lead "a nombre
        // de" otro closer, ni dejarlo sin dueño.
        const [result] = await db.query(
            `INSERT INTO leads_uk (nombre_contacto, negocio, tipo, email, telefono, ciudad, sitio_web, estado, notas, closer_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'no_contactado', ?, ?)`,
            [nombre_contacto || null, negocio, tipo || 'restaurante', email || null, telefono || null,
             ciudad || null, sitio_web || null, notas || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Lead agregado con éxito' });
    } catch (error) {
        console.error('Error en crearMiLead:', error.message);
        res.status(500).json({ error: 'Error al crear el lead' });
    }
};

async function esLeadPropio(leadId, closerId) {
    const [rows] = await db.query('SELECT id FROM leads_uk WHERE id = ? AND closer_id = ?', [leadId, closerId]);
    return rows.length > 0;
}

exports.actualizarMiLead = async (req, res) => {
    const { id } = req.params;
    if (!(await esLeadPropio(id, req.user.id))) {
        return res.status(404).json({ error: 'Lead no encontrado entre los tuyos' });
    }
    const camposPermitidos = ['nombre_contacto', 'negocio', 'tipo', 'email', 'telefono', 'ciudad', 'sitio_web', 'estado', 'notas'];
    const sets = [];
    const params = [];
    for (const campo of camposPermitidos) {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
            sets.push(`${campo} = ?`);
            params.push(req.body[campo]);
        }
    }
    if (req.body.estado && req.body.estado !== 'no_contactado') {
        sets.push('fecha_ultimo_contacto = NOW()');
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    params.push(id);
    try {
        await db.query(`UPDATE leads_uk SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Lead actualizado' });
    } catch (error) {
        console.error('Error en actualizarMiLead:', error.message);
        res.status(500).json({ error: 'Error al actualizar el lead' });
    }
};

// ---------------------------------------------------------------------
// Bodegas de la red (sólo lectura — para que el closer sepa qué ofrecer)
// ---------------------------------------------------------------------

exports.getBodegasParaCloser = async (req, res) => {
    try {
        // Sólo las activas (ya negociadas y confirmadas) — un closer no debería ofrecer
        // todavía una bodega que sigue en 'pendiente_contacto'/'contactada'.
        const [rows] = await db.query(
            `SELECT id, nombre, slug, zona, subzona, descripcion, descripcion_en, imagen, sitio_web
             FROM bodegas WHERE estado = 'activa' ORDER BY nombre ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en getBodegasParaCloser:', error.message);
        res.status(500).json({ error: 'Error al obtener las bodegas' });
    }
};
