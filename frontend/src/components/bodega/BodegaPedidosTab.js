import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    es: {
        loading: 'Cargando...', empty: 'Todavía no tenés pedidos.',
        col: { id: '#', comprador: 'Comprador', subtotal: 'Subtotal', estado: 'Estado', fecha: 'Fecha', acciones: 'Acciones' },
        dispatch: 'Marcar como despachado', dispatching: 'Despachando...',
        carrier: 'Transportista (opcional)', tracking: 'Nº de seguimiento (opcional)', trackingUrl: 'URL de seguimiento (opcional)',
        confirmBtn: 'Confirmar despacho', cancel: 'Cancelar',
        okDispatch: 'Pedido marcado como despachado.', errorGeneric: 'Ocurrió un error.',
        allFilter: 'Todos los estados'
    },
    en: {
        loading: 'Loading...', empty: 'You don’t have any orders yet.',
        col: { id: '#', comprador: 'Buyer', subtotal: 'Subtotal', estado: 'Status', fecha: 'Date', acciones: 'Actions' },
        dispatch: 'Mark as dispatched', dispatching: 'Dispatching...',
        carrier: 'Carrier (optional)', tracking: 'Tracking number (optional)', trackingUrl: 'Tracking URL (optional)',
        confirmBtn: 'Confirm dispatch', cancel: 'Cancel',
        okDispatch: 'Order marked as dispatched.', errorGeneric: 'Something went wrong.',
        allFilter: 'All statuses'
    }
};

const ESTADOS = ['pendiente_bodega', 'confirmada', 'en_preparacion', 'enviada', 'en_transito', 'entregada', 'cancelada'];

const BodegaPedidosTab = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [dispatchingId, setDispatchingId] = useState(null);
    const [dispatchForm, setDispatchForm] = useState({ carrier: '', tracking_number: '', tracking_url: '' });
    const [msg, setMsg] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = estadoFiltro ? { estado: estadoFiltro } : {};
            const res = await axios.get(`${API_URL}/bodega/pedidos`, { params });
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estadoFiltro]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const puedeDespachar = (estado) => ['confirmada', 'en_preparacion'].includes(estado);

    const abrirDespacho = (id) => {
        setDispatchingId(id);
        setDispatchForm({ carrier: '', tracking_number: '', tracking_url: '' });
        setMsg(null);
    };

    const confirmarDespacho = async (id) => {
        try {
            await axios.patch(`${API_URL}/bodega/pedidos/${id}/despachar`, dispatchForm);
            setMsg({ type: 'ok', text: t.okDispatch });
            setDispatchingId(null);
            fetchOrders();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorGeneric });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">{t.allFilter}</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="admin-count">{orders.length}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.col.id}</th><th>{t.col.comprador}</th><th>{t.col.subtotal}</th>
                                <th>{t.col.estado}</th><th>{t.col.fecha}</th><th>{t.col.acciones}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <React.Fragment key={o.id}>
                                    <tr>
                                        <td data-label={t.col.id}>{o.id}</td>
                                        <td className="admin-small" data-label={t.col.comprador}>{o.buyer_name}<br />{o.buyer_email}</td>
                                        <td data-label={t.col.subtotal}>{o.moneda} {Number(o.subtotal).toFixed(2)}</td>
                                        <td data-label={t.col.estado}>{o.estado}</td>
                                        <td className="admin-small" data-label={t.col.fecha}>{new Date(o.created_at).toLocaleDateString()}</td>
                                        <td data-label={t.col.acciones}>
                                            {puedeDespachar(o.estado) && (
                                                <button className="btn-link-edit" onClick={() => abrirDespacho(o.id)}>{t.dispatch}</button>
                                            )}
                                        </td>
                                    </tr>
                                    {dispatchingId === o.id && (
                                        <tr className="admin-edit-row">
                                            <td colSpan={6}>
                                                <div className="admin-edit-grid">
                                                    <label>{t.carrier}
                                                        <input value={dispatchForm.carrier}
                                                            onChange={(e) => setDispatchForm({ ...dispatchForm, carrier: e.target.value })} />
                                                    </label>
                                                    <label>{t.tracking}
                                                        <input value={dispatchForm.tracking_number}
                                                            onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_number: e.target.value })} />
                                                    </label>
                                                    <label>{t.trackingUrl}
                                                        <input value={dispatchForm.tracking_url}
                                                            onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_url: e.target.value })} />
                                                    </label>
                                                </div>
                                                <div className="admin-vino-form-actions">
                                                    <button className="btn-primary-sm" onClick={() => confirmarDespacho(o.id)}>{t.confirmBtn}</button>
                                                    <button className="btn-link-edit" onClick={() => setDispatchingId(null)}>{t.cancel}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {orders.length === 0 && <tr><td colSpan={6}>{t.empty}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BodegaPedidosTab;
