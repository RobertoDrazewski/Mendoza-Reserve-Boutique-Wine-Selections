import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const TIPOS = ['restaurante', 'importador', 'tienda', 'distribuidor', 'otro'];
const ESTADOS = ['no_contactado', 'contactado', 'interesado', 'cliente', 'descartado'];
const emptyForm = { nombre_contacto: '', negocio: '', tipo: 'restaurante', email: '', telefono: '', ciudad: '', sitio_web: '', notas: '' };

const T = {
    es: {
        addNew: '+ Agregar restaurante / comprador', cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando...',
        loading: 'Cargando...', empty: 'Todavía no cargaste ningún lead.',
        col: { negocio: 'Negocio', tipo: 'Tipo', ciudad: 'Ciudad', contacto: 'Contacto', estado: 'Estado', acciones: 'Acciones' },
        f: { nombre_contacto: 'Persona de contacto', negocio: 'Nombre del negocio', tipo: 'Tipo', email: 'Email', telefono: 'Teléfono', ciudad: 'Ciudad', sitio_web: 'Sitio web', notas: 'Notas' },
        okCreate: 'Lead agregado.', okUpdate: 'Estado actualizado.', errorGeneric: 'Ocurrió un error.',
        allFilter: 'Todos los estados'
    },
    en: {
        addNew: '+ Add restaurant / buyer', cancel: 'Cancel', save: 'Save', saving: 'Saving...',
        loading: 'Loading...', empty: 'You haven’t added any leads yet.',
        col: { negocio: 'Business', tipo: 'Type', ciudad: 'City', contacto: 'Contact', estado: 'Status', acciones: 'Actions' },
        f: { nombre_contacto: 'Contact person', negocio: 'Business name', tipo: 'Type', email: 'Email', telefono: 'Phone', ciudad: 'City', sitio_web: 'Website', notas: 'Notes' },
        okCreate: 'Lead added.', okUpdate: 'Status updated.', errorGeneric: 'Something went wrong.',
        allFilter: 'All statuses'
    }
};

const CloserLeadsTab = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [msg, setMsg] = useState(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = estadoFiltro ? { estado: estadoFiltro } : {};
            const res = await axios.get(`${API_URL}/closer/leads`, { params });
            setLeads(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estadoFiltro]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await axios.post(`${API_URL}/closer/leads`, form);
            setMsg({ type: 'ok', text: t.okCreate });
            setForm(emptyForm);
            setShowNew(false);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorGeneric });
        } finally {
            setSaving(false);
        }
    };

    const cambiarEstado = async (id, estado) => {
        setSavingId(id);
        try {
            await axios.put(`${API_URL}/closer/leads/${id}`, { estado });
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
            setMsg({ type: 'ok', text: t.okUpdate });
        } catch (err) {
            setMsg({ type: 'error', text: t.errorGeneric });
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <button className="btn-primary-sm" onClick={() => setShowNew(!showNew)}>{t.addNew}</button>
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">{t.allFilter}</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="admin-count">{leads.length}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {showNew && (
                <form onSubmit={handleSubmit} className="admin-vino-form">
                    <div className="admin-edit-grid">
                        <label>{t.f.negocio}<input name="negocio" value={form.negocio} onChange={handleChange} required /></label>
                        <label>{t.f.nombre_contacto}<input name="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} /></label>
                        <label>{t.f.tipo}
                            <select name="tipo" value={form.tipo} onChange={handleChange}>
                                {TIPOS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                            </select>
                        </label>
                        <label>{t.f.email}<input type="email" name="email" value={form.email} onChange={handleChange} /></label>
                        <label>{t.f.telefono}<input name="telefono" value={form.telefono} onChange={handleChange} /></label>
                        <label>{t.f.ciudad}<input name="ciudad" value={form.ciudad} onChange={handleChange} /></label>
                        <label>{t.f.sitio_web}<input name="sitio_web" value={form.sitio_web} onChange={handleChange} /></label>
                        <label className="full">{t.f.notas}<textarea name="notas" value={form.notas} onChange={handleChange} rows={2} /></label>
                    </div>
                    <div className="admin-vino-form-actions">
                        <button type="submit" className="btn-primary-sm" disabled={saving}>{saving ? t.saving : t.save}</button>
                        <button type="button" className="btn-link-edit" onClick={() => setShowNew(false)}>{t.cancel}</button>
                    </div>
                </form>
            )}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.col.negocio}</th><th>{t.col.tipo}</th><th>{t.col.ciudad}</th>
                                <th>{t.col.contacto}</th><th>{t.col.estado}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((l) => (
                                <tr key={l.id}>
                                    <td data-label={t.col.negocio}>{l.negocio}</td>
                                    <td data-label={t.col.tipo}>{l.tipo}</td>
                                    <td data-label={t.col.ciudad}>{l.ciudad}</td>
                                    <td className="admin-small" data-label={t.col.contacto}>{l.nombre_contacto}<br />{l.email}</td>
                                    <td data-label={t.col.estado}>
                                        <select disabled={savingId === l.id} value={l.estado} onChange={(e) => cambiarEstado(l.id, e.target.value)}>
                                            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {leads.length === 0 && <tr><td colSpan={5}>{t.empty}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CloserLeadsTab;
