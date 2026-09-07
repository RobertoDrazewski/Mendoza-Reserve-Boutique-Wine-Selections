// Genera la invoice en PDF que el comprador puede descargar desde "Mis pedidos".
// Usa pdfkit (librería pura de Node, sin binario del sistema) — a diferencia de los
// PDFs de material comercial de esta sesión (armados con wkhtmltopdf), este SÍ corre
// en producción (Railway), así que no puede depender de un binario externo instalado
// aparte.
//
// OJO: esta es la invoice de la RESERVA (la comisión del 12% que el comprador le paga
// directo a Mendoza Reserve) — no reemplaza la factura que la bodega le manda al
// comprador por el valor del vino, que la bodega emite y cobra aparte, directamente.

const PDFDocument = require('pdfkit');

const COLOR_MARRON = '#a63a43';
const COLOR_DORADO = '#d4af37';
const COLOR_TEXTO = '#333333';
const COLOR_GRIS = '#888888';

const TEXTOS = {
    es: {
        title: 'Comprobante de reserva',
        subtitle: 'Mendoza Reserve — Boutique Wine Selections',
        invoiceNumber: 'Comprobante Nº',
        date: 'Fecha',
        order: 'Pedido',
        billedTo: 'Facturado a',
        winery: 'Bodega',
        item: 'Vino',
        qty: 'Cant.',
        unitPrice: 'Precio unit.',
        subtotal: 'Subtotal',
        commissionLabel: (pct) => `Reserva Mendoza Reserve (${pct}%)`,
        total: 'Total reserva pagado',
        note: 'Este comprobante corresponde únicamente a la reserva cobrada por Mendoza Reserve al confirmar el pedido. El valor del vino lo factura y cobra la bodega directamente.',
        footer: 'Mendoza Reserve · mendoza-reserve.co.uk',
        status: 'Estado del pedido',
    },
    en: {
        title: 'Reservation receipt',
        subtitle: 'Mendoza Reserve — Boutique Wine Selections',
        invoiceNumber: 'Receipt No.',
        date: 'Date',
        order: 'Order',
        billedTo: 'Billed to',
        winery: 'Winery',
        item: 'Wine',
        qty: 'Qty',
        unitPrice: 'Unit price',
        subtotal: 'Subtotal',
        commissionLabel: (pct) => `Mendoza Reserve reservation (${pct}%)`,
        total: 'Total reservation paid',
        note: 'This receipt covers only the reservation fee collected by Mendoza Reserve when the order was confirmed. The wine itself is invoiced and collected directly by the winery.',
        footer: 'Mendoza Reserve · mendoza-reserve.co.uk',
        status: 'Order status',
    }
};

function formatearMoneda(monto, moneda) {
    return `${moneda} ${Number(monto).toFixed(2)}`;
}

/**
 * @param {object} params
 * @param {object} params.order - fila de `orders` (con bodega_nombre join'eado)
 * @param {Array}  params.items - filas de order_items (con vino_nombre, varietal, cosecha)
 * @param {'es'|'en'} [params.lang]
 * @returns {Promise<Buffer>}
 */
function generarInvoicePDF({ order, items, lang }) {
    const t = TEXTOS[lang] || TEXTOS.es;

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Encabezado ---
            doc.rect(0, 0, doc.page.width, 8).fill(COLOR_DORADO);
            doc.moveDown(1.2);
            doc.fillColor(COLOR_MARRON).font('Helvetica-Bold').fontSize(20)
                .text('MENDOZA RESERVE', { align: 'center', characterSpacing: 2 });
            doc.fillColor(COLOR_GRIS).font('Helvetica').fontSize(10)
                .text(t.subtitle, { align: 'center' });
            doc.moveDown(1.5);
            doc.strokeColor(COLOR_DORADO).lineWidth(1)
                .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
            doc.moveDown(1);

            doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(16).text(t.title);
            doc.moveDown(0.5);

            // --- Datos del comprobante ---
            doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXTO);
            const fecha = order.confirmed_at || order.created_at;
            const filasInfo = [
                [`${t.invoiceNumber}:`, `MR-${String(order.id).padStart(6, '0')}`],
                [`${t.date}:`, fecha ? new Date(fecha).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-AR') : '-'],
                [`${t.order}:`, order.cart_group_id],
                [`${t.status}:`, order.estado],
                [`${t.winery}:`, order.bodega_nombre || '-'],
            ];
            filasInfo.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(label, { continued: true, width: 500 });
                doc.font('Helvetica').text(` ${value}`);
            });

            doc.moveDown(0.8);
            doc.font('Helvetica-Bold').text(`${t.billedTo}:`);
            doc.font('Helvetica').text(order.buyer_name || '-');
            if (order.buyer_company) doc.text(order.buyer_company);
            doc.text(order.buyer_email || '-');
            if (order.shipping_address) doc.text(order.shipping_address);

            doc.moveDown(1.2);

            // --- Tabla de items ---
            const colX = { item: 50, qty: 330, price: 390, sub: 470 };
            const anchoTabla = doc.page.width - 100;
            const yTablaInicio = doc.y;

            doc.rect(50, yTablaInicio, anchoTabla, 20).fill('#f4f1ea');
            doc.fillColor(COLOR_MARRON).font('Helvetica-Bold').fontSize(9);
            doc.text(t.item, colX.item + 5, yTablaInicio + 6);
            doc.text(t.qty, colX.qty, yTablaInicio + 6);
            doc.text(t.unitPrice, colX.price, yTablaInicio + 6);
            doc.text(t.subtotal, colX.sub, yTablaInicio + 6);

            let y = yTablaInicio + 24;
            doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO);
            (items || []).forEach((item, i) => {
                if (i % 2 === 1) doc.rect(50, y - 4, anchoTabla, 18).fill('#fbfaf7').fillColor(COLOR_TEXTO);
                const nombreCompleto = [item.vino_nombre, item.varietal, item.cosecha].filter(Boolean).join(' — ');
                doc.text(nombreCompleto, colX.item + 5, y, { width: colX.qty - colX.item - 10 });
                doc.text(String(item.cantidad), colX.qty, y);
                doc.text(formatearMoneda(item.precio_unitario, order.moneda), colX.price, y);
                doc.text(formatearMoneda(item.precio_unitario * item.cantidad, order.moneda), colX.sub, y);
                y += 18;
            });

            doc.moveTo(50, y + 4).lineTo(doc.page.width - 50, y + 4).strokeColor('#dddddd').stroke();
            y += 14;

            doc.font('Helvetica').fontSize(10);
            doc.text(t.subtotal, colX.price, y, { width: 70, align: 'left' });
            doc.text(formatearMoneda(order.subtotal, order.moneda), colX.sub, y);
            y += 16;

            doc.text(t.commissionLabel(order.comision_pct_aplicada), colX.price - 80, y, { width: 150, align: 'left' });
            doc.text(formatearMoneda(order.comision_monto, order.moneda), colX.sub, y);
            y += 22;

            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_MARRON);
            doc.text(t.total, colX.price - 80, y, { width: 150, align: 'left' });
            doc.text(formatearMoneda(order.comision_monto, order.moneda), colX.sub, y);

            doc.moveDown(3);
            doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR_GRIS)
                .text(t.note, 50, doc.y, { width: anchoTabla, align: 'left' });

            // --- Pie de página ---
            const yFooter = doc.page.height - 60;
            doc.font('Helvetica').fontSize(8).fillColor(COLOR_GRIS)
                .text(t.footer, 50, yFooter, { align: 'center', width: anchoTabla });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generarInvoicePDF };
