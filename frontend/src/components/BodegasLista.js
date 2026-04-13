import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext'; 
import '../styles/BodegasLista.css';

const BodegasLista = () => {
    const [allBodegas, setAllBodegas] = useState([]); // Todas las de la DB
    const [displayBodegas, setDisplayBodegas] = useState([]); // Las que se ven
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { lang } = useLanguage();
    
    // Configuración de Scroll Infinito
    const [page, setPage] = useState(1);
    const itemsPerPage = 4; // Cuántas cargar por vez
    const observer = useRef();

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    const t = {
        es: { title: "Nuestras Bodegas", loading: "Cargando selección...", error: "Error de conexión.", viewMore: "Conocer Bodega", phone: "Tel:", address: "Dir:" },
        en: { title: "Our Wineries", loading: "Loading selection...", error: "Connection error.", viewMore: "View Winery", phone: "Phone:", address: "Addr:" }
    };
    const currentT = t[lang] || t['es'];

    // 1. Carga inicial de datos desde la API
    useEffect(() => {
        const fetchBodegas = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/bodegas`);
                const data = res.data?.bodegas || (Array.isArray(res.data) ? res.data : []);
                setAllBodegas(data);
                // Mostrar los primeros X elementos
                setDisplayBodegas(data.slice(0, itemsPerPage));
            } catch (err) {
                console.error("❌ Error:", err);
                setError(currentT.error);
            } finally {
                setLoading(false);
            }
        };
        fetchBodegas();
    }, [API_URL, currentT.error]);

    // 2. Función para cargar más elementos al hacer scroll
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && displayBodegas.length < allBodegas.length) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, displayBodegas.length, allBodegas.length]);

    // 3. Efecto para actualizar la lista visible cuando cambia la página
    useEffect(() => {
        if (page > 1) {
            const nextBatch = allBodegas.slice(0, page * itemsPerPage);
            setDisplayBodegas(nextBatch);
        }
    }, [page, allBodegas]);

    if (loading && allBodegas.length === 0) return <div className="status-message">{currentT.loading}</div>;
    if (error) return <div className="status-message error">{error}</div>;

    return (
        <div className="bodegas-container">
            <h1>{currentT.title}</h1>
            <div className="bodegas-grid">
                {displayBodegas.map((item, index) => {
                    // Si es el último elemento de la lista actual, le ponemos la referencia
                    const isLastElement = displayBodegas.length === index + 1;
                    
                    return (
                        <div 
                            key={item.id} 
                            className="bodega-card" 
                            ref={isLastElement ? lastElementRef : null}
                        >
                            <div className="bodega-image-wrapper">
                                <img 
                                    src={item.imagen ? `/images/${item.imagen}` : '/images/default-bodega.jpg'} 
                                    alt={item.bodega}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "/images/logo.jpg"; 
                                    }}
                                />
                            </div>

                            <div className="card-content">
                                <h3 className="bodega-name">{item.bodega || "Sin Nombre"}</h3>
                                <div className="contact-details">
                                    <p><strong>{currentT.phone}</strong> {item.phone || 'N/A'}</p>
                                    <p><strong>{currentT.address}</strong> {item.wineryAddress || 'Mendoza'}</p>
                                </div>
                                <Link to={`/bodega/${item.id}`} className="btn-conocer">
                                    {currentT.viewMore}
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Pequeño indicador de carga al final si hay más por cargar */}
            {displayBodegas.length < allBodegas.length && (
                <div className="loading-more">...</div>
            )}
        </div>
    );
};

export default BodegasLista;