import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { resolveBodegaImage } from '../../utils/resolveImage';
import { useLanguage } from '../../context/LanguageContext';

const ESTADOS = ['pendiente_contacto', 'contactada', 'activa', 'inactiva', 'rechazada'];
const DESCRIPCION_MAX = 1500;

const T = {
    es: {
        searchPlaceholder: 'Buscar por nombre...', allStates: 'Todos los estados', bodegas: 'bodegas',
        loading: 'Cargando...', close: 'Cerrar', edit: 'Editar',
        okStateUpdated: 'Estado actualizado.', errorState: 'Error al cambiar estado.',
        okSaved: 'Bodega actualizada.', errorSave: 'Error al guardar.',
        okPhoto: 'Foto subida con éxito.', errorPhoto: 'Error al subir la foto.',
        okBioBoth: 'Descripción generada en español e inglés — revisalas y guardá los cambios para publicarlas.',
        okBioEsOnly: 'Descripción generada en español — la versión en inglés no se pudo generar, completala a mano si querés.',
        errorBio: 'Error al generar la descripción.',
        col: { nombre: 'Nombre', zona: 'Zona', telWeb: 'Tel / Web', comision: 'Comisión %', estado: 'Estado' },
        noPhoto: 'Sin foto', uploading: 'Subiendo...', uploadPhoto: 'Subir foto a mano',
        photoHint: 'JPG, PNG o WEBP, hasta 6MB. Reemplaza la foto actual de esta bodega.',
        f: {
            email: 'Email', telefono: 'Teléfono', whatsapp: 'WhatsApp', sitio_web: 'Sitio web',
            contacto: 'Contacto', comision: 'Comisión %', logo: 'Logo URL',
            imagen: 'Imagen (archivo en /images o URL completa)', descEs: 'Descripción (Español)',
            descEn: 'Descripción (English)', notas: 'Notas internas'
        },
        generating: 'Generando...', generateAi: '✨ Generar con IA (ES + EN)',
        descEnPlaceholder: "Se completa junto con la de arriba al usar 'Generar con IA', o escribila / corregila a mano.",
        saving: 'Guardando...', save: 'Guardar cambios', web: 'web'
    },
    en: {
        searchPlaceholder: 'Search by name...', allStates: 'All statuses', bodegas: 'wineries',
        loading: 'Loading...', close: 'Close', edit: 'Edit',
        okStateUpdated: 'Status updated.', errorState: 'Error changing status.',
        okSaved: 'Winery updated.', errorSave: 'Error saving.',
        okPhoto: 'Photo uploaded successfully.', errorPhoto: 'Error uploading the photo.',
        okBioBoth: 'Description generated in Spanish and English — review them and save the changes to publish them.',
        okBioEsOnly: 'Description generated in Spanish — the English version could not be generated, fill it in by hand if you want.',
        errorBio: 'Error generating the description.',
        col: { nombre: 'Name', zona: 'Region', telWeb: 'Phone / Web', comision: 'Commission %', estado: 'Status' },
        noPhoto: 'No photo', uploading: 'Uploading...', uploadPhoto: 'Upload photo by hand',
        photoHint: 'JPG, PNG or WEBP, up to 6MB. Replaces this winery\'s current photo.',
        f: {
            email: 'Email', telefono: 'Phone', whatsapp: 'WhatsApp', sitio_web: 'Website',
            contacto: 'Contact', comision: 'Commission %', logo: 'Logo URL',
            imagen: 'Image (file under /images or full URL)', descEs: 'Description (Spanish)',
            descEn: 'Description (English)', notas: 'Internal notes'
        },
        generating: 'Generating...', generateAi: '✨ Generate with AI (ES + EN)',
        descEnPlaceholder: "Filled in together with the one above when using 'Generate with AI', or write/correct it by hand.",
        saving: 'Saving...', save: 'Save changes', web: 'website'
    }
};

const AdminBodegas = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
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
            setMsg({ type: 'ok', text: t.okStateUpdated });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorState });
        } finally {
            setSavingId(null);
        }
    };

    const openEdit = (bodega) => {
        setEditId(bodega.id);
        setEditForm({
            email: bodega.email || '', telefono: bodega.telefono || '', whatsapp: bodega.whatsapp || '',
            sitio_web: bodega.sitio_web || '', comision_pct: bodega.comision_pct || 12,
            descripcion: bodega.descripcion || '', descripcion_en: bodega.descripcion_en || '',
            logo_url: bodega.logo_url || '', imagen: bodega.imagen || '',
            contacto_nombre: bodega.contacto_nombre || '', notas: bodega.notas || ''
        });
    };

    const guardarEdit = async (id) => {
        setSavingId(id);
        try {
            await axios.put(`${API_URL}/bodegas/${id}`, editForm);
            setMsg({ type: 'ok', text: t.okSaved });
            setEditId(null);
            fetchBodegas();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorSave });
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
            setMsg({ type: 'ok', text: t.okPhoto });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorPhoto });
        } finally {
            setUploadingId(null);
        }
    };

    const generarBio = async (id) => {
        setGenerandoId(id);
        try {
            const res = await axios.post(`${API_URL}/bodegas/${id}/generar-bio`);
            setEditForm((prev) => ({ ...prev, descripcion: res.data.descripcion, descripcion_en: res.data.descripcion_en || prev.descripcion_en }));
            setMsg({ type: 'ok', text: res.data.descripcion_en ? t.okBioBoth : t.okBioEsOnly });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || t.errorBio });
        } finally {
            setGenerandoId(null);
        }
    };

    const visibles = bodegas.filter((b) => !busqueda || b.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div>
            <div className="admin-toolbar">
                <input placeholder={t.searchPlaceholder} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">{t.allStates}</option>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="admin-count">{visibles.length} {t.bodegas}</span>
            </div>

            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}

            {loading ? <p>{t.loading}</p> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.col.nombre}</th><th>{t.col.zona}</th><th>{t.col.telWeb}</th><th>{t.col.comision}</th><th>{t.col.estado}</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((b) => (
                                <React.Fragment key={b.id}>
                                    <tr>
                                        <td data-label={t.col.nombre}>{b.nombre}</td>
                                        <td data-label={t.col.zona}>{b.zona || '—'}</td>
                                        <td className="admin-small" data-label={t.col.telWeb}>{b.telefono || '—'}<br />{b.sitio_web ? <a href={b.sitio_web} target="_blank" rel="noreferrer">{t.web}</a> : '—'}</td>
                                        <td data-label={t.col.comision}>{b.comision_pct}%</td>
                                        <td data-label={t.col.estado}>
                                            <select
                                                value={b.estado}
                                                disabled={savingId === b.id}
                                                onChange={(e) => cambiarEstado(b.id, e.target.value)}
                                            >
                                                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                                            </select>
                                        </td>
                                        <td data-label="—">
                                            <button className="btn-link-edit" onClick={() => (editId === b.id ? setEditId(null) : openEdit(b))}>
                                                {editId === b.id ? t.close : t.edit}
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
                                                            <span className="admin-foto-preview-vacia">{t.noPhoto}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="btn-primary-sm admin-foto-btn">
                                                            {uploadingId === b.id ? t.uploading : t.uploadPhoto}
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                hidden
                                                                disabled={uploadingId === b.id}
                                                                onChange={(e) => subirImagen(b.id, e.target.files[0])}
                                                            />
                                                        </label>
                                                        <p className="admin-small">{t.photoHint}</p>
                                                    </div>
                                                </div>

                                                <div className="admin-edit-grid">
                                                    <label>{t.f.email}<input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label>
                                                    <label>{t.f.telefono}<input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} /></label>
                                                    <label>{t.f.whatsapp}<input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} /></label>
                                                    <label>{t.f.sitio_web}<input value={editForm.sitio_web} onChange={(e) => setEditForm({ ...editForm, sitio_web: e.target.value })} /></label>
                                                    <label>{t.f.contacto}<input value={editForm.contacto_nombre} onChange={(e) => setEditForm({ ...editForm, contacto_nombre: e.target.value })} /></label>
                                                    <label>{t.f.comision}<input type="number" step="0.5" value={editForm.comision_pct} onChange={(e) => setEditForm({ ...editForm, comision_pct: e.target.value })} /></label>
                                                    <label>{t.f.logo}<input value={editForm.logo_url} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} /></label>
                                                    <label>{t.f.imagen}<input value={editForm.imagen} onChange={(e) => setEditForm({ ...editForm, imagen: e.target.value })} /></label>
                                                    <label className="full">
                                                        <span className="admin-label-row">
                                                            {t.f.descEs}
                                                            <button
                                                                type="button"
                                                                className="btn-link-edit"
                                                                disabled={generandoId === b.id}
                                                                onClick={() => generarBio(b.id)}
                                                            >
                                                                {generandoId === b.id ? t.generating : t.generateAi}
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
                                                    <label className="full">
                                                        <span className="admin-label-row">
                                                            {t.f.descEn}
                                                        </span>
                                                        <textarea
                                                            rows={4}
                                                            maxLength={DESCRIPCION_MAX}
                                                            placeholder={t.descEnPlaceholder}
                                                            value={editForm.descripcion_en}
                                                            onChange={(e) => setEditForm({ ...editForm, descripcion_en: e.target.value })}
                                                        />
                                                        <span className="admin-char-count">{(editForm.descripcion_en || '').length} / {DESCRIPCION_MAX}</span>
                                                    </label>
                                                    <label className="full">{t.f.notas}<textarea rows={2} value={editForm.notas} onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })} /></label>
                                                </div>
                                                <button className="btn-primary-sm" disabled={savingId === b.id} onClick={() => guardarEdit(b.id)}>
                                                    {savingId === b.id ? t.saving : t.save}
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
