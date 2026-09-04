import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/OrderTracking.css';
import '../styles/WineryOrderResponse.css';

// Página pública (sin login) a la que llega la bodega desde el link del email
// para confirmar o rechazar un pedido. La identidad la da el accept_token.
const WineryOrderResponse = () => {
    const { token } = useParams();
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
                setError(err.response?.data?.message || 'Enlace inválido o vencido.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [token, API_URL]);

    const responder = async (accion) => {
        setEnviando(true);
        try {
            const res = await axios.post(`${API_URL}/orders/accept/${token}`, { action: accion, notas_bodega: notas || undefined });
            setResultado(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo registrar tu respuesta.');
        } finally {
            setEnviando(false);
        }
    };

    if (loading) return <div className="tracking-container"><p>Cargando pedido...</p></div>;
    if (error && !order) return <div className="tracking-container"><p className="tracking-error">{error}</p></div>;

    return (
        <div className="tracking-container">
            <h1>Pedido de exportación</h1>
            <p className="tracking-subtitle">Este pedido llegó a través de Mendoza Reserve. Revisá el detalle y confirmá si podés cumplirlo.</p>

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

                <p className="tracking-subtotal">Subtotal: <strong>{order.moneda} {Number(order.subtotal).toFixed(2)}</strong></p>
                <p className="wo-comision">Comisión Mendoza Reserve ({order.comision_pct_aplicada}%): {order.moneda} {Number(order.comision_monto).toFixed(2)} (se factura por separado)</p>

                <div className="wo-buyer">
                    <h4>Datos del comprador</h4>
                    <p>{order.buyer_name}{order.buyer_company ? ` — ${order.buyer_company}` : ''}</p>
                    <p>{order.buyer_email}{order.buyer_phone ? ` · ${order.buyer_phone}` : ''}</p>
                    <p>{order.shipping_address}, {order.shipping_country}</p>
                </div>

                {order.estado === 'pendiente_bodega' && !resultado && (
                    <div className="wo-actions">
                        <textarea
                            placeholder="Comentario opcional (ej. tiempo estimado de despacho)"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                        />
                        <div className="wo-buttons">
                            <button className="wo-btn-confirm" disabled={enviando} onClick={() => responder('confirmar')}>
                                Confirmar pedido
                            </button>
                            <button className="wo-btn-reject" disabled={enviando} onClick={() => responder('rechazar')}>
                                No puedo cumplirlo
                            </button>
                        </div>
                        {error && <p className="tracking-error">{error}</p>}
                    </div>
                )}

                {order.estado !== 'pendiente_bodega' && !resultado && (
                    <p className="wo-ya-respondido">Este pedido ya fue actualizado (estado: {order.estado}).</p>
                )}

                {resultado && (
                    <p className="wo-resultado">{resultado.message}</p>
                )}
            </div>
        </div>
    );
};

export default WineryOrderResponse;
