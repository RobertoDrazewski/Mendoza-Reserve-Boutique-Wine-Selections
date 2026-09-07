import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AdminBodegas from './AdminBodegas';
import AdminVinos from './AdminVinos';
import AdminOrders from './AdminOrders';
import AdminLeads from './AdminLeads';
import '../../styles/AdminPanel.css';

const T = {
    es: {
        title: 'Panel de administración', denied: 'Acceso restringido',
        deniedMsg: 'Esta sección es sólo para administradores.', back: 'Volver al inicio',
        tabBodegas: 'Bodegas', tabVinos: 'Catálogo de vinos', tabOrders: 'Pedidos y comisiones', tabLeads: 'Leads UK (CRM)'
    },
    en: {
        title: 'Admin panel', denied: 'Access restricted',
        deniedMsg: 'This section is for administrators only.', back: 'Back to home',
        tabBodegas: 'Wineries', tabVinos: 'Wine catalog', tabOrders: 'Orders & commissions', tabLeads: 'UK leads (CRM)'
    }
};

const AdminPanel = () => {
    const { user, loading } = useAuth();
    const { lang } = useLanguage();
    const t = T[lang] || T.es;
    const [tab, setTab] = useState('bodegas');

    const TABS = [
        { key: 'bodegas', label: t.tabBodegas },
        { key: 'vinos', label: t.tabVinos },
        { key: 'orders', label: t.tabOrders },
        { key: 'leads', label: t.tabLeads }
    ];

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.rol !== 'admin') {
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
                {TABS.map((tabItem) => (
                    <button key={tabItem.key} className={tab === tabItem.key ? 'active' : ''} onClick={() => setTab(tabItem.key)}>
                        {tabItem.label}
                    </button>
                ))}
            </div>

            <div className="admin-tab-content">
                {tab === 'bodegas' && <AdminBodegas />}
                {tab === 'vinos' && <AdminVinos />}
                {tab === 'orders' && <AdminOrders />}
                {tab === 'leads' && <AdminLeads />}
            </div>
        </div>
    );
};

export default AdminPanel;
