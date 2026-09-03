import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Vinos.css';

const Vinos = () => {
    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [added, setAdded] = useState(null);
    const [bodegaFiltro, setBodegaFiltro] = useState('');

    const { addToCart } = useCart();
    const { lang } = useLanguage();

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    const t = {
        es: {
            title: 'Nuestra Cava',
            subtitle: 'Vinos de bodegas boutique de Mendoza, listos para exportar a Reino Unido.',
            loading: 'Descorchando selección...',
            error: 'Error al conectar con la cava.',
            addCart: 'Agregar al carrito',
            added: 'Agregado ✓',
            noWines: 'Todavía no hay vinos publicados. Vuelve pronto.',
            allWineries: 'Todas las bodegas',
            box6: 'Caja x6', box12: 'Caja x12', bottle: 'Botella'
        },
        en: {
            title: 'Our Cellar',
            subtitle: 'Wines from boutique Mendoza wineries, ready to export to the UK.',
            loading: 'Uncorking selection...',
            error: 'Error connecting to the cellar.',
            addCart: 'Add to cart',
            added: 'Added ✓',
            noWines: 'No wines published yet. Check back soon.',
            allWineries: 'All wineries',
            box6: 'Case of 6', box12: 'Case of 12', bottle: 'Bottle'
        }
    };
    const currentT = t[lang] || t['es'];

    const formatoLabel = (formato) => {
        if (formato === 'caja6') return currentT.box6;
        if (formato === 'caja12') return currentT.box12;
        return currentT.bottle;
    };

    useEffect(() => {
        const fetchVinos = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/vinos`);
                setVinos(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error al cargar vinos:', err);
                setError(currentT.error);
            } finally {
                setLoading(false);
            }
        };
        fetchVinos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL]);

    const bodegas = useMemo(() => {
        const map = new Map();
        vinos.forEach((v) => { if (v.bodega_nombre) map.set(v.bodega_id, v.bodega_nombre); });
        return Array.from(map.entries());
    }, [vinos]);

    const visibles = bodegaFiltro ? vinos.filter((v) => String(v.bodega_id) === String(bodegaFiltro)) : vinos;

    const handleAdd = (vino) => {
        addToCart(vino);
        setAdded(vino.id);
        setTimeout(() => setAdded(null), 1500);
    };

    if (loading) return <div className="status-message">{currentT.loading}</div>;
    if (error) return <div className="status-message error">{error}</div>;

    return (
        <div className="vinos-page">
            <h1 className="vinos-title">{currentT.title}</h1>
            <p className="vinos-subtitle">{currentT.subtitle}</p>

            {bodegas.length > 1 && (
                <div className="zona-filtro">
                    <button className={!bodegaFiltro ? 'active' : ''} onClick={() => setBodegaFiltro('')}>
                        {currentT.allWineries}
                    </button>
                    {bodegas.map(([id, nombre]) => (
                        <button key={id} className={String(bodegaFiltro) === String(id) ? 'active' : ''} onClick={() => setBodegaFiltro(id)}>
                            {nombre}
                        </button>
                    ))}
                </div>
            )}

            <div className="vinos-grid">
                {visibles.length > 0 ? (
                    visibles.map((vino) => (
                        <div key={vino.id} className="vino-card">
                            <div className="vino-image-container">
                                <img
                                    src={vino.imagen_url ? `/images/${vino.imagen_url}` : '/images/logo.jpg'}
                                    alt={vino.nombre}
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/logo.jpg'; }}
                                />
                            </div>

                            <div className="vino-info">
                                {vino.bodega_slug && (
                                    <Link to={`/bodega/${vino.bodega_slug}`} className="vino-bodega-link">{vino.bodega_nombre}</Link>
                                )}
                                <h3>{vino.nombre || 'Vino Boutique'}</h3>
                                <p className="vino-meta">{[vino.varietal, vino.cosecha].filter(Boolean).join(' · ')}</p>
                                <p className="vino-formato-tag">{formatoLabel(vino.formato)}</p>
                                <p className="vino-price">{vino.moneda || 'USD'} {Number(vino.precio_unitario || 0).toFixed(2)}</p>

                                <button className="btn-add-cart" onClick={() => handleAdd(vino)}>
                                    {added === vino.id ? currentT.added : currentT.addCart}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-vinos">{currentT.noWines}</p>
                )}
            </div>
        </div>
    );
};

export default Vinos;
