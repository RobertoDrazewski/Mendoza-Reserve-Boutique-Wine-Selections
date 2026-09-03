const db = require('../config/db');

// Todo este controller es de uso interno de Roberto (panel admin) — nunca público.

exports.getAllLeads = async (req, res) => {
    try {
        const { estado, tipo } = req.query;
        let sql = 'SELECT * FROM leads_uk';
        const conditions = [];
        const params = [];
        if (estado) { conditions.push('estado = ?'); params.push(estado); }
        if (tipo) { conditions.push('tipo = ?'); params.push(tipo); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY fecha_creacion DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error en getAllLeads:', error.message);
        res.status(500).json({ error: 'Error al obtener los leads' });
    }
};

exports.getLeadById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM leads_uk WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el lead' });
    }
};

exports.createLead = async (req, res) => {
    const { nombre_contacto, negocio, tipo, email, telefono, ciudad, sitio_web, estado, notas } = req.body;
    if (!negocio) return res.status(400).json({ error: 'El nombre del negocio es obligatorio' });
    try {
        const [result] = await db.query(
            `INSERT INTO leads_uk (nombre_contacto, negocio, tipo, email, telefono, ciudad, sitio_web, estado, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre_contacto || null, negocio, tipo || 'restaurante', email || null, telefono || null,
             ciudad || null, sitio_web || null, estado || 'no_contactado', notas || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Lead creado con éxito' });
    } catch (error) {
        console.error('Error al crear lead:', error.message);
        res.status(500).json({ error: 'Error al crear el lead' });
    }
};

// Alta masiva (para importar el CSV de la campaña de mails en frío)
exports.createLeadsBulk = async (req, res) => {
    const { leads } = req.body; // array de objetos igual que createLead
    if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ error: 'Se espera un array "leads" con al menos un elemento' });
    }
    try {
        const values = leads
            .filter((l) => l.negocio)
            .map((l) => [
                l.nombre_contacto || null, l.negocio, l.tipo || 'restaurante', l.email || null,
                l.telefono || null, l.ciudad || null, l.sitio_web || null,
                l.estado || 'no_contactado', l.notas || null
            ]);
        if (values.length === 0) return res.status(400).json({ error: 'Ningún lead tenía "negocio" cargado' });

        await db.query(
            `INSERT INTO leads_uk (nombre_contacto, negocio, tipo, email, telefono, ciudad, sitio_web, estado, notas) VALUES ?`,
            [values]
        );
        res.status(201).json({ message: `${values.length} leads importados`, importados: values.length });
    } catch (error) {
        console.error('Error en createLeadsBulk:', error.message);
        res.status(500).json({ error: 'Error al importar los leads' });
    }
};

exports.updateLead = async (req, res) => {
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
    params.push(req.params.id);
    try {
        await db.query(`UPDATE leads_uk SET ${sets.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Lead actualizado' });
    } catch (error) {
        console.error('Error al actualizar lead:', error.message);
        res.status(500).json({ error: 'Error al actualizar el lead' });
    }
};

exports.deleteLead = async (req, res) => {
    try {
        await db.query('DELETE FROM leads_uk WHERE id = ?', [req.params.id]);
        res.json({ message: 'Lead eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el lead' });
    }
};
