import React from 'react';
import { FaInstagram, FaYoutube, FaGlobe } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

const PUMA = {
  web: 'https://www.puma-code.com',
  instagram: 'https://www.instagram.com/puma_code',
  youtube: 'https://www.youtube.com/@Puma-code',
};
const AQUILA = {
  web: 'https://aquilaaerial.ar/',
  instagram: 'https://www.instagram.com/aquilaaerial.ar/',
  youtube: 'https://www.youtube.com/@aquilaAerial.argentina',
};

const Socials = ({ links, name }) => (
  <div className="footer-socials">
    <a href={links.web} target="_blank" rel="noopener noreferrer" aria-label={`${name} web`} title="Web"><FaGlobe /></a>
    <a href={links.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${name} Instagram`} title="Instagram"><FaInstagram /></a>
    <a href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label={`${name} YouTube`} title="YouTube"><FaYoutube /></a>
  </div>
);

// Pie fino y simétrico: izquierda Puma Code (legales + diseño), derecha Aquila Aerial (video).
// Cada marca lleva su logo (mismo alto) y debajo sus redes. Contactos: ver sección "Contacto" del Home.
const Footer = () => {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();

  const t = {
    es: {
      rights: 'Todos los derechos reservados.',
      ownedBy: 'Mendoza Reserve es una marca propiedad de, y administrada por, Puma Code.',
      designedBy: 'Diseño y desarrollo por',
      collab: 'En colaboración con Aquila Aerial',
      video: `Video aéreo © ${year} Aquila Aerial. Todos los derechos reservados. Usado con autorización.`,
    },
    en: {
      rights: 'All rights reserved.',
      ownedBy: 'Mendoza Reserve is a brand owned and operated by Puma Code.',
      designedBy: 'Designed & developed by',
      collab: 'In collaboration with Aquila Aerial',
      video: `Aerial footage © ${year} Aquila Aerial. All rights reserved. Used with permission.`,
    },
  };
  const c = t[lang] || t.es;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-side footer-side--left">
          <div className="footer-brand">
            <a href={PUMA.web} target="_blank" rel="noopener noreferrer" aria-label="Puma Code">
              <img src="/images/puma-code-footer.png" alt="Puma Code" className="footer-logo footer-logo--puma" />
            </a>
            <Socials links={PUMA} name="Puma Code" />
          </div>
          <div className="footer-text">
            <p>&copy; {year} Mendoza Reserve — Boutique Wine Selections. {c.rights}</p>
            <p>{c.ownedBy}</p>
            <p>{c.designedBy} <a href={PUMA.web} target="_blank" rel="noopener noreferrer" className="footer-link">www.puma-code.com</a></p>
          </div>
        </div>

        <div className="footer-side footer-side--right">
          <div className="footer-text footer-text--right">
            <p className="footer-collab">{c.collab}</p>
            <p>{c.video}</p>
          </div>
          <div className="footer-brand">
            <a href={AQUILA.web} target="_blank" rel="noopener noreferrer" aria-label="Aquila Aerial">
              <img src="/landing/assets/aquila-aerial-logo.png" alt="Aquila Aerial" className="footer-logo footer-logo--aquila" />
            </a>
            <Socials links={AQUILA} name="Aquila Aerial" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
