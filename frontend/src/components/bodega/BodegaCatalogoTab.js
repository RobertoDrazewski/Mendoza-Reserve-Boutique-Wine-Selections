import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const FORMATOS = ['botella', 'caja6', 'caja12'];
const emptyForm = { nombre: '', varietal: '', cosecha: '', descripcion: '', formato: 'botella', moneda: 'USD', precio_unitario: '', stock: 0, imagen_url: '', activo: 1 };

const T = {
    es: {
        loading: 'Cargando...', addNew: '+ Agregar vino', cancel: 'Cancelar',
        save: 'Guardar', saving: 'Guardando...', edit: 'Editar', delete: 'Eliminar',
        confirmDelete: '¿Eliminar este vino del catálogo?',
        empty: 'Todavía no cargaste ningún vino.',
        col: { nombre: 'Nombre', varietal: 'Varietal', cosecha: 'Cosecha', precio: 'Precio', stock: 'Stock', activo: 'Activo', acciones: 'Acciones' },
        f: { nombre: 'Nombre', varietal: 'Varietal', cosecha: 'Cosecha (año)', descripcion: 'Descripción', formato: 'Formato', moneda: 'Moneda', precio_unitario: 'Precio unitario', stock: 'Stock', imagen_url: 'URL de imagen', activo: 'Activo' },
        okCreate: 'Vino agregado.', okUpdate: 'Vino actualizado.', okDelete: 'Vino eliminado.', errorGeneric: 'Ocurrió un error.'
    },
    en: {
        loading: 'Loading...', addNew: '+ Add wine', cancel: 'Cancel',
        save: 'Save', saving: 'Saving...', edit: 'Edit', delete: 'Delete',
        confirmDelete: 'Delete this wine from the catalog?',
        empty: 'You haven’t added any wines yet.',
        col: { nombre: 'Name', varietal: 'Varietal', cosecha: 'Vintage', precio: 'Price', stock: 'Stock', activo: 'Active', acciones: 'Actions' },
        f: { nombre: 'Name', varietal: 'Varietal', cosecha: 'Vintage (year)', descripcion: 'Description', formato: 'Format', moneda: 'Currency', precio_unitario: 'Unit price', stock: 'Stock', imagen_url: 'Image URL', activo: 'Active' },
        okCreate: 'Wine added.', okUpdate: 'Wine updated.', okDelete: 'Wine deleted.', errorGeneric: 'Something went wrong.'
    }
};

const BodegaCatalogoTab = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const fetchVinos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/bodega/catalogo`);
            setVinos(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const cancelForm = () => { setEditId(null); setShowNew(false); setForm(emptyForm); };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            if (editId) {
                await axios.put(`${API_URL}/bodega/catalogo/${editId}`, form);
                setMsg({ type: 'ok', text: t.okUpdate });
            } else {
                await axios.post(`${API_URL}/bodega/catalogo`, form);
                setMsg({ type: 'ok', text: t.okCreate });
            }
            cancelForm();
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorGeneric });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.confirmDelete)) return;
        try {
            await axios.delete(`${API_URL}/bodega/catalogo/${id}`);
            setMsg({ type: 'ok', text: t.okDelete });
            fetchVinos();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorGeneric });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <button className="btn-primary-sm" onClick={startNew}>{t.addNew}</button>
                <span className="admin-count">{vinos.length}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {(showNew || editId) && (
                <form onSubmit={handleSubmit} className="admin-vino-form">
                    <div className="admin-edit-grid">
                        <label>{t.f.nombre}<input name="nombre" value={form.nombre} onChange={handleChange} required /></label>
                        <label>{t.f.varietal}<input name="varietal" value={form.varietal} onChange={handleChange} /></label>
                        <label>{t.f.cosecha}<input type="number" name="cosecha" value={form.cosecha} onChange={handleChange} /></label>
                        <label>{t.f.formato}
                            <select name="formato" value={form.formato} onChange={handleChange}>
                                {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </label>
                        <label>{t.f.moneda}<input name="moneda" value={form.moneda} onChange={handleChange} /></label>
                        <label>{t.f.precio_unitario}<input type="number" step="0.01" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} required /></label>
                        <label>{t.f.stock}<input type="number" name="stock" value={form.stock} onChange={handleChange} /></label>
                        <label>{t.f.imagen_url}<input name="imagen_url" value={form.imagen_url} onChange={handleChange} /></label>
                        <label className="full">{t.f.descripcion}<textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} /></label>
                        <label>
                            <input type="checkbox" checked={!!form.activo} onChange={handleChange} name="activo" style={{ width: 'auto', marginRight: 6 }} />
                            {t.f.activo}
                        </label>
                    </div>
                    <div className="admin-vino-form-actions">
                        <button type="submit" className="btn-primary-sm" disabled={saving}>{saving ? t.saving : t.save}</button>
                        <button type="button" className="btn-link-edit" onClick={cancelForm}>{t.cancel}</button>
                    </div>
                </form>
            )}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.col.nombre}</th><th>{t.col.varietal}</th><th>{t.col.cosecha}</th>
                                <th>{t.col.precio}</th><th>{t.col.stock}</th><th>{t.col.activo}</th><th>{t.col.acciones}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vinos.map((v) => (
                                <tr key={v.id}>
                                    <td data-label={t.col.nombre}>{v.nombre}</td>
                                    <td data-label={t.col.varietal}>{v.varietal}</td>
                                    <td data-label={t.col.cosecha}>{v.cosecha}</td>
                                    <td data-label={t.col.precio}>{v.moneda} {Number(v.precio_unitario).toFixed(2)}</td>
                                    <td data-label={t.col.stock}>{v.stock}</td>
                                    <td data-label={t.col.activo}>{v.activo ? '✓' : '—'}</td>
                                    <td data-label={t.col.acciones} className="admin-row-actions">
                                        <button className="btn-link-edit" onClick={() => startEdit(v)}>{t.edit}</button>
                                        <button className="btn-link-edit danger" onClick={() => handleDelete(v.id)}>{t.delete}</button>
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

export default BodegaCatalogoTab;
