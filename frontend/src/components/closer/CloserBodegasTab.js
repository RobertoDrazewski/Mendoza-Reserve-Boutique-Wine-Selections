import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    es: { loading: 'Cargando...', empty: 'Todavía no hay bodegas activas en la red.', visitSite: 'Sitio web' },
    en: { loading: 'Loading...', empty: 'There are no active wineries in the network yet.', visitSite: 'Website' }
};

const CloserBodegasTab = () => {
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const [bodegas, setBodegas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/closer/bodegas`).then((res) => setBodegas(res.data))
            .catch(console.error).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <p>{t.loading}</p>;

    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr><th>Bodega</th><th>Zona</th><th>{lang === 'en' ? 'Description' : 'Descripción'}</th><th>{t.visitSite}</th></tr>
                </thead>
                <tbody>
                    {bodegas.map((b) => (
                        <tr key={b.id}>
                            <td>{b.nombre}</td>
                            <td>{[b.zona, b.subzona].filter(Boolean).join(' — ')}</td>
                            <td className="admin-small">{(lang === 'en' ? b.descripcion_en : b.descripcion) || '—'}</td>
                            <td>{b.sitio_web ? <a href={b.sitio_web} target="_blank" rel="noreferrer">{t.visitSite}</a> : '—'}</td>
                        </tr>
                    ))}
                    {bodegas.length === 0 && <tr><td colSpan={4}>{t.empty}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default CloserBodegasTab;
