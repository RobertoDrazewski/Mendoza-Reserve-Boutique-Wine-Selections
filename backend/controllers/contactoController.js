const db = require('../config/db');
const { emailNuevaConsultaContacto } = require('../services/emailService');

// Verificación humana (Cloudflare Turnstile). Sólo se exige si TURNSTILE_SECRET_KEY está definida,
// así el formulario sigue funcionando mientras no se configure.
async function verificarTurnstile(token, ip) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return true;
    if (!token) return false;
    try {
        const body = new URLSearchParams({ secret, response: token });
        if (ip) body.append('remoteip', ip);
        const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
        const data = await r.json();
        return Boolean(data.success);
    } catch (e) {
        console.error('Error verificando Turnstile:', e.message);
        return false;
    }
}

// Guardar un nuevo mensaje (Público)
exports.enviarMensaje = async (req, res) => {
    const { nombre, email, asunto, mensaje, turnstileToken } = req.body;
    if (!(await verificarTurnstile(turnstileToken, req.ip))) {
        return res.status(400).json({ error: "No pudimos verificar que seas una persona. Intentá de nuevo." });
    }
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