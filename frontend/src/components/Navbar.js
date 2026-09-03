import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext'; 
import { useAuth } from '../context/AuthContext'; 
import { useCart } from '../context/CartContext'; 
import '../styles/Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const { lang, changeLanguage } = useLanguage();
    const { user, logout } = useAuth(); 
    const { getCartCount } = useCart(); 

    const t = {
        es: {
            home: "Inicio", bodegas: "Bodegas", vinos: "Vinos", historia: "Historia",
            contacto: "Contacto", login: "Ingresar", registro: "Registro",
            logout: "Salir", welcome: "Hola", seguimiento: "Mi pedido", admin: "Admin"
        },
        en: {
            home: "Home", bodegas: "Wineries", vinos: "Wines", historia: "History",
            contacto: "Contact", login: "Login", registro: "Register",
            logout: "Logout", welcome: "Hi", seguimiento: "Track order", admin: "Admin"
        }
    };
    
    const currentT = t[lang] || t['es'];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <NavLink to="/">
                    <img src="/images/logo.jpg" alt="Logo" className="logo-img" />
                </NavLink>
            </div>

            <div className="navbar-menu">
                <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>{currentT.home}</NavLink>
                <NavLink to="/bodegas" className={({ isActive }) => isActive ? "active" : ""}>{currentT.bodegas}</NavLink>
                <NavLink to="/vinos" className={({ isActive }) => isActive ? "active" : ""}>{currentT.vinos}</NavLink>
                <NavLink to="/historia" className={({ isActive }) => isActive ? "active" : ""}>{currentT.historia}</NavLink>
                <NavLink to="/contacto" className={({ isActive }) => isActive ? "active" : ""}>{currentT.contacto}</NavLink>
                <NavLink to="/seguimiento" className={({ isActive }) => isActive ? "active" : ""}>{currentT.seguimiento}</NavLink>
                {user?.rol === 'admin' && (
                    <NavLink to="/admin" className={({ isActive }) => isActive ? "active" : ""}>{currentT.admin}</NavLink>
                )}
            </div>

            <div className="navbar-right-side">
                <div className="auth-row">
                    {user ? (
                        <div className="auth-links">
                            <span className="user-welcome">
                                {currentT.welcome}, <strong>{user.nombre || 'Usuario'}</strong>
                            </span>
                            <span className="auth-separator">|</span>
                            <button className="auth-link-btn logout-style" onClick={handleLogout}>
                                {currentT.logout}
                            </button>
                        </div>
                    ) : (
                        <div className="auth-links">
                            <NavLink to="/login" className="auth-link-btn">{currentT.login}</NavLink>
                            <span className="auth-separator">|</span>
                            <NavLink to="/registro" className="auth-link-btn">{currentT.registro}</NavLink>
                        </div>
                    )}
                </div>

                <div className="actions-row">
                    <div className="language-selector">
                        <span onClick={() => changeLanguage('es')} className={`flag-emoji ${lang === 'es' ? 'active-flag' : ''}`}>🇦🇷</span>
                        <span onClick={() => changeLanguage('en')} className={`flag-emoji ${lang === 'en' ? 'active-flag' : ''}`}>🇬🇧</span>
                    </div>
                    
                    <button className="cart-btn-nav" onClick={() => navigate('/carrito')}>
                        🛒 <span className="cart-badge">{getCartCount()}</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

// MUY IMPORTANTE: Esta línea evita el error de "export default not found"
export default Navbar;