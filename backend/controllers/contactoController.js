const db = require('../config/db');
const { emailNuevaConsultaContacto } = require('../services/emailService');

// Guardar un nuevo mensaje (Público)
exports.enviarMensaje = async (req, res) => {
    const { nombre, email, asunto, mensaje } = req.body;
    try {
        await db.query(
            'INSERT INTO mensajes_contacto (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)',
            [nombre, email, asunto, mensaje]
        );
        res.status(201).json({ msg: "Mensaje enviado correctamente. Nos contactaremos pronto." });

        // El aviso por email nunca debe tumbar la respuesta al usuario si falla.
        try {
            await emailNuevaConsultaContacto({ nombre, email, asunto, mensaje });
        } catch (emailError) {
            console.error('Error enviando aviso de contacto:', emailError.message);
        }
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el mensaje" });
    }
};

// Obtener todos los mensajes (Solo Admin)
exports.getMensajes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM mensajes_contacto ORDER BY fecha_envio DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los mensajes" });
    }
};