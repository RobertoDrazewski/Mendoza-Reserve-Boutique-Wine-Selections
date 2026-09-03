import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const FORMATOS = ['botella', 'caja6', 'caja12'];
const emptyForm = { nombre: '', varietal: '', cosecha: '', descripcion: '', formato: 'botella', moneda: 'USD', precio_unitario: '', stock: 0, imagen_url: '', activo: 1 };

const AdminVinos = () => {
    const [bodegas, setBodegas] = useState([]);
    const [bodegaId, setBodegaId] = useState('');
    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [showNew, setShowNew] = useState(false);
    const [msg, setMsg] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    useEffect(() => {
        axios.get(`${API_URL}/bodegas/admin`).then((res) => {
            setBodegas(res.data);
            if (res.data.length > 0) setBodegaId(String(res.data[0].id));
        }).catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchVinos = useCallback(async () => {
        if (!bodegaId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/vinos/admin/bodega/${bodegaId}`);
            setVinos(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, bodegaId]);

    useEffect(() => { fetchVinos(); }, [fetchVinos]);

    const startEdit = (vino) => {
        setShowNew(false);
        setEditId(vino.id);
        setForm({
            nombre: vino.nombre, varietal: vino.varietal || '', cosecha: vino.cosecha || '',
            descripcion: vino.descripcion || '', formato: vino.formato, moneda: vino.moneda,
            precio_unitario: vino.precio_unitario, stock: vino.stock, imagen_url: vino.imagen_url || '', activo: vino.activo
        });
    };

    const startNew = () => {
        setEditId(null);
        setForm(emptyForm);
        setShowNew(true);
    };

    const cancelar = () => { setEditId(null); setShowNew(false); setForm(emptyForm); };

    const guardar = async () => {
        if (!form.nombre || !form.precio_unitario) {
            setMsg({ type: 'error', text: 'Nombre y precio son obligatorios.' });
            return;
        }
        try {
            if (editId) {
                await axios.put(`${API_URL}/vinos/${editId}`, form);
                setMsg({ type: 'ok', text: 'Vino actualizado.' });
            } else {
                await axios.post(`${API_URL}/vinos`, { ...form, bodega_id: Number(bodegaId) });
                setMsg({ type: 'ok', text: 'Vino creado.' });
            }
            cancelar();
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar el vino.' });
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar este vino del catálogo?')) return;
        try {
            await axios.delete(`${API_URL}/vinos/${id}`);
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al eliminar.' });
        }
    };

    const toggleActivo = async (vino) => {
        try {
            await axios.put(`${API_URL}/vinos/${vino.id}`, { activo: vino.activo ? 0 : 1 });
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al actualizar.' });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>
                    {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.estado})</option>)}
                </select>
                <button className="btn-primary-sm" onClick={startNew}>+ Agregar vino</button>
                <span className="admin-count">{vinos.length} vinos</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {(showNew || editId) && (
                <div className="admin-edit-grid admin-vino-form">
                    <label>Nombre<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
                    <label>Varietal<input value={form.varietal} onChange={(e) => setForm({ ...form, varietal: e.target.value })} /></label>
                    <label>Cosecha<input type="number" value={form.cosecha} onChange={(e) => setForm({ ...form, cosecha: e.target.value })} /></label>
                    <label>Formato
                        <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })}>
                            {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </label>
                    <label>Moneda<input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} /></label>
                    <label>Precio<input type="number" step="0.01" value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} /></label>
                    <label>Stock<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
                    <label>Imagen (archivo en /images o URL)<input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} /></label>
                    <label className="full">Descripción<textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
                    <div className="admin-vino-form-actions">
                        <button className="btn-primary-sm" onClick={guardar}>{editId ? 'Guardar cambios' : 'Crear vino'}</button>
                        <button className="btn-link-edit" onClick={cancelar}>Cancelar</button>
                    </div>
                </div>
            )}

            {loading ? <p>Cargando...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Nombre</th><th>Varietal / Cosecha</th><th>Formato</th><th>Precio</th><th>Stock</th><th>Activo</th><th></th></tr></thead>
                        <tbody>
                            {vinos.map((v) => (
                                <tr key={v.id}>
                                    <td>{v.nombre}</td>
                                    <td>{[v.varietal, v.cosecha].filter(Boolean).join(' · ') || '—'}</td>
                                    <td>{v.formato}</td>
                                    <td>{v.moneda} {Number(v.precio_unitario).toFixed(2)}</td>
                                    <td>{v.stock}</td>
                                    <td>
                                        <button className="btn-link-edit" onClick={() => toggleActivo(v)}>{v.activo ? 'Sí (pausar)' : 'No (activar)'}</button>
                                    </td>
                                    <td>
                                        <button className="btn-link-edit" onClick={() => startEdit(v)}>Editar</button>{' '}
                                        <button className="btn-link-edit danger" onClick={() => eliminar(v.id)}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {vinos.length === 0 && <tr><td colSpan={7}>Esta bodega todavía no tiene vinos cargados.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminVinos;
