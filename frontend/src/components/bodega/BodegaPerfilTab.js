import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    es: {
        loading: 'Cargando...', save: 'Guardar cambios', saving: 'Guardando...',
        ok: 'Perfil actualizado con éxito.', error: 'Error al actualizar el perfil.',
        estado: 'Estado', estadoNota: 'El estado y la comisión los define Mendoza Reserve al activar tu bodega — si tenés dudas, escribinos.',
        fields: {
            zona: 'Zona', subzona: 'Sub-zona', direccion: 'Dirección', telefono: 'Teléfono',
            whatsapp: 'WhatsApp', sitio_web: 'Sitio web', contacto_nombre: 'Persona de contacto',
            descripcion: 'Descripción (español)', descripcion_en: 'Descripción (inglés)'
        }
    },
    en: {
        loading: 'Loading...', save: 'Save changes', saving: 'Saving...',
        ok: 'Profile updated successfully.', error: 'Error updating the profile.',
        estado: 'Status', estadoNota: 'Status and commission are set by Mendoza Reserve when your winery is activated — reach out if you have questions.',
        fields: {
            zona: 'Region', subzona: 'Sub-region', direccion: 'Address', telefono: 'Phone',
            whatsapp: 'WhatsApp', sitio_web: 'Website', contacto_nombre: 'Contact person',
            descripcion: 'Description (Spanish)', descripcion_en: 'Description (English)'
        }
    }
};

const CAMPOS = ['zona', 'subzona', 'direccion', 'telefono', 'whatsapp', 'sitio_web', 'contacto_nombre', 'descripcion', 'descripcion_en'];

const BodegaPerfilTab = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [bodega, setBodega] = useState(null);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/bodega/perfil`).then((res) => {
            setBodega(res.data);
            const f = {};
            CAMPOS.forEach((c) => { f[c] = res.data[c] || ''; });
            setForm(f);
        }).catch(console.error).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await axios.put(`${API_URL}/bodega/perfil`, form);
            setMsg({ type: 'ok', text: t.ok });
        } catch (err) {
            setMsg({ type: 'error', text: t.error });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>{t.loading}</p>;

    return (
        <div>
            {bodega && (
                <p className="admin-small">
                    <strong>{bodega.nombre}</strong> — {t.estado}: <strong>{bodega.estado}</strong>
                    <br />{t.estadoNota}
                </p>
            )}
            {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}
            <form onSubmit={handleSubmit} className="admin-vino-form">
                <div className="admin-edit-grid">
                    {CAMPOS.map((campo) => (
                        <label key={campo} className={campo.startsWith('descripcion') ? 'full' : ''}>
                            {t.fields[campo]}
                            {campo.startsWith('descripcion') ? (
                                <textarea name={campo} value={form[campo] || ''} onChange={handleChange} rows={3} />
                            ) : (
                                <input name={campo} value={form[campo] || ''} onChange={handleChange} />
                            )}
                        </label>
                    ))}
                </div>
                <div className="admin-vino-form-actions">
                    <button type="submit" className="btn-primary-sm" disabled={saving}>
                        {saving ? t.saving : t.save}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BodegaPerfilTab;
