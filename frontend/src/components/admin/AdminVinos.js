import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const FORMATOS = ['botella', 'caja6', 'caja12'];
const emptyForm = { nombre: '', varietal: '', cosecha: '', descripcion: '', formato: 'botella', moneda: 'USD', precio_unitario: '', stock: 0, imagen_url: '', activo: 1 };

const T = {
    es: {
        addNew: '+ Agregar vino', wines: 'vinos', loading: 'Cargando...',
        requiredFields: 'Nombre y precio son obligatorios.', okUpdated: 'Vino actualizado.', okCreated: 'Vino creado.',
        errorSave: 'Error al guardar el vino.', confirmDelete: '¿Eliminar este vino del catálogo?',
        errorDelete: 'Error al eliminar.', errorUpdate: 'Error al actualizar.',
        f: { nombre: 'Nombre', varietal: 'Varietal', cosecha: 'Cosecha', formato: 'Formato', moneda: 'Moneda', precio: 'Precio', stock: 'Stock', imagen: 'Imagen (archivo en /images o URL)', descripcion: 'Descripción' },
        saveChanges: 'Guardar cambios', createWine: 'Crear vino', cancel: 'Cancelar',
        col: { nombre: 'Nombre', varietalCosecha: 'Varietal / Cosecha', formato: 'Formato', precio: 'Precio', stock: 'Stock', activo: 'Activo', acciones: 'Acciones' },
        yesPause: 'Sí (pausar)', noActivate: 'No (activar)', edit: 'Editar', delete: 'Eliminar',
        empty: 'Esta bodega todavía no tiene vinos cargados.'
    },
    en: {
        addNew: '+ Add wine', wines: 'wines', loading: 'Loading...',
        requiredFields: 'Name and price are required.', okUpdated: 'Wine updated.', okCreated: 'Wine created.',
        errorSave: 'Error saving the wine.', confirmDelete: 'Delete this wine from the catalog?',
        errorDelete: 'Error deleting.', errorUpdate: 'Error updating.',
        f: { nombre: 'Name', varietal: 'Varietal', cosecha: 'Vintage', formato: 'Format', moneda: 'Currency', precio: 'Price', stock: 'Stock', imagen: 'Image (file under /images or URL)', descripcion: 'Description' },
        saveChanges: 'Save changes', createWine: 'Create wine', cancel: 'Cancel',
        col: { nombre: 'Name', varietalCosecha: 'Varietal / Vintage', formato: 'Format', precio: 'Price', stock: 'Stock', activo: 'Active', acciones: 'Actions' },
        yesPause: 'Yes (pause)', noActivate: 'No (activate)', edit: 'Edit', delete: 'Delete',
        empty: 'This winery has no wines loaded yet.'
    }
};

const AdminVinos = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [bodegas, setBodegas] = useState([]);
    const [bodegaId, setBodegaId] = useState('');
    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [showNew, setShowNew] = useState(false);
    const [msg, setMsg] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

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
            setMsg({ type: 'error', text: t.requiredFields });
            return;
        }
        try {
            if (editId) {
                await axios.put(`${API_URL}/vinos/${editId}`, form);
                setMsg({ type: 'ok', text: t.okUpdated });
            } else {
                await axios.post(`${API_URL}/vinos`, { ...form, bodega_id: Number(bodegaId) });
                setMsg({ type: 'ok', text: t.okCreated });
            }
            cancelar();
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorSave });
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm(t.confirmDelete)) return;
        try {
            await axios.delete(`${API_URL}/vinos/${id}`);
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorDelete });
        }
    };

    const toggleActivo = async (vino) => {
        try {
            await axios.put(`${API_URL}/vinos/${vino.id}`, { activo: vino.activo ? 0 : 1 });
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorUpdate });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>
                    {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.estado})</option>)}
                </select>
                <button className="btn-primary-sm" onClick={startNew}>{t.addNew}</button>
                <span className="admin-count">{vinos.length} {t.wines}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {(showNew || editId) && (
                <div className="admin-edit-grid admin-vino-form">
                    <label>{t.f.nombre}<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
                    <label>{t.f.varietal}<input value={form.varietal} onChange={(e) => setForm({ ...form, varietal: e.target.value })} /></label>
                    <label>{t.f.cosecha}<input type="number" value={form.cosecha} onChange={(e) => setForm({ ...form, cosecha: e.target.value })} /></label>
                    <label>{t.f.formato}
                        <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })}>
                            {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </label>
                    <label>{t.f.moneda}<input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} /></label>
                    <label>{t.f.precio}<input type="number" step="0.01" value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} /></label>
                    <label>{t.f.stock}<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
                    <label>{t.f.imagen}<input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} /></label>
                    <label className="full">{t.f.descripcion}<textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
                    <div className="admin-vino-form-actions">
                        <button className="btn-primary-sm" onClick={guardar}>{editId ? t.saveChanges : t.createWine}</button>
                        <button className="btn-link-edit" onClick={cancelar}>{t.cancel}</button>
                    </div>
                </div>
            )}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>{t.col.nombre}</th><th>{t.col.varietalCosecha}</th><th>{t.col.formato}</th><th>{t.col.precio}</th><th>{t.col.stock}</th><th>{t.col.activo}</th><th>{t.col.acciones}</th></tr></thead>
                        <tbody>
                            {vinos.map((v) => (
                                <tr key={v.id}>
                                    <td data-label={t.col.nombre}>{v.nombre}</td>
                                    <td data-label={t.col.varietalCosecha}>{[v.varietal, v.cosecha].filter(Boolean).join(' · ') || '—'}</td>
                                    <td data-label={t.col.formato}>{v.formato}</td>
                                    <td data-label={t.col.precio}>{v.moneda} {Number(v.precio_unitario).toFixed(2)}</td>
                                    <td data-label={t.col.stock}>{v.stock}</td>
                                    <td data-label={t.col.activo}>
                                        <button className="btn-link-edit" onClick={() => toggleActivo(v)}>{v.activo ? t.yesPause : t.noActivate}</button>
                                    </td>
                                    <td data-label={t.col.acciones}>
                                        <span className="admin-row-actions">
                                            <button className="btn-link-edit" onClick={() => startEdit(v)}>{t.edit}</button>
                                            <button className="btn-link-edit danger" onClick={() => eliminar(v.id)}>{t.delete}</button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {vinos.length === 0 && <tr><td colSpan={7}>{t.empty}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminVinos;
