import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import '../styles/BodegaDetalle.css';

const BodegaDetalle = () => {
    const { id } = useParams();
    const { lang } = useLanguage();
    const [bodega, setBodega] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- CONFIGURACIÓN DE URL DINÁMICA ---
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    const t = {
        es: {
            loading: "Cargando detalles...",
            notFound: "Bodega no encontrada.",
            address: "Dirección",
            phone: "Teléfono",
            email: "Email",
            web: "Web"
        },
        en: {
            loading: "Loading details...",
            notFound: "Winery not found.",
            address: "Address",
            phone: "Phone",
            email: "Email",
            web: "Web"
        }
    };

    const currentT = t[lang] || t['es'];

    useEffect(() => {
        const fetchBodega = async () => {
            try {
                const res = await axios.get(`${API_URL}/bodegas/${id}`);
                // Restauramos la asignación simple que tenías:
                setBodega(res.data);
            } catch (error) {
                console.error("❌ Error al cargar la bodega de la DB:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBodega();
    }, [id, API_URL]);

    if (loading) return <div className="loading-state"><h3>{currentT.loading}</h3></div>;
    if (!bodega) return <div className="loading-state"><h3>{currentT.notFound}</h3></div>;

    // Restauramos tu lógica original de descripción
    const descripcionMostrar = lang === 'es' ? bodega.descripcion_es : bodega.descripcion_en;

    return (
        <div className="detalle-page-wrapper">
            <div className="etiqueta-central">
                <div className="logo-container">
                    <img 
                        // ✅ ÚNICO CAMBIO: Ruta relativa a la carpeta public/images
                        src={bodega.imagen ? `/images/${bodega.imagen}` : "/images/logo.jpg"} 
                        alt="Logo Bodega" 
                        className="bodega-logo-small"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/logo.jpg";
                        }}
                    />
                </div>

                <div className="etiqueta-content">
                    <h1 className="bodega-title">{bodega.bodega}</h1>
                    <div className="divider-dorado"></div>
                    
                    <p className="descripcion-texto">
                        {descripcionMostrar || bodega.descripcion_es} 
                    </p>
                    
                    <div className="info-grid">
                        <div className="info-item">
                            <span>{currentT.address}</span>
                            <p>{bodega.wineryAddress}</p>
                        </div>
                        <div className="info-item">
                            <span>{currentT.phone}</span>
                            <p>{bodega.phone}</p>
                        </div>
                    </div>

                    <div className="web-link">
                        <a href={bodega.web} target="_blank" rel="noreferrer">
                            {bodega.web?.replace('https://', '')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BodegaDetalle;