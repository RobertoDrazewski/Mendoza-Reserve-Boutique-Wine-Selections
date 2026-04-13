import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Historia.css';

const Historia = () => {
  const { lang } = useLanguage();

  const content = {
    es: {
      title: "De Mendoza al Reino Unido",
      subtitle: "Un puente entre el corazón de Mendoza y la gastronomía inglesa",
      originTitle: "Mi Historia",
      originText: "Soy Roberto, creador de Mendoza Reserve. Nací en Maipú, Mendoza, tierra de tradición y vides. A los 20 años emprendí un viaje que marcaría mi destino: viví un año en Italia y otro en España, para finalmente radicarme 13 años en el Reino Unido, donde me desempeñé como Head Chef.",
      visionTitle: "Visión de Negocio",
      visionText: "Como chef, identifiqué una brecha clara: en Mendoza existen pequeñas bodegas con vinos de calidad mundial que no están siendo aprovechados en el mercado inglés. Mi visión es generar un enlace directo entre el pequeño productor mendocino y las grandes cadenas de restaurantes argentinos y steak houses en Inglaterra. Garantizo que cada pequeña bodega pueda exportar sus vinos orgánicos para que, en cada paladar inglés, se disfrute la esencia de Mendoza, sintiéndose como si estuvieran allí, rodeados de la montaña y la vid."
    },
    en: {
      title: "From Mendoza to United Kingdom",
      subtitle: "A bridge between the heart of Mendoza and English gastronomy",
      originTitle: "My Story",
      originText: "I am Roberto, founder of Mendoza Reserve. I was born in Maipú, Mendoza, a land of tradition and vines. At 20, I began a journey that would shape my destiny: I spent a year in Italy and a year in Spain, before settling for 13 years in the United Kingdom, where I worked as a Head Chef.",
      visionTitle: "Business Vision",
      visionText: "As a chef, I identified a clear gap: there are small wineries in Mendoza producing world-class wines that remain untapped in the English market. My vision is to create a direct link between small-scale Mendocino producers and the major Argentinian restaurants and steak houses in England. I ensure that every small winery can export their organic wines, allowing every English palate to enjoy them as if they were right there in Mendoza, surrounded by the mountains and the vines."
    }
  };

  const t = content[lang] || content['es'];

  // Definimos el fondo aquí para evitar errores de compilación de Webpack
  // Mantenemos 'fixed' para un efecto elegante al hacer scroll
  const sectionStyle = {
    backgroundImage: "url('/images/bodegaAvion.PNG')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '0 20px', // Quitamos el padding vertical para controlar la altura
    boxSizing: 'border-box'
  };

  return (
    <div className="historia-page-pure-noscroll">
      <section style={sectionStyle}>
        {/* ELIMINAMOS EL OVERLAY OSCURO PARA MOSTRAR LA IMAGEN PURA */}
        
        <div className="historia-content-pure-noscroll">
          <header className="historia-header-pure-noscroll">
            <h1 className="historia-title-pure-noscroll">{t.title}</h1>
            <p className="historia-subtitle-pure-noscroll">{t.subtitle}</p>
            <div className="historia-divider-pure-noscroll"></div>
          </header>

          <div className="historia-grid-pure-noscroll">
            <article className="historia-article-pure-noscroll">
              <h2 className="historia-block-title-pure-noscroll">{t.originTitle}</h2>
              <p className="historia-block-text-pure-noscroll">{t.originText}</p>
            </article>

            <article className="historia-article-pure-noscroll">
              <h2 className="historia-block-title-pure-noscroll">{t.visionTitle}</h2>
              <p className="historia-block-text-pure-noscroll">{t.visionText}</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Historia;