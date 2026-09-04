import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { resolveBodegaImage } from '../utils/resolveImage';
import '../styles/BodegaDetalle.css';

const BodegaDetalle = () => {
    const { id } = useParams();
    const { lang } = useLanguage();
    const { addToCart } = useCart();
    const [bodega, setBodega] = useState(null);
    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const t = {
        es: {
            loading: 'Cargando detalles...',
            notFound: 'Bodega no encontrada.',
            address: 'Dirección', phone: 'Teléfono', web: 'Sitio web',
            catalog: 'Catálogo disponible', noWines: 'Esta bodega todavía no cargó su catálogo de vinos.',
            add: 'Agregar al carrito', added: 'Agregado ✓', backLink: '← Ver todas las bodegas',
            box6: 'Caja x6', box12: 'Caja x12', bottle: 'Botella'
        },
        en: {
            loading: 'Loading details...',
            notFound: 'Winery not found.',
            address: 'Address', phone: 'Phone', web: 'Website',
            catalog: 'Available catalog', noWines: 'This winery has not uploaded its wine catalog yet.',
            add: 'Add to cart', added: 'Added ✓', backLink: '← Back to all wineries',
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
        const fetchAll = async () => {
            setLoading(true);
            try {
                const resBodega = await axios.get(`${API_URL}/bodegas/${id}`);
                setBodega(resBodega.data);
                try {
                    const resVinos = await axios.get(`${API_URL}/vinos/bodega/${resBodega.data.id}`);
                    setVinos(Array.isArray(resVinos.data) ? resVinos.data : []);
                } catch (e) {
                    setVinos([]);
                }
            } catch (error) {
                console.error('Error al cargar la bodega:', error);
                setBodega(null);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id, API_URL]);

    const handleAdd = (vino) => {
        addToCart({ ...vino, bodega_id: bodega.id, bodega_nombre: bodega.nombre, bodega_slug: bodega.slug });
        setAdded(vino.id);
        setTimeout(() => setAdded(null), 1500);
    };

    if (loading) return <div className="loading-state"><h3>{currentT.loading}</h3></div>;
    if (!bodega) return <div className="loading-state"><h3>{currentT.notFound}</h3></div>;

    return (
        <div className="detalle-page-wrapper">
            <div className="detalle-page-inner">
                <Link to="/bodegas" className="back-link">{currentT.backLink}</Link>

                <div className="etiqueta-central">
                    <div className="logo-container">
                        {bodega.imagen ? (
                            <img
                                src={resolveBodegaImage(bodega.imagen)}
                                alt={bodega.nombre}
                                className="bodega-logo-small"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/logo.jpg'; }}
                            />
                        ) : (
                            <div className="bodega-logo-placeholder">{bodega.nombre?.charAt(0)}</div>
                        )}
                    </div>

                    <h1 className="bodega-title">{bodega.nombre}</h1>
                    <div className="divider-dorado"></div>

                    {bodega.descripcion && <p className="descripcion-texto">{bodega.descripcion}</p>}

                    <div className="info-grid">
                        {bodega.direccion && (
                            <div className="info-item">
                                <span>{currentT.address}</span>
                                <p>{bodega.direccion}</p>
                            </div>
                        )}
                        {bodega.telefono && (
                            <div className="info-item">
                                <span>{currentT.phone}</span>
                                <p>{bodega.telefono}</p>
                            </div>
                        )}
                    </div>

                    {bodega.sitio_web && (
                        <div className="web-link">
                            <a href={bodega.sitio_web} target="_blank" rel="noreferrer">
                                {bodega.sitio_web.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                </div>

                <div className="catalogo-bodega">
                    <h2>{currentT.catalog}</h2>
                    {vinos.length === 0 ? (
                        <p className="no-vinos">{currentT.noWines}</p>
                    ) : (
                        <div className="vinos-grid-mini">
                            {vinos.map((vino) => (
                                <div key={vino.id} className="vino-card-mini">
                                    <div className="vino-image-mini">
                                        <img
                                            src={vino.imagen_url ? `/images/${vino.imagen_url}` : '/images/logo.jpg'}
                                            alt={vino.nombre}
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/logo.jpg'; }}
                                        />
                                    </div>
                                    <div className="vino-info-mini">
                                        <h4>{vino.nombre}</h4>
                                        <p className="vino-meta">
                                            {[vino.varietal, vino.cosecha].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className="vino-formato">{formatoLabel(vino.formato)}</p>
                                        <div className="vino-price-row">
                                            <span className="vino-price-mini">{vino.moneda} {Number(vino.precio_unitario).toFixed(2)}</span>
                                            <button className="btn-add-mini" onClick={() => handleAdd(vino)}>
                                                {added === vino.id ? currentT.added : currentT.add}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BodegaDetalle;
