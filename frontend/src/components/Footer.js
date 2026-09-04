import React from 'react';
import { Link } from 'react-router-dom';
import { FaPhoneAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

const Footer = () => {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();

  const t = {
    es: {
      tagline: 'Bodegas boutique independientes de Mendoza, directo al mercado británico.',
      explore: 'Explorar',
      home: 'Inicio', bodegas: 'Bodegas', vinos: 'Vinos', historia: 'Historia',
      contacto: 'Contacto', seguimiento: 'Mi pedido',
      contact: 'Contacto comercial',
      salesUK: 'Ventas — Reino Unido',
      salesAR: 'Ventas — Argentina (Mendoza)',
      rights: 'Todos los derechos reservados.',
      ownedBy: 'Mendoza Reserve es una marca propiedad de, y administrada por, Puma Code.',
      designedBy: 'Diseño y desarrollo por',
    },
    en: {
      tagline: 'Independent boutique wineries from Mendoza, direct to the UK market.',
      explore: 'Explore',
      home: 'Home', bodegas: 'Wineries', vinos: 'Wines', historia: 'Our Story',
      contacto: 'Contact', seguimiento: 'Track order',
      contact: 'Trade contact',
      salesUK: 'Sales — United Kingdom',
      salesAR: 'Sales — Argentina (Mendoza)',
      rights: 'All rights reserved.',
      ownedBy: 'Mendoza Reserve is a brand owned and operated by Puma Code.',
      designedBy: 'Designed & developed by',
    },
  };

  const c = t[lang] || t.en;

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-container">

          {/* Marca */}
          <div className="footer-col footer-brand">
            <img
              src="/images/icon-maskable-512x512.png"
              alt="Mendoza Reserve"
              className="footer-brand-mark"
            />
            <div>
              <p className="footer-brand-name">Mendoza Reserve</p>
              <p className="footer-brand-sub">Boutique Wine Selections</p>
              <p className="footer-tagline">{c.tagline}</p>
            </div>
          </div>

          {/* Links */}
          <div className="footer-col">
            <h4 className="footer-heading">{c.explore}</h4>
            <nav className="footer-links">
              <Link to="/">{c.home}</Link>
              <Link to="/bodegas">{c.bodegas}</Link>
              <Link to="/vinos">{c.vinos}</Link>
              <Link to="/historia">{c.historia}</Link>
              <Link to="/contacto">{c.contacto}</Link>
              <Link to="/seguimiento">{c.seguimiento}</Link>
            </nav>
          </div>

          {/* Contacto comercial */}
          <div className="footer-col">
            <h4 className="footer-heading">{c.contact}</h4>
            <div className="footer-contact-block">
              <span className="footer-contact-label">🇬🇧 {c.salesUK}</span>
              <a href="tel:+447562480662" className="footer-contact-line">
                <FaPhoneAlt /> +44 7562 480662
              </a>
            </div>
            <div className="footer-contact-block">
              <span className="footer-contact-label">🇦🇷 {c.salesAR}</span>
              <a href="tel:+542617730270" className="footer-contact-line">
                <FaPhoneAlt /> +54 261 773 0270
              </a>
            </div>
          </div>

        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copy">
            &copy; {year} Mendoza Reserve — Boutique Wine Selections. {c.rights}
            <br />
            <span className="footer-owned-by">{c.ownedBy}</span>
          </p>

          <a
            href="https://www.puma-code.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-puma-credit"
            aria-label="Puma Code — www.puma-code.com"
          >
            <span className="footer-designed-by">{c.designedBy}</span>
            <img
              src="/images/puma-code-logo.png"
              alt="Puma Code"
              className="footer-puma-logo"
            />
            <span className="footer-puma-name">www.puma-code.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
