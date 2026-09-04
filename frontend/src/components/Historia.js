import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Historia.css';

const Historia = () => {
  const { lang } = useLanguage();

  const content = {
    es: {
      title: "De Mendoza al Reino Unido",
      subtitle: "Un puente directo entre las bodegas boutique de Mendoza y la mesa británica",
      originTitle: "Nuestro Origen",
      originText: "Mendoza Reserve nace de un recorrido poco común: nuestro fundador se formó como Head Chef durante 13 años en el Reino Unido, después de vivir en Italia y España. Ese paso por las cocinas inglesas le mostró de cerca algo que lo inquietaba: los mejores restaurantes argentinos y steak houses de Inglaterra rara vez servían los vinos boutique que realmente representan a Mendoza — las pequeñas bodegas familiares, no las etiquetas masivas.",
      visionTitle: "Lo Que Hacemos",
      visionText: "Somos el enlace directo entre pequeños productores mendocinos de calidad mundial y compradores profesionales en el Reino Unido — restaurantes, importadores y distribuidoras especializadas. Seleccionamos cada bodega personalmente, negociamos en su nombre y coordinamos la exportación, para que cada botella llegue con la trazabilidad, la historia y la calidad que un comprador exigente necesita.",
      whyTitle: "Por Qué Trabajar Con Nosotros",
      whyText: "Curaduría personal, no catálogo masivo: cada bodega es visitada y evaluada antes de sumarse. Trato directo con el productor, sin intermediarios de por medio, lo que garantiza mejores precios y trazabilidad completa. Y un socio que conoce ambos mundos — la producción en Mendoza y las exigencias del mercado gastronómico inglés — para que la incorporación de nuevas etiquetas sea simple y sin fricciones."
    },
    en: {
      title: "From Mendoza to the United Kingdom",
      subtitle: "A direct bridge between Mendoza's boutique wineries and the British table",
      originTitle: "Our Origin",
      originText: "Mendoza Reserve was born from an unusual path: our founder trained as a Head Chef for 13 years in the United Kingdom, after living in Italy and Spain. That time in English kitchens revealed a clear gap — the best Argentinian restaurants and steak houses in England rarely served the boutique wines that truly represent Mendoza: the small, family-run wineries, not the mass-market labels.",
      visionTitle: "What We Do",
      visionText: "We are the direct link between world-class small producers in Mendoza and professional buyers across the UK — restaurants, importers and specialist distributors. We personally select every winery, negotiate on their behalf and coordinate the export, so every bottle arrives with the traceability, the story and the quality a discerning buyer expects.",
      whyTitle: "Why Work With Us",
      whyText: "Personal curation, not a mass catalogue: every winery is visited and assessed before joining. Direct trade with the producer, with no layers of middlemen, which means better pricing and full traceability. And a partner who understands both worlds — production in Mendoza and the demands of the English hospitality trade — so bringing on a new label is simple and friction-free."
    }
  };

  const t = content[lang] || content['es'];

  // Definimos el fondo aquí para evitar errores de compilación de Webpack
  // Mantenemos 'fixed' para un efecto elegante al hacer scroll
  const sectionStyle = {
    backgroundImage: "url('/images/bodegaAvion.PNG')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // 'fixed' se ve lindo (efecto parallax) pero se calcula contra el viewport, no
    // contra el alto real de la sección — si el contenido crece más de una pantalla
    // (como con 3 columnas de texto), deja un hueco negro debajo. Con 'scroll' la
    // imagen siempre cubre el alto real de la sección, sin huecos, en cualquier página.
    backgroundAttachment: 'scroll',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '60px 20px',
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

            <article className="historia-article-pure-noscroll">
              <h2 className="historia-block-title-pure-noscroll">{t.whyTitle}</h2>
              <p className="historia-block-text-pure-noscroll">{t.whyText}</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Historia;