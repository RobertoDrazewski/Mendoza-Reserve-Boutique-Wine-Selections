// Cliente mínimo para la Merchant API de Revolut Business.
//
// OJO — esto se usa ÚNICAMENTE para cobrar la "reserva" (nuestra comisión del 12%,
// que el comprador paga directo a Mendoza Reserve). Nunca tocamos la plata de la
// bodega: eso lo cobra ella directamente del comprador, aparte, por su cuenta.
// Por eso este cliente no necesita saber nada de "terceros" — solo crea/reembolsa
// órdenes de pago que son 100% ingresos propios de Mendoza Reserve.
//
// Variables de entorno necesarias (backend/.env):
//   REVOLUT_SECRET_KEY   -> Secret API Key de la Merchant API (Business > APIs > Merchant API)
//   REVOLUT_ENV          -> 'sandbox' (default) o 'production'
//   REVOLUT_API_VERSION  -> versión de la API (default: 2026-08-17)
//
// Requiere Node 18+ (usa fetch global).

const BASE_URL = process.env.REVOLUT_ENV === 'production'
    ? 'https://merchant.revolut.com/api'
    : 'https://sandbox-merchant.revolut.com/api';

const API_VERSION = process.env.REVOLUT_API_VERSION || '2026-08-17';

function getSecretKey() {
    const key = process.env.REVOLUT_SECRET_KEY;
    if (!key) {
        throw new Error('Falta configurar REVOLUT_SECRET_KEY en el .env (Secret Key de la Merchant API de Revolut Business)');
    }
    return key;
}

function headersBase() {
    return {
        Authorization: `Bearer ${getSecretKey()}`,
        'Revolut-Api-Version': API_VERSION,
        'Content-Type': 'application/json'
    };
}

// Revolut espera el monto en la unidad más chica de la moneda (peniques/centavos),
// no en la unidad principal (libras/dólares).
function aUnidadMinima(monto) {
    return Math.round(Number(monto) * 100);
}

/**
 * Crea la orden de pago de la "reserva" y devuelve la URL de checkout alojada por
 * Revolut a la que hay que redirigir al comprador para que pague.
 */
async function crearOrdenReserva({ monto, moneda, descripcion, referencia, redirectUrl }) {
    const body = {
        amount: aUnidadMinima(monto),
        currency: moneda,
        description: descripcion
    };
    if (referencia) body.merchant_order_data = { reference: referencia };
    if (redirectUrl) body.redirect_url = redirectUrl;

    const respuesta = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: headersBase(),
        body: JSON.stringify(body)
    });
    const data = await respuesta.json();
    if (!respuesta.ok) {
        throw new Error(data.message || `Revolut devolvió un error al crear la orden (HTTP ${respuesta.status})`);
    }
    return { id: data.id, checkoutUrl: data.checkout_url, estado: data.state };
}

/**
 * Reembolsa (total o parcialmente) una orden de reserva ya pagada. Se usa cuando
 * una bodega rechaza el pedido: se le devuelve al comprador la parte de la reserva
 * que correspondía a esa bodega.
 */
async function reembolsarOrden({ revolutOrderId, monto, moneda, descripcion }) {
    const respuesta = await fetch(`${BASE_URL}/orders/${revolutOrderId}/refund`, {
        method: 'POST',
        headers: {
            ...headersBase(),
            // Evita duplicar el reembolso si por algún motivo la llamada se reintenta.
            'Idempotency-Key': `refund-${revolutOrderId}-${Date.now()}`
        },
        body: JSON.stringify({ amount: aUnidadMinima(monto), currency: moneda, description: descripcion })
    });
    const data = await respuesta.json();
    if (!respuesta.ok) {
        throw new Error(data.message || `Revolut devolvió un error al reembolsar (HTTP ${respuesta.status})`);
    }
    return { id: data.id, estado: data.state };
}

/**
 * Registro único de un webhook (se corre una sola vez, ver scripts/setup_revolut_webhook.js).
 * Devuelve el signing_secret que hay que guardar como REVOLUT_WEBHOOK_SECRET.
 */
async function registrarWebhook({ url, eventos }) {
    const respuesta = await fetch(`${BASE_URL}/webhooks`, {
        method: 'POST',
        headers: headersBase(),
        body: JSON.stringify({ url, events: eventos })
    });
    const data = await respuesta.json();
    if (!respuesta.ok) {
        throw new Error(data.message || `Revolut devolvió un error al registrar el webhook (HTTP ${respuesta.status})`);
    }
    return data; // incluye { id, url, events, signing_secret }
}

module.exports = { crearOrdenReserva, reembolsarOrden, registrarWebhook, aUnidadMinima };
