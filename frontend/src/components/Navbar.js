import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaUser, FaUserPlus, FaSignOutAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Secciones del Home a las que apunta el menú (en el orden en que aparecen en la página).
const HOME_SECTIONS = ['top', 'bodegas', 'vinos', 'historia', 'contacto', 'registro'];

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { lang, changeLanguage } = useLanguage();
    const { user, logout } = useAuth();
    const isHome = location.pathname === '/';

    const [reveal, setReveal] = useState(isHome ? 0 : 1);   // 0..1: cuánto del menú ya apareció
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState('top');
    const [open, setOpen] = useState(false);

    const t = {
        es: {
            home: 'Inicio', bodegas: 'Bodegas', vinos: 'Vinos', historia: 'Historia',
            contacto: 'Contacto', login: 'Ingresar', registro: 'Registro',
            logout: 'Salir', welcome: 'Hola', seguimiento: 'Mi pedido', admin: 'Admin',
            misPedidos: 'Mis pedidos', panelBodega: 'Panel bodega', panelCloser: 'Panel closer', menu: 'Menú'
        },
        en: {
            home: 'Home', bodegas: 'Wineries', vinos: 'Wines', historia: 'Our Story',
            contacto: 'Contact', login: 'Login', registro: 'Register',
            logout: 'Logout', welcome: 'Hi', seguimiento: 'Track order', admin: 'Admin',
            misPedidos: 'My orders', panelBodega: 'Winery panel', panelCloser: 'Closer panel', menu: 'Menu'
        }
    };
    const c = t[lang] || t.es;

    // Los links del menú: secciones del Home (se desplaza hasta ellas) y páginas propias.
    const items = useMemo(() => {
        const list = [
            { key: 'top', to: { pathname: '/', hash: '' }, label: c.home },
            { key: 'bodegas', to: { pathname: '/', hash: '#bodegas' }, label: c.bodegas },
            { key: 'vinos', to: { pathname: '/', hash: '#vinos' }, label: c.vinos },
            { key: 'historia', to: { pathname: '/', hash: '#historia' }, label: c.historia },
            { key: 'contacto', to: { pathname: '/', hash: '#contacto' }, label: c.contacto },
            { key: 'seguimiento', to: '/seguimiento', label: c.seguimiento, page: true },
        ];
        if (user?.rol === 'cliente') list.push({ key: 'mis', to: '/mis-pedidos', label: c.misPedidos, page: true });
        if (user?.rol === 'bodega') list.push({ key: 'pb', to: '/bodega/dashboard', label: c.panelBodega, page: true });
        if (user?.rol === 'closer') list.push({ key: 'pc', to: '/closer/dashboard', label: c.panelCloser, page: true });
        if (user?.rol === 'admin') list.push({ key: 'ad', to: '/admin', label: c.admin, page: true });
        return list;
    }, [c, user]);

    // En el Home el menú va apareciendo de a poco con el scroll; en el resto de las páginas está completo.
    useEffect(() => {
        if (!isHome) { setReveal(1); setScrolled(true); return undefined; }
        let raf = null;
        const update = () => {
            raf = null;
            const y = window.scrollY;
            setReveal(clamp(y / (window.innerHeight * 0.7), 0, 1));
            setScrolled(y > 40);
            // Sección activa: la última cuyo borde superior ya pasó el 35% de la pantalla.
            let current = 'top';
            HOME_SECTIONS.forEach((id) => {
                const el = id === 'top' ? null : document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = id;
            });
            setActive(current);
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [isHome]);

    useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // alpha de cada elemento (en orden de aparición)
    const alphaOf = (i) => (isHome ? clamp((reveal - i * 0.085) / 0.22, 0, 1) : 1);
    const styleFor = (i) => {
        const a = alphaOf(i);
        return { opacity: a, transform: `translate3d(0, ${((1 - a) * -10).toFixed(1)}px, 0)`, pointerEvents: a > 0.4 ? 'auto' : 'none' };
    };

    const isActive = (it) => {
        if (it.page) return location.pathname.startsWith(it.to);
        return isHome && active === it.key;
    };

    const menuLinks = items.map((it, i) => (
        <Link
            key={it.key}
            to={it.to}
            className={isActive(it) ? 'active' : ''}
            style={styleFor(i + 1)}
            tabIndex={alphaOf(i + 1) > 0.4 ? 0 : -1}
            onClick={() => { if (isHome && !it.page && it.key === 'top') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
            {it.label}
        </Link>
    ));

    const authStyle = styleFor(items.length + 1);

    return (
        <nav className={`navbar ${scrolled ? 'navbar--glass' : 'navbar--clear'} ${isHome ? 'navbar--home' : ''}`}>
            <div className="navbar-menu-inner">
                <Link
                    to={{ pathname: '/', hash: '' }}
                    className="navbar-brand"
                    aria-label="Mendoza Reserve"
                    onClick={() => { if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                    <img src="/images/mendoza-reserve-logo-nav.png" alt="Mendoza Reserve" height="46" />
                    <span className="navbar-brand__tag">Boutique Wine Selections</span>
                </Link>

                <div className={`navbar-menu ${open ? 'is-open' : ''}`}>{menuLinks}</div>

                <div className="auth-row" style={authStyle}>
                    <div className="language-selector">
                        <button type="button" onClick={() => changeLanguage('es')} className={`flag-emoji ${lang === 'es' ? 'active-flag' : ''}`} aria-label="Español">🇦🇷</button>
                        <button type="button" onClick={() => changeLanguage('en')} className={`flag-emoji ${lang === 'en' ? 'active-flag' : ''}`} aria-label="English">🇬🇧</button>
                    </div>

                    {user ? (
                        <div className="auth-links">
                            <span className="user-welcome">
                                {c.welcome}, <strong>{user.nombre || 'Usuario'}</strong>
                            </span>
                            <span className="auth-separator">|</span>
                            <button className="auth-link-btn" onClick={handleLogout}>{c.logout}</button>
                        </div>
                    ) : (
                        <div className="auth-links">
                            <NavLink to="/login" className="auth-link-btn">{c.login}</NavLink>
                            <span className="auth-separator">|</span>
                            <Link to={{ pathname: '/', hash: '#registro' }} className="auth-link-btn">{c.registro}</Link>
                        </div>
                    )}

                    <div className="auth-mobile">
                        <button type="button" className="auth-mobile__btn auth-mobile__lang" onClick={() => changeLanguage(lang === 'es' ? 'en' : 'es')} aria-label={lang === 'es' ? 'English' : 'Español'}>
                            {lang === 'es' ? 'EN' : 'ES'}
                        </button>
                        {user ? (
                            <button type="button" className="auth-mobile__btn" onClick={handleLogout} aria-label={c.logout} title={c.logout}><FaSignOutAlt /></button>
                        ) : (
                            <>
                                <Link to="/login" className="auth-mobile__btn" aria-label={c.login} title={c.login}><FaUser /></Link>
                                <Link to={{ pathname: '/', hash: '#registro' }} className="auth-mobile__btn" aria-label={c.registro} title={c.registro}><FaUserPlus /></Link>
                            </>
                        )}
                    </div>

                    <button type="button" className="navbar-burger" aria-label={c.menu} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                        {open ? <FaTimes /> : <FaBars />}
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
