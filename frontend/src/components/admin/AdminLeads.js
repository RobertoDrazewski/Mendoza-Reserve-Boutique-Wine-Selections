import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

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

const AdminLeads = () => {
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
        if (!form.negocio) { setMsg({ type: 'error', text: 'El nombre del negocio es obligatorio.' }); return; }
        try {
            await axios.post(`${API_URL}/leads`, form);
            setMsg({ type: 'ok', text: 'Lead agregado.' });
            setForm(emptyForm);
            setShowForm(false);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al crear el lead.' });
        }
    };

    const cambiarEstado = async (id, estado) => {
        try {
            await axios.put(`${API_URL}/leads/${id}`, { estado });
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al actualizar.' });
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar este lead?')) return;
        try {
            await axios.delete(`${API_URL}/leads/${id}`);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al eliminar.' });
        }
    };

    const importarCSV = async () => {
        const parsed = parseCSV(csvText);
        if (parsed.length === 0) {
            setMsg({ type: 'error', text: 'No se pudo leer ningún lead. Revisá el formato del CSV (primera fila = encabezados).' });
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/leads/bulk`, { leads: parsed });
            setMsg({ type: 'ok', text: res.data.message });
            setCsvText('');
            setShowCsv(false);
            fetchLeads();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al importar el CSV.' });
        }
    };

    return (
        <div>
            <div className="admin-toolbar">
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button className="btn-primary-sm" onClick={() => { setShowForm(!showForm); setShowCsv(false); }}>+ Agregar lead</button>
                <button className="btn-primary-sm" onClick={() => { setShowCsv(!showCsv); setShowForm(false); }}>Importar CSV</button>
                <span className="admin-count">{leads.length} leads</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {showForm && (
                <div className="admin-edit-grid admin-vino-form">
                    <label>Negocio *<input value={form.negocio} onChange={(e) => setForm({ ...form, negocio: e.target.value })} /></label>
                    <label>Contacto<input value={form.nombre_contacto} onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} /></label>
                    <label>Tipo
                        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                    <label>Teléfono<input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
                    <label>Ciudad<input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></label>
                    <label>Sitio web<input value={form.sitio_web} onChange={(e) => setForm({ ...form, sitio_web: e.target.value })} /></label>
                    <label className="full">Notas<textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
                    <div className="admin-vino-form-actions">
                        <button className="btn-primary-sm" onClick={crearLead}>Guardar lead</button>
                    </div>
                </div>
            )}

            {showCsv && (
                <div className="admin-csv-import">
                    <p>Pegá un CSV con encabezados: <code>nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas</code></p>
                    <textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={'nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas\nMaria Lopez,El Gaucho,restaurante,maria@elgaucho.co.uk,,London,,'} />
                    <button className="btn-primary-sm" onClick={importarCSV}>Importar</button>
                </div>
            )}

            {loading ? <p>Cargando...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Negocio</th><th>Contacto</th><th>Tipo</th><th>Email / Tel</th><th>Ciudad</th><th>Estado</th><th></th></tr></thead>
                        <tbody>
                            {leads.map((l) => (
                                <tr key={l.id}>
                                    <td>{l.negocio}</td>
                                    <td>{l.nombre_contacto || '—'}</td>
                                    <td>{l.tipo}</td>
                                    <td className="admin-small">{l.email || '—'}<br />{l.telefono || ''}</td>
                                    <td>{l.ciudad || '—'}</td>
                                    <td>
                                        <select value={l.estado} onChange={(e) => cambiarEstado(l.id, e.target.value)}>
                                            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </td>
                                    <td><button className="btn-link-edit danger" onClick={() => eliminar(l.id)}>Eliminar</button></td>
                                </tr>
                            ))}
                            {leads.length === 0 && <tr><td colSpan={7}>Todavía no cargaste leads.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminLeads;
