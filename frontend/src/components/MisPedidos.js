import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/OrderTracking.css';

const ESTADOS_ES = {
    pendiente_bodega: 'Esperando confirmación de la bodega',
    confirmada: 'Confirmada por la bodega',
    en_preparacion: 'En preparación',
    enviada: 'Enviada',
    en_transito: 'En tránsito',
    entregada: 'Entregada',
    cancelada: 'Cancelada'
};
const ESTADOS_EN = {
    pendiente_bodega: 'Waiting for winery confirmation',
    confirmada: 'Confirmed by winery',
    en_preparacion: 'Being prepared',
    enviada: 'Shipped',
    en_transito: 'In transit',
    entregada: 'Delivered',
    cancelada: 'Cancelled'
};

const T = {
    es: {
        title: 'Mis pedidos', loading: 'Cargando...', empty: 'Todavía no hiciste ningún pedido.',
        viewWines: 'Ver vinos', details: 'Ver detalle', hide: 'Ocultar', invoice: 'Descargar invoice (PDF)',
        downloading: 'Generando...', subtotal: 'Subtotal', items: 'Vinos', shipment: 'Envío',
        carrier: 'Transportista', tracking: 'Nº de seguimiento', noShipment: 'Todavía no hay información de envío.',
        errorInvoice: 'No se pudo generar la invoice. Probá de nuevo en un momento.'
    },
    en: {
        title: 'My orders', loading: 'Loading...', empty: 'You haven’t placed any orders yet.',
        viewWines: 'View wines', details: 'View details', hide: 'Hide', invoice: 'Download invoice (PDF)',
        downloading: 'Generating...', subtotal: 'Subtotal', items: 'Wines', shipment: 'Shipment',
        carrier: 'Carrier', tracking: 'Tracking number', noShipment: 'No shipment information yet.',
        errorInvoice: 'The invoice could not be generated. Please try again shortly.'
    }
};

const MisPedidos = () => {
    const { user, loading: authLoading } = useAuth();
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const estadoLabels = lang === 'en' ? ESTADOS_EN : ESTADOS_ES;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [detailCache, setDetailCache] = useState({});
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/orders/mis-ordenes`);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { if (user) fetchOrders(); }, [user, fetchOrders]);

    if (!authLoading && !user) return <Navigate to="/login" replace />;

    const toggleDetalle = async (id) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        if (!detailCache[id]) {
            try {
                const res = await axios.get(`${API_URL}/orders/${id}`);
                setDetailCache((prev) => ({ ...prev, [id]: res.data }));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const descargarInvoice = async (id) => {
        setDownloadingId(id);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/orders/${id}/invoice`, {
                params: { lang },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `mendoza-reserve-invoice-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setError(t.errorInvoice);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="tracking-page" style={{ backgroundImage: "url('/images/historia.JPG')" }}>
            <div className="tracking-hero-inner">
                <h1>{t.title}</h1>
            </div>

            <div className="tracking-container">
                {error && <p className="tracking-error">{error}</p>}
                {loading ? (
                    <p>{t.loading}</p>
                ) : orders.length === 0 ? (
                    <p>{t.empty}</p>
                ) : (
                    <div className="tracking-results">
                        {orders.map((order) => {
                            const detalle = detailCache[order.id];
                            return (
                                <div key={order.id} className="tracking-order-card">
                                    <div className="tracking-order-header">
                                        <h3>{order.bodega_nombre}</h3>
                                        <span className={`estado-badge estado-${order.estado}`}>{estadoLabels[order.estado] || order.estado}</span>
                                    </div>

                                    <p className="tracking-subtotal">{t.subtotal}: <strong>{order.moneda} {Number(order.subtotal).toFixed(2)}</strong></p>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '10px 0' }}>
                                        <button type="button" className="btn-primary" onClick={() => toggleDetalle(order.id)}>
                                            {expandedId === order.id ? t.hide : t.details}
                                        </button>
                                        <button type="button" className="btn-primary" disabled={downloadingId === order.id}
                                            onClick={() => descargarInvoice(order.id)}>
                                            {downloadingId === order.id ? t.downloading : t.invoice}
                                        </button>
                                    </div>

                                    {expandedId === order.id && detalle && (
                                        <>
                                            <ul className="tracking-items">
                                                {detalle.items.map((item, idx) => (
                                                    <li key={idx}>{item.cantidad} × {item.vino_nombre} — {order.moneda} {Number(item.precio_unitario).toFixed(2)}</li>
                                                ))}
                                            </ul>
                                            <div className="tracking-shipment">
                                                <h4>{t.shipment}</h4>
                                                {detalle.shipment && detalle.shipment.tracking_number ? (
                                                    <>
                                                        {detalle.shipment.carrier && <p>{t.carrier}: {detalle.shipment.carrier}</p>}
                                                        <p>{t.tracking}: {detalle.shipment.tracking_number}</p>
                                                        {detalle.shipment.tracking_url && (
                                                            <a href={detalle.shipment.tracking_url} target="_blank" rel="noreferrer">{detalle.shipment.tracking_url}</a>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="no-shipment">{t.noShipment}</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisPedidos;
