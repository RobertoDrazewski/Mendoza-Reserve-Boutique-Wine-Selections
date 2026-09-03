const { Resend } = require('resend');

// Si no hay RESEND_API_KEY configurada (ej. en desarrollo local), no rompemos el
// flujo de la app: simplemente logueamos que el email "se hubiera" enviado.
// Así todo el resto (crear orden, aceptar pedido, marcar enviado) funciona
// igual sin necesidad de tener Resend configurado todavía.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mendoza Reserve <pedidos@mendoza-reserve.co.uk>';
const SITE_URL = process.env.SITE_URL || 'https://mendoza-reserve.co.uk';

async function enviarEmail({ to, subject, html }) {
    if (!resend) {
        console.log(`✉️  [EMAIL simulado — falta RESEND_API_KEY] Para: ${to} | Asunto: ${subject}`);
        return { simulated: true };
    }
    try {
        const result = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
        return result;
    } catch (error) {
        // Un fallo de email nunca debe tumbar la operación principal (crear orden, etc.)
        console.error(`❌ Error enviando email a ${to}:`, error.message);
        return { error: error.message };
    }
}

function layoutBase(contenidoHtml) {
    return `
    <div style="font-family: Georgia, 'Times New Roman', serif; background:#f4f1ea; padding:30px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d4af37;">
        <div style="background:#a63a43;padding:20px 30px;">
          <span style="color:#fff;font-size:1.2rem;letter-spacing:2px;text-transform:uppercase;">Mendoza Reserve</span>
        </div>
        <div style="padding:30px;color:#333;line-height:1.6;">
          ${contenidoHtml}
        </div>
        <div style="padding:15px 30px;border-top:1px solid #eee;color:#999;font-size:0.75rem;">
          Mendoza Reserve · Boutique Wine Selections · ${SITE_URL}
        </div>
      </div>
    </div>`;
}

// 1. Email a la bodega: nueva orden + link para aceptar/rechazar sin login.
async function emailNuevaOrdenBodega({ bodegaEmail, bodegaNombre, order, items }) {
    if (!bodegaEmail) return; // si la bodega todavía no cargó su email, no hay a quién mandarle
    const filas = items.map((i) => `<li>${i.cantidad} × ${i.vino_nombre} — ${order.moneda} ${Number(i.precio_unitario).toFixed(2)}</li>`).join('');
    const acceptUrl = `${SITE_URL}/bodega/pedido/${order.accept_token}`;
    const html = layoutBase(`
        <h2 style="color:#a63a43;font-family:Georgia,serif;">Nuevo pedido de exportación</h2>
        <p>Hola ${bodegaNombre},</p>
        <p>Recibiste un nuevo pedido de un comprador en Reino Unido a través de Mendoza Reserve:</p>
        <ul>${filas}</ul>
        <p><strong>Subtotal: ${order.moneda} ${Number(order.subtotal).toFixed(2)}</strong></p>
        <p>Dirección de envío: ${order.shipping_address}, ${order.shipping_country}</p>
        <p>Por favor confirmá o rechazá este pedido desde el siguiente enlace (no necesitás usuario ni contraseña):</p>
        <p style="text-align:center;margin:25px 0;">
          <a href="${acceptUrl}" style="background:#a63a43;color:#fff;padding:14px 28px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.85rem;">Ver y responder el pedido</a>
        </p>
        <p style="font-size:0.85rem;color:#777;">Recordá: la comisión de la plataforma sobre esta venta es del ${order.comision_pct_aplicada}% (${order.moneda} ${Number(order.comision_monto).toFixed(2)}), y se factura por separado.</p>
    `);
    return enviarEmail({ to: bodegaEmail, subject: `Nuevo pedido de exportación — ${bodegaNombre}`, html });
}

// 2. Email de confirmación al comprador (resumen de todo el cart_group).
async function emailConfirmacionComprador({ buyerEmail, buyerName, cartGroupId, ordenesCreadas }) {
    const trackingUrl = `${SITE_URL}/seguimiento/${cartGroupId}?email=${encodeURIComponent(buyerEmail)}`;
    const filas = ordenesCreadas.map((o) => `<li>${o.bodegaNombre}: subtotal ${o.subtotal}</li>`).join('');
    const html = layoutBase(`
        <h2 style="color:#a63a43;font-family:Georgia,serif;">¡Gracias por tu pedido!</h2>
        <p>Hola ${buyerName},</p>
        <p>Tu pedido fue enviado a las siguientes bodegas para su confirmación:</p>
        <ul>${filas}</ul>
        <p>Cada bodega se pondrá en contacto directamente con vos para coordinar el pago y el envío.</p>
        <p style="text-align:center;margin:25px 0;">
          <a href="${trackingUrl}" style="background:#a63a43;color:#fff;padding:14px 28px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.85rem;">Seguir mi pedido</a>
        </p>
        <p style="font-size:0.8rem;color:#777;">Guardá este código de pedido: <strong>${cartGroupId}</strong></p>
    `);
    return enviarEmail({ to: buyerEmail, subject: 'Confirmación de tu pedido — Mendoza Reserve', html });
}

// 3. Email al comprador cuando la bodega confirma o cancela.
async function emailRespuestaBodega({ buyerEmail, buyerName, bodegaNombre, accion, cartGroupId }) {
    const trackingUrl = `${SITE_URL}/seguimiento/${cartGroupId}?email=${encodeURIComponent(buyerEmail)}`;
    const mensaje = accion === 'confirmar'
        ? `${bodegaNombre} confirmó tu pedido y se pondrá en contacto para coordinar el pago y el envío.`
        : `${bodegaNombre} no pudo aceptar tu pedido en este momento.`;
    const html = layoutBase(`
        <h2 style="color:#a63a43;font-family:Georgia,serif;">Actualización de tu pedido</h2>
        <p>Hola ${buyerName},</p>
        <p>${mensaje}</p>
        <p style="text-align:center;margin:25px 0;">
          <a href="${trackingUrl}" style="background:#a63a43;color:#fff;padding:14px 28px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.85rem;">Ver estado del pedido</a>
        </p>
    `);
    return enviarEmail({ to: buyerEmail, subject: `${bodegaNombre} ${accion === 'confirmar' ? 'confirmó' : 'no pudo aceptar'} tu pedido`, html });
}

// 4. Email al comprador cuando se actualiza el envío (tracking).
async function emailActualizacionEnvio({ buyerEmail, buyerName, bodegaNombre, shipment, cartGroupId }) {
    const trackingUrl = `${SITE_URL}/seguimiento/${cartGroupId}?email=${encodeURIComponent(buyerEmail)}`;
    const html = layoutBase(`
        <h2 style="color:#a63a43;font-family:Georgia,serif;">Tu pedido está en camino</h2>
        <p>Hola ${buyerName},</p>
        <p>${bodegaNombre} actualizó el estado de tu envío a: <strong>${shipment.status}</strong></p>
        ${shipment.carrier ? `<p>Transportista: ${shipment.carrier}</p>` : ''}
        ${shipment.tracking_number ? `<p>Número de seguimiento: ${shipment.tracking_number}</p>` : ''}
        ${shipment.tracking_url ? `<p><a href="${shipment.tracking_url}">${shipment.tracking_url}</a></p>` : ''}
        <p style="text-align:center;margin:25px 0;">
          <a href="${trackingUrl}" style="background:#a63a43;color:#fff;padding:14px 28px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.85rem;">Ver mi pedido</a>
        </p>
    `);
    return enviarEmail({ to: buyerEmail, subject: `Actualización de envío — ${bodegaNombre}`, html });
}

module.exports = {
    emailNuevaOrdenBodega,
    emailConfirmacionComprador,
    emailRespuestaBodega,
    emailActualizacionEnvio
};
