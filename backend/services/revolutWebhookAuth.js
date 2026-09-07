// Verificación de firma de los webhooks de Revolut (HMAC-SHA256), tal cual la
// documentan ellos: https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature
//
// String a firmar: "v1.<timestamp>.<cuerpo crudo del request, sin tocar>"
// Header con la firma:  Revolut-Signature            -> "v1=<hex>[,v1=<hex>...]"
// Header con el timestamp: Revolut-Request-Timestamp  -> epoch en milisegundos
//
// Importante: esto necesita el BODY CRUDO (sin parsear a JSON todavía), por eso
// la ruta del webhook en index.js usa express.raw() en vez del express.json()
// global — si se parsea antes, la firma nunca va a coincidir.

const crypto = require('crypto');

const TOLERANCIA_MS = 5 * 60 * 1000; // Revolut recomienda rechazar entregas de más de 5 minutos

function verificarFirmaWebhook({ rawBody, signatureHeader, timestampHeader, signingSecret }) {
    if (!signingSecret) {
        throw new Error('Falta configurar REVOLUT_WEBHOOK_SECRET en el .env');
    }
    if (!signatureHeader || !timestampHeader) {
        return { valido: false, motivo: 'Faltan los headers Revolut-Signature / Revolut-Request-Timestamp' };
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > TOLERANCIA_MS) {
        return { valido: false, motivo: 'Timestamp del webhook vencido o inválido (posible replay)' };
    }

    const payloadAFirmar = `v1.${timestampHeader}.${rawBody.toString('utf8')}`;
    const firmaEsperada = 'v1=' + crypto
        .createHmac('sha256', signingSecret)
        .update(payloadAFirmar, 'utf8')
        .digest('hex');

    // Durante la rotación del secret, Revolut puede mandar varias firmas separadas
    // por coma — alcanza con que UNA coincida.
    const firmasRecibidas = signatureHeader.split(',').map((s) => s.trim());
    const coincide = firmasRecibidas.some((firma) => {
        try {
            return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada));
        } catch {
            return false; // longitudes distintas -> timingSafeEqual tira si no coinciden en tamaño
        }
    });

    return coincide ? { valido: true } : { valido: false, motivo: 'La firma no coincide' };
}

module.exports = { verificarFirmaWebhook };
