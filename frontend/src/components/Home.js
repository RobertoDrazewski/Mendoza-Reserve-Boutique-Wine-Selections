import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Home.css';

// La portada real es ahora la landing 3D con scroll (frontend/public/landing).
// Es una página estática independiente (video aéreo + mapa + listado), así que
// entramos con replace() para que el botón "atrás" no quede atrapado en un bucle.
// Si por algún motivo la landing no está (p. ej. falta copiar la carpeta), el
// hero sencillo de abajo sigue funcionando como respaldo.
const LANDING_URL = '/landing/index.html';

const Home = () => {
  const { lang } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    fetch(LANDING_URL, { method: 'HEAD' })
      .then((res) => {
        const tipo = res.headers.get('content-type') || '';
        if (!cancelled && res.ok && tipo.includes('text/html')) {
          window.location.replace(LANDING_URL);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const t = {
    es: {
      heroTitle: "Excelencia en Vinos de Mendoza",
      heroSub: "Descubre las bodegas más exclusivas del corazón de los Andes.",
      btnWineries: "Conocer Bodegas"
    },
    en: {
      heroTitle: "Mendoza Wine Excellence",
      heroSub: "Discover the most exclusive wineries in the heart of the Andes.",
      btnWineries: "View Wineries"
    }
  };

  const currentT = t[lang] || t['es'];

  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-content">
          <img
            src="/images/mendoza-reserve-logo-gold.png"
            alt="Mendoza Reserve"
            className="hero-logo"
          />
          <p className="hero-tagline">Boutique Wine Selections</p>
          <h1 className="hero-title-italic">{currentT.heroTitle}</h1>
          <p className="hero-subtitle-elegant">{currentT.heroSub}</p>
          <Link to="/bodegas" className="btn-winery">
            {currentT.btnWineries}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
