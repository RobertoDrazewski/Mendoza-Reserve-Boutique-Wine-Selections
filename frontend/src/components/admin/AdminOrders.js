import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const ESTADOS_ORDEN = ['pendiente_bodega', 'confirmada', 'en_preparacion', 'enviada', 'en_transito', 'entregada', 'cancelada'];
const ESTADOS_COMISION = ['pendiente', 'facturada', 'pagada'];

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [comisionFiltro, setComisionFiltro] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [msg, setMsg] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (estadoFiltro) params.estado = estadoFiltro;
            if (comisionFiltro) params.comision_estado = comisionFiltro;
            const res = await axios.get(`${API_URL}/orders/admin`, { params });
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, estadoFiltro, comisionFiltro]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const actualizar = async (id, campo, valor) => {
        setSavingId(id);
        try {
            await axios.put(`${API_URL}/orders/admin/${id}`, { [campo]: valor });
            setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [campo]: valor } : o)));
            setMsg({ type: 'ok', text: 'Pedido actualizado.' });
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al actualizar el pedido.' });
        } finally {
            setSavingId(null);
        }
    };

    const totalComisionPendiente = orders
        .filter((o) => o.comision_estado === 'pendiente')
        .reduce((acc, o) => acc + Number(o.comision_monto), 0);

    return (
        <div>
            <div className="admin-toolbar">
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {ESTADOS_ORDEN.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={comisionFiltro} onChange={(e) => setComisionFiltro(e.target.value)}>
                    <option value="">Toda comisión</option>
                    {ESTADOS_COMISION.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="admin-count">{orders.length} pedidos · comisión pendiente: USD {totalComisionPendiente.toFixed(2)}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {loading ? <p>Cargando...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th><th>Bodega</th><th>Comprador</th><th>Subtotal</th><th>Comisión</th>
                                <th>Estado pedido</th><th>Estado comisión</th><th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id}>
                                    <td data-label="#">{o.id}</td>
                                    <td data-label="Bodega">{o.bodega_nombre}</td>
                                    <td className="admin-small" data-label="Comprador">{o.buyer_name}<br />{o.buyer_email}</td>
                                    <td data-label="Subtotal">{o.moneda} {Number(o.subtotal).toFixed(2)}</td>
                                    <td data-label="Comisión">{o.moneda} {Number(o.comision_monto).toFixed(2)} ({o.comision_pct_aplicada}%)</td>
                                    <td data-label="Estado pedido">
                                        <select disabled={savingId === o.id} value={o.estado} onChange={(e) => actualizar(o.id, 'estado', e.target.value)}>
                                            {ESTADOS_ORDEN.map((e) => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </td>
                                    <td data-label="Estado comisión">
                                        <select disabled={savingId === o.id} value={o.comision_estado} onChange={(e) => actualizar(o.id, 'comision_estado', e.target.value)}>
                                            {ESTADOS_COMISION.map((e) => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </td>
                                    <td className="admin-small" data-label="Fecha">{new Date(o.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {orders.length === 0 && <tr><td colSpan={8}>No hay pedidos todavía.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
