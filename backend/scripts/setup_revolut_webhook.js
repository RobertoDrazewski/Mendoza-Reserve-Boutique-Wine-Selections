// Registra el webhook de Revolut UNA SOLA VEZ (por ambiente: sandbox y producción
// hay que correrlo una vez cada uno). Revolut devuelve un "signing_secret" que hay
// que copiar y pegar como REVOLUT_WEBHOOK_SECRET en el .env / variables de Railway
// — sin eso, el servidor no puede verificar que los webhooks realmente vienen de
// Revolut y los va a rechazar.
//
// Uso (desde la carpeta backend/):
//   node scripts/setup_revolut_webhook.js
//
// Requiere en el .env: REVOLUT_SECRET_KEY, REVOLUT_ENV (sandbox u production),
// y SITE_URL apuntando a la URL pública real del backend (Railway en producción).

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { registrarWebhook } = require('../services/revolutClient');

async function main() {
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) {
        console.error('❌ Falta SITE_URL en el .env (tiene que ser la URL pública del backend, ej. https://mendoza-reserve-boutique-wine-selections-production.up.railway.app)');
        process.exit(1);
    }

    const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/webhooks/revolut`;
    console.log(`▶ Registrando webhook en Revolut (${process.env.REVOLUT_ENV || 'sandbox'}) apuntando a:\n  ${webhookUrl}\n`);

    try {
        const resultado = await registrarWebhook({
            url: webhookUrl,
            eventos: ['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_CANCELLED']
        });

        console.log('✅ Webhook registrado con éxito.\n');
        console.log('Guardá esto en tu .env / variables de Railway:\n');
        console.log(`REVOLUT_WEBHOOK_SECRET=${resultado.signing_secret}\n`);
        console.log('(Guardá también el id del webhook por si después hace falta desactivarlo:', resultado.id, ')');
    } catch (err) {
        console.error('❌ Error registrando el webhook:', err.message);
        process.exit(1);
    }
}

main();
