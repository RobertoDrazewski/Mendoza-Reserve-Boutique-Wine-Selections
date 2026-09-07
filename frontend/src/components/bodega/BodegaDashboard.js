import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import BodegaPerfilTab from './BodegaPerfilTab';
import BodegaCatalogoTab from './BodegaCatalogoTab';
import BodegaPedidosTab from './BodegaPedidosTab';
import '../../styles/AdminPanel.css';

const T = {
    es: {
        title: 'Panel de la bodega',
        tabPerfil: 'Mi perfil',
        tabCatalogo: 'Mi catálogo',
        tabPedidos: 'Mis pedidos',
        denied: 'Acceso restringido',
        deniedMsg: 'Esta sección es sólo para cuentas de bodega.',
        back: 'Volver al inicio'
    },
    en: {
        title: 'Winery dashboard',
        tabPerfil: 'My profile',
        tabCatalogo: 'My catalog',
        tabPedidos: 'My orders',
        denied: 'Access restricted',
        deniedMsg: 'This section is for winery accounts only.',
        back: 'Back to home'
    }
};

const BodegaDashboard = () => {
    const { user, loading } = useAuth();
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [tab, setTab] = useState('perfil');

    if (loading) return null;
    if (!user) return <Navigate to="/bodega/login" replace />;
    if (user.rol !== 'bodega') {
        return (
            <div className="admin-denied">
                <h2>{t.denied}</h2>
                <p>{t.deniedMsg}</p>
                <Link to="/" className="btn-primary">{t.back}</Link>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <h1>{t.title}</h1>
            <div className="admin-tabs">
                <button className={tab === 'perfil' ? 'active' : ''} onClick={() => setTab('perfil')}>{t.tabPerfil}</button>
                <button className={tab === 'catalogo' ? 'active' : ''} onClick={() => setTab('catalogo')}>{t.tabCatalogo}</button>
                <button className={tab === 'pedidos' ? 'active' : ''} onClick={() => setTab('pedidos')}>{t.tabPedidos}</button>
            </div>
            <div className="admin-tab-content">
                {tab === 'perfil' && <BodegaPerfilTab />}
                {tab === 'catalogo' && <BodegaCatalogoTab />}
                {tab === 'pedidos' && <BodegaPedidosTab />}
            </div>
        </div>
    );
};

export default BodegaDashboard;
