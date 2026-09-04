import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import '../styles/OrderTracking.css';
import ChatWidget from './ChatWidget';

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

const OrderTracking = () => {
    const { cartGroupId: cartGroupIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const { lang } = useLanguage();

    const [cartGroupId, setCartGroupId] = useState(cartGroupIdParam || '');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [orders, setOrders] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const t = {
        es: {
            title: 'Seguimiento de tu pedido', subtitle: 'Ingresá el código de pedido que recibiste por email y tu dirección de email.',
            orderId: 'Código de pedido', email: 'Email', search: 'Buscar pedido', searching: 'Buscando...',
            notFound: 'No encontramos un pedido con esos datos.', from: 'de', status: 'Estado', items: 'Vinos',
            subtotal: 'Subtotal', shipment: 'Envío', carrier: 'Transportista', tracking: 'Nº de seguimiento',
            noShipment: 'Todavía no hay información de envío.'
        },
        en: {
            title: 'Track your order', subtitle: 'Enter the order code you received by email and your email address.',
            orderId: 'Order code', email: 'Email', search: 'Track order', searching: 'Searching...',
            notFound: "We couldn't find an order with those details.", from: 'from', status: 'Status', items: 'Wines',
            subtotal: 'Subtotal', shipment: 'Shipment', carrier: 'Carrier', tracking: 'Tracking number',
            noShipment: 'No shipment information yet.'
        }
    };
    const currentT = t[lang] || t['es'];
    const estadoLabels = lang === 'en' ? ESTADOS_EN : ESTADOS_ES;

    const buscar = useCallback(async (id, mail) => {
        if (!id || !mail) return;
        setLoading(true);
        setError(null);
        setSearched(true);
        try {
            const res = await axios.get(`${API_URL}/orders/track/${id}`, { params: { email: mail } });
            setOrders(res.data.orders || []);
        } catch (err) {
            setOrders(null);
            setError(currentT.notFound);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL]);

    useEffect(() => {
        if (cartGroupIdParam && searchParams.get('email')) {
            buscar(cartGroupIdParam, searchParams.get('email'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        buscar(cartGroupId, email);
    };

    return (
        <div className="tracking-container">
            <h1>{currentT.title}</h1>
            <p className="tracking-subtitle">{currentT.subtitle}</p>

            <form className="tracking-form" onSubmit={handleSubmit}>
                <label>
                    {currentT.orderId}
                    <input value={cartGroupId} onChange={(e) => setCartGroupId(e.target.value)} required placeholder="c8191f16-1fe8-..." />
                </label>
                <label>
                    {currentT.email}
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <button type="submit" disabled={loading}>{loading ? currentT.searching : currentT.search}</button>
            </form>

            {error && searched && <p className="tracking-error">{error}</p>}

            {orders && orders.length > 0 && (
                <div className="tracking-results">
                    {orders.map((order) => (
                        <div key={order.id} className="tracking-order-card">
                            <div className="tracking-order-header">
                                <h3>{order.bodega_nombre}</h3>
                                <span className={`estado-badge estado-${order.estado}`}>{estadoLabels[order.estado] || order.estado}</span>
                            </div>

                            <ul className="tracking-items">
                                {order.items.map((item, idx) => (
                                    <li key={idx}>{item.cantidad} × {item.vino_nombre} — {order.moneda} {Number(item.precio_unitario).toFixed(2)}</li>
                                ))}
                            </ul>

                            <p className="tracking-subtotal">{currentT.subtotal}: <strong>{order.moneda} {Number(order.subtotal).toFixed(2)}</strong></p>

                            <div className="tracking-shipment">
                                <h4>{currentT.shipment}</h4>
                                {order.shipment && order.shipment.tracking_number ? (
                                    <>
                                        {order.shipment.carrier && <p>{currentT.carrier}: {order.shipment.carrier}</p>}
                                        {order.shipment.tracking_number && <p>{currentT.tracking}: {order.shipment.tracking_number}</p>}
                                        {order.shipment.tracking_url && (
                                            <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer">{order.shipment.tracking_url}</a>
                                        )}
                                    </>
                                ) : (
                                    <p className="no-shipment">{currentT.noShipment}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {orders && orders.length > 0 && (
                <ChatWidget cartGroupId={orders[0].cart_group_id} email={email} />
            )}
        </div>
    );
};

export default OrderTracking;
