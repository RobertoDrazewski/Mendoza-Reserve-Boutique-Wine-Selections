import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { resolveBodegaImage } from '../../utils/resolveImage';

const ESTADOS = ['pendiente_contacto', 'contactada', 'activa', 'inactiva', 'rechazada'];
const DESCRIPCION_MAX = 1500;

const AdminBodegas = () => {
    const [bodegas, setBodegas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [uploadingId, setUploadingId] = useState(null);
    const [generandoId, setGenerandoId] = useState(null);
    const [msg, setMsg] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const fetchBodegas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/bodegas/admin`, { params: estadoFiltro ? { estado: estadoFiltro } : {} });
            setBodegas(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, estadoFiltro]);

    useEffect(() => { fetchBodegas(); }, [fetchBodegas]);

    const cambiarEstado = async (id, estado) => {
        setSavingId(id);
        try {
            await axios.patch(`${API_URL}/bodegas/${id}/estado`, { estado });
            setBodegas((prev) => prev.map((b) => (b.id === id ? { ...b, estado } : b)));
            setMsg({ type: 'ok', text: 'Estado actualizado.' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Error al cambiar estado.' });
        } finally {
            setSavingId(null);
        }
    };

    const openEdit = (bodega) => {
        setEditId(bodega.id);
        setEditForm({
            email: bodega.email || '', telefono: bodega.telefono || '', whatsapp: bodega.whatsapp || '',
            sitio_web: bodega.sitio_web || '', comision_pct: bodega.comision_pct || 12,
            descripcion: bodega.descripcion || '', logo_url: bodega.logo_url || '', imagen: bodega.imagen || '',
            contacto_nombre: bodega.contacto_nombre || '', notas: bodega.notas || ''
        });
    };

    const guardarEdit = async (id) => {
        setSavingId(id);
        try {
            await axios.put(`${API_URL}/bodegas/${id}`, editForm);
            setMsg({ type: 'ok', text: 'Bodega actualizada.' });
            setEditId(null);
            fetchBodegas();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar.' });
        } finally {
            setSavingId(null);
        }
    };

    const subirImagen = async (id, file) => {
        if (!file) return;
        setUploadingId(id);
        try {
            const data = new FormData();
            data.append('imagen', file);
            const res = await axios.post(`${API_URL}/bodegas/${id}/imagen`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditForm((prev) => ({ ...prev, imagen: res.data.imagen }));
            setBodegas((prev) => prev.map((b) => (b.id === id ? { ...b, imagen: res.data.imagen } : b)));
            setMsg({ type: 'ok', text: 'Foto subida con éxito.' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Error al subir la foto.' });
        } finally {
            setUploadingId(null);
        }
    };

    const generarBio = async (id) => {
        setGenerandoId(id);
        try {
            const res = await axios.post(`${API_URL}/bodegas/${id}/generar-bio`);
            setEditForm((prev) => ({ ...prev, descripcion: res.data.descripcion }));
            setMsg({ type: 'ok', text: 'Descripción generada — revisala y guardá los cambios para publicarla.' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Error al generar la descripción.' });
        } finally {
            setGenerandoId(null);
        }
    };

    const visibles = bodegas.filter((b) => !busqueda || b.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div>
            <div className="admin-toolbar">
                <input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="admin-count">{visibles.length} bodegas</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {loading ? <p>Cargando...</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nombre</th><th>Zona</th><th>Tel / Web</th><th>Comisión %</th><th>Estado</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((b) => (
                                <React.Fragment key={b.id}>
                                    <tr>
                                        <td data-label="Nombre">{b.nombre}</td>
                                        <td data-label="Zona">{b.zona || '—'}</td>
                                        <td className="admin-small" data-label="Tel / Web">{b.telefono || '—'}<br />{b.sitio_web ? <a href={b.sitio_web} target="_blank" rel="noreferrer">web</a> : '—'}</td>
                                        <td data-label="Comisión %">{b.comision_pct}%</td>
                                        <td data-label="Estado">
                                            <select
                                                value={b.estado}
                                                disabled={savingId === b.id}
                                                onChange={(e) => cambiarEstado(b.id, e.target.value)}
                                            >
                                                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                                            </select>
                                        </td>
                                        <td data-label="Acciones">
                                            <button className="btn-link-edit" onClick={() => (editId === b.id ? setEditId(null) : openEdit(b))}>
                                                {editId === b.id ? 'Cerrar' : 'Editar'}
                                            </button>
                                        </td>
                                    </tr>
                                    {editId === b.id && (
                                        <tr className="admin-edit-row">
                                            <td colSpan={6}>
                                                <div className="admin-foto-row">
                                                    <div className="admin-foto-preview">
                                                        {editForm.imagen ? (
                                                            <img
                                                                src={resolveBodegaImage(editForm.imagen)}
                                                                alt={b.nombre}
                                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/logo.jpg'; }}
                                                            />
                                                        ) : (
                                                            <span className="admin-foto-preview-vacia">Sin foto</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="btn-primary-sm admin-foto-btn">
                                                            {uploadingId === b.id ? 'Subiendo...' : 'Subir foto a mano'}
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                hidden
                                                                disabled={uploadingId === b.id}
                                                                onChange={(e) => subirImagen(b.id, e.target.files[0])}
                                                            />
                                                        </label>
                                                        <p className="admin-small">JPG, PNG o WEBP, hasta 6MB. Reemplaza la foto actual de esta bodega.</p>
                                                    </div>
                                                </div>

                                                <div className="admin-edit-grid">
                                                    <label>Email<input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label>
                                                    <label>Teléfono<input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} /></label>
                                                    <label>WhatsApp<input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} /></label>
                                                    <label>Sitio web<input value={editForm.sitio_web} onChange={(e) => setEditForm({ ...editForm, sitio_web: e.target.value })} /></label>
                                                    <label>Contacto<input value={editForm.contacto_nombre} onChange={(e) => setEditForm({ ...editForm, contacto_nombre: e.target.value })} /></label>
                                                    <label>Comisión %<input type="number" step="0.5" value={editForm.comision_pct} onChange={(e) => setEditForm({ ...editForm, comision_pct: e.target.value })} /></label>
                                                    <label>Logo URL<input value={editForm.logo_url} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} /></label>
                                                    <label>Imagen (archivo en /images o URL completa)<input value={editForm.imagen} onChange={(e) => setEditForm({ ...editForm, imagen: e.target.value })} /></label>
                                                    <label className="full">
                                                        <span className="admin-label-row">
                                                            Descripción
                                                            <button
                                                                type="button"
                                                                className="btn-link-edit"
                                                                disabled={generandoId === b.id}
                                                                onClick={() => generarBio(b.id)}
                                                            >
                                                                {generandoId === b.id ? 'Generando...' : '✨ Generar con IA'}
                                                            </button>
                                                        </span>
                                                        <textarea
                                                            rows={4}
                                                            maxLength={DESCRIPCION_MAX}
                                                            value={editForm.descripcion}
                                                            onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                                                        />
                                                        <span className="admin-char-count">{(editForm.descripcion || '').length} / {DESCRIPCION_MAX}</span>
                                                    </label>
                                                    <label className="full">Notas internas<textarea rows={2} value={editForm.notas} onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })} /></label>
                                                </div>
                                                <button className="btn-primary-sm" disabled={savingId === b.id} onClick={() => guardarEdit(b.id)}>
                                                    {savingId === b.id ? 'Guardando...' : 'Guardar cambios'}
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminBodegas;
