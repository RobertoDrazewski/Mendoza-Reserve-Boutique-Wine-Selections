import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import CloserLeadsTab from './CloserLeadsTab';
import CloserBodegasTab from './CloserBodegasTab';
import '../../styles/AdminPanel.css';

const T = {
    es: {
        title: 'Panel de closer', tabLeads: 'Mis leads', tabBodegas: 'Bodegas de la red',
        denied: 'Acceso restringido', deniedMsg: 'Esta sección es sólo para cuentas de closer.', back: 'Volver al inicio'
    },
    en: {
        title: 'Closer dashboard', tabLeads: 'My leads', tabBodegas: 'Network wineries',
        denied: 'Access restricted', deniedMsg: 'This section is for closer accounts only.', back: 'Back to home'
    }
};

const CloserDashboard = () => {
    const { user, loading } = useAuth();
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [tab, setTab] = useState('leads');

    if (loading) return null;
    if (!user) return <Navigate to="/closer/login" replace />;
    if (user.rol !== 'closer') {
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
                <button className={tab === 'leads' ? 'active' : ''} onClick={() => setTab('leads')}>{t.tabLeads}</button>
                <button className={tab === 'bodegas' ? 'active' : ''} onClick={() => setTab('bodegas')}>{t.tabBodegas}</button>
            </div>
            <div className="admin-tab-content">
                {tab === 'leads' && <CloserLeadsTab />}
                {tab === 'bodegas' && <CloserBodegasTab />}
            </div>
        </div>
    );
};

export default CloserDashboard;
