import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { resolveBodegaImage } from '../utils/resolveImage';
import '../styles/BodegasLista.css';

const BodegasLista = () => {
    const [bodegas, setBodegas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zonaFiltro, setZonaFiltro] = useState('');
    const { lang } = useLanguage();

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const t = {
        es: {
            title: 'Nuestras Bodegas',
            subtitle: 'Productores boutique de Mendoza, seleccionados para exportar directo al Reino Unido.',
            loading: 'Cargando selección...',
            error: 'Error de conexión.',
            viewMore: 'Conocer Bodega',
            phone: 'Tel:',
            address: 'Dir:',
            allZones: 'Todas las zonas',
            empty: 'Todavía no hay bodegas activas para mostrar. Estamos incorporando nuevos productores.'
        },
        en: {
            title: 'Our Wineries',
            subtitle: 'Boutique Mendoza producers, selected to export directly to the UK.',
            loading: 'Loading selection...',
            error: 'Connection error.',
            viewMore: 'View Winery',
            phone: 'Phone:',
            address: 'Addr:',
            allZones: 'All zones',
            empty: 'No active wineries to show yet. We are onboarding new producers.'
        }
    };
    const currentT = t[lang] || t['es'];

    useEffect(() => {
        const fetchBodegas = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/bodegas`);
                const data = Array.isArray(res.data) ? res.data : [];
                setBodegas(data);
            } catch (err) {
                console.error('Error al cargar bodegas:', err);
                setError(currentT.error);
            } finally {
                setLoading(false);
            }
        };
        fetchBodegas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL]);

    const zonas = useMemo(() => {
        const set = new Set(bodegas.map((b) => b.zona).filter(Boolean));
        return Array.from(set).sort();
    }, [bodegas]);

    const visibles = zonaFiltro ? bodegas.filter((b) => b.zona === zonaFiltro) : bodegas;

    if (loading) return (
        <div className="status-message" style={{ backgroundImage: "url('/images/fondo-historia.png')" }}>
            <span className="status-message-text">{currentT.loading}</span>
        </div>
    );
    if (error) return (
        <div className="status-message error" style={{ backgroundImage: "url('/images/fondo-historia.png')" }}>
            <span className="status-message-text">{error}</span>
        </div>
    );

    return (
        <div className="bodegas-page" style={{ backgroundImage: "url('/images/fondo-historia.png')" }}>
            {/* La foto de fondo cubre toda la página (de punta a punta, hasta el
                footer) con "background-attachment: fixed", así que su tamaño se
                calcula contra la ventana y no contra el alto del contenido —
                nunca se deforma, aunque la grilla de bodegas de abajo crezca
                mucho. */}
            <div className="bodegas-hero-inner">
                <h1>{currentT.title}</h1>
                <p className="bodegas-subtitle">{currentT.subtitle}</p>

                {zonas.length > 1 && (
                    <div className="zona-filtro">
                        <button className={!zonaFiltro ? 'active' : ''} onClick={() => setZonaFiltro('')}>
                            {currentT.allZones}
                        </button>
                        {zonas.map((z) => (
                            <button key={z} className={zonaFiltro === z ? 'active' : ''} onClick={() => setZonaFiltro(z)}>
                                {z}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="bodegas-container">
            {visibles.length === 0 ? (
                <p className="bodegas-empty">{currentT.empty}</p>
            ) : (
                <div className="bodegas-grid">
                    {visibles.map((item) => (
                        <div key={item.id} className="bodega-card">
                            <div className="bodega-image-wrapper">
                                {item.imagen ? (
                                    <img
                                        src={resolveBodegaImage(item.imagen)}
                                        alt={item.nombre}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/logo.jpg';
                                        }}
                                    />
                                ) : (
                                    <div className="bodega-placeholder">
                                        <span>{item.nombre?.charAt(0) || 'M'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-content">
                                <h3 className="bodega-name">{item.nombre}</h3>
                                {item.zona && <p className="bodega-zona">{item.zona}{item.subzona ? ` · ${item.subzona}` : ''}</p>}
                                <div className="contact-details">
                                    {item.telefono && <p><strong>{currentT.phone}</strong> {item.telefono}</p>}
                                    {item.direccion && <p><strong>{currentT.address}</strong> {item.direccion}</p>}
                                </div>
                                <Link to={`/bodega/${item.slug || item.id}`} className="btn-conocer">
                                    {currentT.viewMore}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
};

export default BodegasLista;
