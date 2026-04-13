import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Home.css';

const Home = () => {
  const { lang } = useLanguage();

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

  // USAMOS LA RUTA DE LA CARPETA PUBLIC
  const heroStyle = {
    backgroundImage: "url('/images/home.JPG')"
  };

  return (
    <div className="home-container">
      <section className="hero" style={heroStyle}>
        <div className="hero-content">
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