import React from 'react';
import { FaPhoneAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

const Footer = () => {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();

  const t = {
    es: {
      brandName: 'Mendoza Reserve',
      brandSub: 'Boutique Wine Selections',
      tagline: 'Bodegas boutique independientes de Mendoza, directo al mercado británico.',
      salesUK: 'Ventas — Reino Unido',
      salesAR: 'Ventas — Argentina (Mendoza)',
      rights: 'Todos los derechos reservados.',
      ownedBy: 'Mendoza Reserve es una marca propiedad de, y administrada por, Puma Code.',
      designedBy: 'Diseño y desarrollo por',
    },
    en: {
      brandName: 'Mendoza Reserve',
      brandSub: 'Boutique Wine Selections',
      tagline: 'Independent boutique wineries from Mendoza, direct to the UK market.',
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

          {/* Izquierda: Marca */}
          <div className="footer-col footer-brand-col">
            <p className="footer-brand-title">
              <span className="footer-brand-name">{c.brandName}</span>
              <span className="footer-brand-sub">{c.brandSub}</span>
            </p>
            <p className="footer-tagline">{c.tagline}</p>
          </div>

          {/* Centro: Ventas Reino Unido */}
          <div className="footer-col footer-contact-col footer-center">
            <span className="footer-contact-label">🇬🇧 {c.salesUK}</span>
            <a href="tel:+447562480662" className="footer-contact-line">
              <FaPhoneAlt /> +44 7562 480662
            </a>
          </div>

          {/* Derecha: Ventas Argentina */}
          <div className="footer-col footer-contact-col footer-right">
            <span className="footer-contact-label">🇦🇷 {c.salesAR}</span>
            <a href="tel:+542617730270" className="footer-contact-line">
              <FaPhoneAlt /> +54 261 773 0270
            </a>
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