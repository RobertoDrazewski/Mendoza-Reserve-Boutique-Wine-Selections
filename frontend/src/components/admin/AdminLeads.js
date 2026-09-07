import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const TIPOS = ['restaurante', 'importador', 'tienda', 'distribuidor', 'otro'];
const ESTADOS = ['no_contactado', 'contactado', 'interesado', 'cliente', 'descartado'];
const emptyForm = { nombre_contacto: '', negocio: '', tipo: 'restaurante', email: '', telefono: '', ciudad: '', sitio_web: '', notas: '' };

// Parser CSV simple: primera fila = encabezados (nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas)
function parseCSV(text) {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
    });
}

const T = {
    es: {
        allStates: 'Todos los estados', addLead: '+ Agregar lead', importCsv: 'Importar CSV',
        leads: 'leads', loading: 'Cargando...',
        negocioRequired: 'El nombre del negocio es obligatorio.', okAdded: 'Lead agregado.',
        errorCreate: 'Error al crear el lead.', errorUpdate: 'Error al actualizar.', errorDelete: 'Error al eliminar.',
        confirmDelete: '¿Eliminar este lead?', csvParseError: 'No se pudo leer ningún lead. Revisá el formato del CSV (primera fila = encabezados).',
        errorImport: 'Error al importar el CSV.', csvHint: 'Pegá un CSV con encabezados:', importBtn: 'Importar',
        f: { negocio: 'Negocio *', contacto: 'Contacto', tipo: 'Tipo', email: 'Email', telefono: 'Teléfono', ciudad: 'Ciudad', web: 'Sitio web', notas: 'Notas' },
        saveLead: 'Guardar lead',
        col: { negocio: 'Negocio', contacto: 'Contacto', tipo: 'Tipo', emailTel: 'Email / Tel', ciudad: 'Ciudad', estado: 'Estado' },
        empty: 'Todavía no cargaste leads.', delete: 'Eliminar'
    },
    en: {
        allStates: 'All statuses', addLead: '+ Add lead', importCsv: 'Import CSV',
        leads: 'leads', loading: 'Loading...',
        negocioRequired: 'The business name is required.', okAdded: 'Lead added.',
        errorCreate: 'Error creating the lead.', errorUpdate: 'Error updating.', errorDelete: 'Error deleting.',
        confirmDelete: 'Delete this lead?', csvParseError: 'No leads could be read. Check the CSV format (first row = headers).',
        errorImport: 'Error importing the CSV.', csvHint: 'Paste a CSV with headers:', importBtn: 'Import',
        f: { negocio: 'Business *', contacto: 'Contact', tipo: 'Type', email: 'Email', telefono: 'Phone', ciudad: 'City', web: 'Website', notas: 'Notes' },
        saveLead: 'Save lead',
        col: { negocio: 'Business', contacto: 'Contact', tipo: 'Type', emailTel: 'Email / Phone', ciudad: 'City', estado: 'Status' },
        empty: 'No leads added yet.', delete: 'Delete'
    }
};

const AdminLeads = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [csvText, setCsvText] = useState('');
    const [showCsv, setShowCsv] = useState(false);
    const [msg, setMsg] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/leads`, { params: estadoFiltro ? { estado: estadoFiltro } : {} });
            setLeads(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, estadoFiltro]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const crearLead = async () => {
        if (!form.negocio) { setMsg({ type: 'error', text: t.negocioRequired }); return; }
        try {
            await axios.post(`${API_URL}/leads`, form);
            setMsg({ type: 'ok', text: t.okAdded });
            setForm(emptyForm);
            setShowForm(false);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorCreate });
        }
    };

    const cambiarEstado = async (id, estado) => {
        try {
            await axios.put(`${API_URL}/leads/${id}`, { estado });
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
        } catch (err) {
            setMsg({ type: 'error', text: t.errorUpdate });
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm(t.confirmDelete)) return;
        try {
            await axios.delete(`${API_URL}/leads/${id}`);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorDelete });
        }
    };

    const importarCSV = async () => {
        const parsed = parseCSV(csvText);
        if (parsed.length === 0) {
            setMsg({ type: 'error', text: t.csvParseError });
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/leads/bulk`, { leads: parsed });
            setMsg({ type: 'ok', text: res.data.message });
            setCsvText('');
            setShowCsv(false);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: t.errorImport });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">{t.allStates}</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button className="btn-primary-sm" onClick={() => { setShowForm(!showForm); setShowCsv(false); }}>{t.addLead}</button>
                <button className="btn-primary-sm" onClick={() => { setShowCsv(!showCsv); setShowForm(false); }}>{t.importCsv}</button>
                <span className="admin-count">{leads.length} {t.leads}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {showForm && (
                <div className="admin-edit-grid admin-vino-form">
                    <label>{t.f.negocio}<input value={form.negocio} onChange={(e) => setForm({ ...form, negocio: e.target.value })} /></label>
                    <label>{t.f.contacto}<input value={form.nombre_contacto} onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} /></label>
                    <label>{t.f.tipo}
                        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                            {TIPOS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                    </label>
                    <label>{t.f.email}<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                    <label>{t.f.telefono}<input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
                    <label>{t.f.ciudad}<input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></label>
                    <label>{t.f.web}<input value={form.sitio_web} onChange={(e) => setForm({ ...form, sitio_web: e.target.value })} /></label>
                    <label className="full">{t.f.notas}<textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
                    <div className="admin-vino-form-actions">
                        <button className="btn-primary-sm" onClick={crearLead}>{t.saveLead}</button>
                    </div>
                </div>
            )}

            {showCsv && (
                <div className="admin-csv-import">
                    <p>{t.csvHint} <code>nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas</code></p>
                    <textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={'nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas\nMaria Lopez,El Gaucho,restaurante,maria@elgaucho.co.uk,,London,,'} />
                    <button className="btn-primary-sm" onClick={importarCSV}>{t.importBtn}</button>
                </div>
            )}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>{t.col.negocio}</th><th>{t.col.contacto}</th><th>{t.col.tipo}</th><th>{t.col.emailTel}</th><th>{t.col.ciudad}</th><th>{t.col.estado}</th><th></th></tr></thead>
                        <tbody>
                            {leads.map((l) => (
                                <tr key={l.id}>
                                    <td data-label={t.col.negocio}>{l.negocio}</td>
                                    <td data-label={t.col.contacto}>{l.nombre_contacto || '—'}</td>
                                    <td data-label={t.col.tipo}>{l.tipo}</td>
                                    <td className="admin-small" data-label={t.col.emailTel}>{l.email || '—'}<br />{l.telefono || ''}</td>
                                    <td data-label={t.col.ciudad}>{l.ciudad || '—'}</td>
                                    <td data-label={t.col.estado}>
                                        <select value={l.estado} onChange={(e) => cambiarEstado(l.id, e.target.value)}>
                                            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </td>
                                    <td data-label="—"><button className="btn-link-edit danger" onClick={() => eliminar(l.id)}>{t.delete}</button></td>
                                </tr>
                            ))}
                            {leads.length === 0 && <tr><td colSpan={7}>{t.empty}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminLeads;
