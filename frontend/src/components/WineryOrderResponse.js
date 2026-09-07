import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import '../styles/OrderTracking.css';
import '../styles/WineryOrderResponse.css';

const T = {
    es: {
        loadingOrder: 'Cargando pedido...', invalidLink: 'Enlace inválido o vencido.',
        title: 'Pedido de exportación', subtitle: 'Este pedido llegó a través de Mendoza Reserve. Revisá el detalle y confirmá si podés cumplirlo.',
        subtotal: 'Subtotal', commission: 'Comisión Mendoza Reserve', invoicedSeparately: '(se factura por separado)',
        buyerData: 'Datos del comprador', commentPlaceholder: 'Comentario opcional (ej. tiempo estimado de despacho)',
        confirm: 'Confirmar pedido', reject: 'No puedo cumplirlo', alreadyUpdated: 'Este pedido ya fue actualizado (estado:',
        couldNotRespond: 'No se pudo registrar tu respuesta.'
    },
    en: {
        loadingOrder: 'Loading order...', invalidLink: 'Invalid or expired link.',
        title: 'Export order', subtitle: 'This order came through Mendoza Reserve. Review the details and confirm whether you can fulfil it.',
        subtotal: 'Subtotal', commission: 'Mendoza Reserve commission', invoicedSeparately: '(invoiced separately)',
        buyerData: 'Buyer details', commentPlaceholder: 'Optional comment (e.g. estimated dispatch time)',
        confirm: 'Confirm order', reject: "I can't fulfil this", alreadyUpdated: 'This order was already updated (status:',
        couldNotRespond: 'Your response could not be recorded.'
    }
};

// Página pública (sin login) a la que llega la bodega desde el link del email
// para confirmar o rechazar un pedido. La identidad la da el accept_token.
const WineryOrderResponse = () => {
    const { token } = useParams();
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notas, setNotas] = useState('');
    const [resultado, setResultado] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`${API_URL}/orders/accept/${token}`);
                setOrder(res.data);
            } catch (err) {
                setError(err.response?.data?.message || t.invalidLink);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, API_URL]);

    const responder = async (accion) => {
        setEnviando(true);
        try {
            const res = await axios.post(`${API_URL}/orders/accept/${token}`, { action: accion, notas_bodega: notas || undefined });
            setResultado(res.data);
        } catch (err) {
            setError(err.response?.data?.message || t.couldNotRespond);
        } finally {
            setEnviando(false);
        }
    };

    if (loading) return <div className="tracking-container"><p>{t.loadingOrder}</p></div>;
    if (error && !order) return <div className="tracking-container"><p className="tracking-error">{error}</p></div>;

    return (
        <div className="tracking-container">
            <h1>{t.title}</h1>
            <p className="tracking-subtitle">{t.subtitle}</p>

            <div className="tracking-order-card wo-card">
                <div className="tracking-order-header">
                    <h3>{order.bodega_nombre}</h3>
                    <span className={`estado-badge estado-${order.estado}`}>{order.estado}</span>
                </div>

                <ul className="tracking-items">
                    {order.items.map((item, idx) => (
                        <li key={idx}>{item.cantidad} × {item.vino_nombre}{item.varietal ? ` (${item.varietal}${item.cosecha ? ' ' + item.cosecha : ''})` : ''} — {order.moneda} {Number(item.precio_unitario).toFixed(2)}</li>
                    ))}
                </ul>

                <p className="tracking-subtotal">{t.subtotal}: <strong>{order.moneda} {Number(order.subtotal).toFixed(2)}</strong></p>
                <p className="wo-comision">{t.commission} ({order.comision_pct_aplicada}%): {order.moneda} {Number(order.comision_monto).toFixed(2)} {t.invoicedSeparately}</p>

                <div className="wo-buyer">
                    <h4>{t.buyerData}</h4>
                    <p>{order.buyer_name}{order.buyer_company ? ` — ${order.buyer_company}` : ''}</p>
                    <p>{order.buyer_email}{order.buyer_phone ? ` · ${order.buyer_phone}` : ''}</p>
                    <p>{order.shipping_address}, {order.shipping_country}</p>
                </div>

                {order.estado === 'pendiente_bodega' && !resultado && (
                    <div className="wo-actions">
                        <textarea
                            placeholder={t.commentPlaceholder}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                        />
                        <div className="wo-buttons">
                            <button className="wo-btn-confirm" disabled={enviando} onClick={() => responder('confirmar')}>
                                {t.confirm}
                            </button>
                            <button className="wo-btn-reject" disabled={enviando} onClick={() => responder('rechazar')}>
                                {t.reject}
                            </button>
                        </div>
                        {error && <p className="tracking-error">{error}</p>}
                    </div>
                )}

                {order.estado !== 'pendiente_bodega' && !resultado && (
                    <p className="wo-ya-respondido">{t.alreadyUpdated} {order.estado}).</p>
                )}

                {resultado && (
                    <p className="wo-resultado">{resultado.message}</p>
                )}
            </div>
        </div>
    );
};

export default WineryOrderResponse;
