const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../config/db');
const { openai, MODEL } = require('../services/openaiClient');

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

// 1b. Listado PÚBLICO para el mapa por zona: TODAS las bodegas de la base
// (no sólo las activas), pero con datos mínimos y sin contacto interno
// (email/teléfono/whatsapp/notas quedan afuera) — así se puede mostrar la
// red completa de bodegas de Mendoza sin exponer datos de negociación de
// las que todavía están en 'pendiente_contacto'/'contactada'.
exports.getBodegasParaMapa = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, nombre, slug, zona, subzona, imagen, estado
             FROM bodegas
             ORDER BY zona ASC, subzona ASC, nombre ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en getBodegasParaMapa:', error.message);
        res.status(500).json({ error: 'Error al obtener bodegas para el mapa' });
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

// 8. Subir una foto a mano para la bodega (admin) — se guarda en backend/images/bodegas
// y queda servida en /images/bodegas/<archivo> (misma carpeta estática que ya sirve
// index.js). Reemplaza el campo "imagen" por el nombre de archivo nuevo.
// OJO: en Railway sin un Volume montado en backend/images, esta carpeta es efímera y
// las fotos subidas así se pierden en el próximo deploy — hace falta un Volume para
// que persistan (ver README/checklist de deploy).
const CARPETA_UPLOADS = path.join(__dirname, '..', 'images', 'bodegas');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `bodega-${req.params.id}-${Date.now()}${ext}`);
    }
});

const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
exports.uploadImagenMiddleware = multer({
    storage,
    limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
    fileFilter: (req, file, cb) => {
        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Formato no soportado. Usá JPG, PNG o WEBP.'));
        }
        cb(null, true);
    }
}).single('imagen');

exports.subirImagenBodega = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo (campo "imagen").' });

    const valorImagen = `bodegas/${req.file.filename}`;
    try {
        await db.query('UPDATE bodegas SET imagen = ? WHERE id = ?', [valorImagen, req.params.id]);
        res.json({ imagen: valorImagen, message: 'Foto subida y asignada con éxito.' });
    } catch (error) {
        console.error('Error al guardar la imagen subida:', error.message);
        res.status(500).json({ error: 'La foto se subió pero no se pudo guardar en la bodega.' });
    }
};

// 9. Generar una bio/descripción con IA (admin) — arma el texto a partir de los datos
// que ya tenemos de la bodega y lo devuelve para que el admin lo revise en el
// formulario de edición ANTES de guardarlo (no pisa "descripcion" directo en la DB).
exports.generarBioBodega = async (req, res) => {
    if (!openai) {
        return res.status(503).json({ error: 'La generación con IA todavía no está configurada (falta OPENAI_API_KEY en el servidor).' });
    }

    const LIMITE_CARACTERES = 1500;

    try {
        const [rows] = await db.query('SELECT * FROM bodegas WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Bodega no encontrada' });
        const b = rows[0];

        const datosConocidos = [
            `Nombre: ${b.nombre}`,
            b.zona && `Zona: ${b.zona}${b.subzona ? ' (' + b.subzona + ')' : ''}`,
            b.direccion && `Dirección: ${b.direccion}`,
            b.sitio_web && `Sitio web: ${b.sitio_web}`,
            b.contacto_nombre && `Contacto: ${b.contacto_nombre}`,
            b.notas && `Notas internas: ${b.notas}`,
            b.descripcion && `Descripción actual (para mejorar o reemplazar, no repetir literal): ${b.descripcion}`,
        ].filter(Boolean).join('\n');

        const systemPrompt = `Sos un redactor especializado en marketing de vino y turismo enológico. Escribís bios de bodegas de Mendoza para un marketplace B2B (Mendoza Reserve) que las conecta con compradores e importadores de vino en el Reino Unido.
Escribí en español, en un tono cálido, profesional y creíble — nada de superlativos vacíos ni inventar premios, certificaciones, años de fundación o varietales que no te dieron como dato. Si falta un dato, no lo inventes: simplemente no lo menciones.
La bio tiene que servir para DOS cosas a la vez: (a) que Roberto (el dueño de Mendoza Reserve) se la pueda mostrar a la bodega como algo atractivo cuando la contacta por primera vez, y (b) que funcione como la descripción pública de la bodega en el sitio.
Extensión: máximo ${LIMITE_CARACTERES} caracteres (contando espacios), 2 a 4 párrafos cortos. Devolvé SOLO el texto de la bio, sin título, sin comillas, sin markdown.`;

        const userPrompt = `Datos disponibles de la bodega:\n${datosConocidos}\n\nEscribí la bio.`;

        const response = await openai.chat.completions.create({
            model: MODEL,
            max_tokens: 900,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });

        let bio = response.choices?.[0]?.message?.content?.trim() || '';
        if (bio.length > LIMITE_CARACTERES) bio = bio.slice(0, LIMITE_CARACTERES).trim();

        if (!bio) return res.status(502).json({ error: 'La IA no devolvió texto. Probá de nuevo.' });

        res.json({ descripcion: bio, caracteres: bio.length });
    } catch (error) {
        console.error('Error al generar bio con IA:', error.message);
        res.status(500).json({ error: 'Error al generar la descripción con IA.' });
    }
};
