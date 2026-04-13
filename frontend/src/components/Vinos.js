import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; 
import { useLanguage } from '../context/LanguageContext';
import '../styles/Vinos.css'; // Asegúrate de que el CSS exista

const Vinos = () => {
    const [vinos, setVinos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { user } = useAuth(); 
    const { addToCart } = useCart();
    const { lang } = useLanguage();
    const navigate = useNavigate();

    // Usamos la misma lógica de URL que en Bodegas
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    const t = {
        es: {
            title: "Nuestra Cava",
            loading: "Descorchando selección...",
            error: "Error al conectar con la cava.",
            addCart: "Agregar al carrito",
            loginToBuy: "Inicia sesión para comprar",
            noWines: "No hay vinos disponibles en este momento."
        },
        en: {
            title: "Our Cellar",
            loading: "Uncorking selection...",
            error: "Error connecting to the cellar.",
            addCart: "Add to cart",
            loginToBuy: "Login to buy",
            noWines: "No wines available at this time."
        }
    };

    const currentT = t[lang] || t['es'];

    useEffect(() => {
        const fetchVinos = async () => {
            try {
                setLoading(true);
                // 1. Llamada a la API
                const res = await axios.get(`${API_URL}/vinos`);
                
                // 2. Misma lógica de extracción de datos que en Bodegas
                const data = res.data?.vinos || (Array.isArray(res.data) ? res.data : []);
                
                console.log("🍷 Vinos cargados:", data);
                setVinos(data);
            } catch (err) {
                console.error("❌ Error al cargar vinos:", err);
                setError(currentT.error);
            } finally {
                setLoading(false);
            }
        };
        fetchVinos();
    }, [API_URL, currentT.error]);

    const handleAddClick = (vino) => {
        if (!user) {
            navigate('/login');
        } else {
            addToCart(vino);
        }
    };

    if (loading) return <div className="status-message">{currentT.loading}</div>;
    if (error) return <div className="status-message error">{error}</div>;

    return (
        <div className="vinos-page">
            <h1 className="vinos-title">{currentT.title}</h1>
            
            <div className="vinos-grid">
                {vinos.length > 0 ? (
                    vinos.map((vino) => (
                        <div key={vino.id} className="vino-card">
                            <div className="vino-image-container">
                                <img 
                                    // ✅ Usamos la misma lógica de rutas de imagen que en Bodegas
                                    src={vino.imagen_url 
                                        ? `/images/${vino.imagen_url}` 
                                        : "/images/logo.jpg"} 
                                    alt={vino.nombre} 
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "/images/logo.jpg";
                                    }}
                                />
                            </div>
                            
                            <div className="vino-info">
                                <h3>{vino.nombre || "Vino Boutique"}</h3>
                                <p className="vino-price">USD {vino.precio || '0.00'}</p>
                                
                                <button 
                                    className={`btn-add-cart ${!user ? 'not-logged' : ''}`} 
                                    onClick={() => handleAddClick(vino)}
                                >
                                    {user ? currentT.addCart : currentT.loginToBuy}
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