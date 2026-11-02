import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

// Pie fino: izquierda = legales + crédito de Puma Code; derecha = alianza con Aquila Aerial
// y derechos del video. Los datos de contacto viven ahora en la sección "Contacto" del Home.
const Footer = () => {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();

  const t = {
    es: {
      rights: 'Todos los derechos reservados.',
      ownedBy: 'Mendoza Reserve es una marca propiedad de, y administrada por, Puma Code.',
      designedBy: 'Diseño y desarrollo por',
      collab: 'En colaboración con',
      video: `Video aéreo © ${year} Aquila Aerial. Todos los derechos reservados. Usado con autorización.`,
    },
    en: {
      rights: 'All rights reserved.',
      ownedBy: 'Mendoza Reserve is a brand owned and operated by Puma Code.',
      designedBy: 'Designed & developed by',
      collab: 'In collaboration with',
      video: `Aerial footage © ${year} Aquila Aerial. All rights reserved. Used with permission.`,
    },
  };
  const c = t[lang] || t.es;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-side footer-side--left">
          <img src="/landing/assets/logo-mark.png" alt="Mendoza Reserve" className="footer-brand-mark" />
          <div className="footer-text">
            <p className="footer-copy">
              &copy; {year} Mendoza Reserve — Boutique Wine Selections. {c.rights}
            </p>
            <p className="footer-owned-by">{c.ownedBy}</p>
            <a
              href="https://www.puma-code.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-puma-credit"
              aria-label="Puma Code — www.puma-code.com"
            >
              <span>{c.designedBy}</span>
              <img src="/images/puma-code-logo.png" alt="Puma Code" className="footer-puma-logo" />
              <span className="footer-puma-name">www.puma-code.com</span>
            </a>
          </div>
        </div>

        <div className="footer-side footer-side--right">
          <div className="footer-text footer-text--right">
            <p className="footer-collab">{c.collab}</p>
            <p className="footer-owned-by">{c.video}</p>
          </div>
          <img src="/landing/assets/aquila-aerial-logo.png" alt="Aquila Aerial" className="footer-aquila-logo" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
