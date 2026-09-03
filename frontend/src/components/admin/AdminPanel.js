import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminBodegas from './AdminBodegas';
import AdminVinos from './AdminVinos';
import AdminOrders from './AdminOrders';
import AdminLeads from './AdminLeads';
import '../../styles/AdminPanel.css';

const TABS = [
    { key: 'bodegas', label: 'Bodegas' },
    { key: 'vinos', label: 'Catálogo de vinos' },
    { key: 'orders', label: 'Pedidos y comisiones' },
    { key: 'leads', label: 'Leads UK (CRM)' }
];

const AdminPanel = () => {
    const { user, loading } = useAuth();
    const [tab, setTab] = useState('bodegas');

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.rol !== 'admin') {
        return (
            <div className="admin-denied">
                <h2>Acceso restringido</h2>
                <p>Esta sección es sólo para administradores.</p>
                <Link to="/" className="btn-primary">Volver al inicio</Link>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <h1>Panel de administración</h1>
            <div className="admin-tabs">
                {TABS.map((t) => (
                    <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
                        {t.label}
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
