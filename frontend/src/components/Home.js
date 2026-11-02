import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FaSearch, FaRegHandshake, FaTruck, FaGlassCheers, FaMapMarkedAlt, FaPhoneAlt,
  FaWhatsapp, FaChevronDown, FaPaperPlane, FaCheckCircle, FaWineBottle, FaShoppingCart
} from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { resolveBodegaImage } from '../utils/resolveImage';
import Reveal from './Reveal';
import Register from './Register';
import Turnstile, { turnstileEnabled } from './Turnstile';
import '../styles/Home.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Centro aproximado de cada zona (no hay lat/lon por bodega en la base de datos).
const ZONA_COORDS = {
  'Luján de Cuyo': [-33.0333, -68.8833], 'Maipú': [-32.9833, -68.7833], 'Godoy Cruz': [-32.9264, -68.8306],
  'Guaymallén': [-32.9019, -68.8064], 'Zona Este': [-33.14, -68.47], 'Valle de Uco': [-33.55, -69.05],
  'San Rafael': [-34.6177, -68.3301], 'General Alvear': [-34.9756, -67.6892],
};
const ZONA_FALLBACK = [-33.6, -68.9];
const coordsForZona = (z) => (!z ? ZONA_FALLBACK : ZONA_COORDS[z] || ZONA_COORDS[z.split('/')[0].trim()] || ZONA_FALLBACK);

// Mapa híbrido fijo: imagen satelital + rutas/calles + nombres de lugares (todo de Esri, sin API key).
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const HYBRID_LAYERS = [
  { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxZoom: 19, attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics', pane: 'tilePane' },
  { url: `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, maxZoom: 19, opacity: 0.9 },
  { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxZoom: 19 },
];

const DEFAULT_GRAPES = ['Malbec', 'Cabernet Sauvignon', 'Cabernet Franc', 'Bonarda', 'Syrah', 'Chardonnay', 'Torrontés', 'Pinot Noir'];

const TXT = {
  es: {
    tagline: 'Boutique Wine Selections',
    h1a: 'Vinos boutique de Mendoza,', h1b: 'directo desde la bodega.',
    lead: 'Conectamos bodegas independientes de Mendoza con restaurantes, importadores y distribuidores del Reino Unido.',
    ctaWineries: 'Explorar bodegas', ctaContact: 'Solicitar acceso profesional', scroll: 'Descubrir',
    f1t: 'Curaduría personal', f1d: 'Cada bodega es visitada y evaluada antes de sumarse a la selección.',
    f2t: 'Trato directo', f2d: 'Sin intermediarios: mejores precios y trazabilidad completa de cada botella.',
    f3t: 'Logística al Reino Unido', f3d: 'Coordinamos la exportación y la entrega hasta tu puerta.',
    stepsT: 'Cómo funciona', s1: 'Elegir', s1d: 'Explorá las bodegas por zona y variedad.', s2: 'Reservar', s2d: 'Solicitá acceso y reservá tu selección.', s3: 'Recibir', s3d: 'Nosotros nos encargamos del resto.',
    bodTitle: 'Nuestras bodegas', bodSub: 'Buscá por nombre, filtrá por zona y por tipo de vino.',
    search: 'Buscar bodega por nombre…', allZones: 'Todas las zonas', zone: 'Zona', grape: 'Tipo de vino', allGrapes: 'Todos',
    results: 'bodegas', noResults: 'No encontramos bodegas con esos filtros.', soon: 'Próximamente', view: 'Ver bodega',
    mapSat: 'Satelital', mapStreets: 'Calles', clear: 'Limpiar filtros', loading: 'Cargando bodegas…', errorLoad: 'No pudimos cargar las bodegas.',
    grapeNote: 'El filtro por tipo de vino se completa a medida que las bodegas cargan su catálogo.',
    popActive: 'con catálogo activo',
    vinosT: 'Nuestra cava', vinosSub: 'Vinos de bodegas boutique de Mendoza, listos para exportar al Reino Unido.',
    vinosSoon: 'Próximamente', vinosSoonD: 'Estamos confirmando las primeras bodegas. Muy pronto vas a poder reservar sus vinos desde acá.',
    add: 'Agregar al carrito', added: 'Agregado ✓', box6: 'Caja x6', box12: 'Caja x12', bottle: 'Botella',
    hisT: 'De Mendoza al Reino Unido', hisS: 'Un puente directo entre las bodegas boutique de Mendoza y la mesa británica',
    h1T: 'Nuestro origen',
    h1X: 'Mendoza Reserve nace de un recorrido poco común: nuestro fundador se formó como Head Chef durante 13 años en el Reino Unido, después de vivir en Italia y España. Ese paso por las cocinas inglesas le mostró algo que lo inquietaba: los mejores restaurantes argentinos y steak houses de Inglaterra rara vez servían los vinos boutique que realmente representan a Mendoza.',
    h2T: 'Lo que hacemos',
    h2X: 'Somos el enlace directo entre pequeños productores mendocinos de calidad mundial y compradores profesionales en el Reino Unido. Seleccionamos cada bodega personalmente, negociamos en su nombre y coordinamos la exportación, para que cada botella llegue con trazabilidad, historia y calidad.',
    h3T: 'Por qué trabajar con nosotros',
    h3X: 'Curaduría personal, no catálogo masivo. Trato directo con el productor, sin intermediarios. Y un socio que conoce ambos mundos — la producción en Mendoza y las exigencias del mercado gastronómico inglés.',
    conT: 'Contacto', conSub: 'Contanos qué estás buscando y te respondemos a la brevedad.',
    brand: 'Mendoza Reserve', brandTag: 'Boutique Wine Selections', brandDesc: 'Bodegas boutique independientes de Mendoza, directo al mercado británico.',
    salesUK: 'Ventas — Reino Unido', salesAR: 'Ventas — Argentina (Mendoza)',
    formT: 'Solicitar acceso profesional', fName: 'Nombre y apellido', fCompany: 'Empresa / restaurante', fEmail: 'Email', fMsg: 'Mensaje',
    send: 'Enviar solicitud', sending: 'Enviando…', ok: '¡Gracias! Recibimos tu solicitud y te vamos a escribir pronto.', err: 'No pudimos enviar el mensaje. Probá de nuevo en unos minutos.',
    human: 'Confirmá que sos una persona para poder enviar.',
    regT: 'Crear cuenta',
  },
  en: {
    tagline: 'Boutique Wine Selections',
    h1a: 'Boutique wines of Mendoza,', h1b: 'straight from the winery.',
    lead: 'We connect independent Mendoza wineries with UK restaurants, importers and distributors.',
    ctaWineries: 'Explore wineries', ctaContact: 'Request trade access', scroll: 'Discover',
    f1t: 'Personal curation', f1d: 'Every winery is visited and assessed before joining the selection.',
    f2t: 'Direct trade', f2d: 'No middlemen: better prices and full traceability for every bottle.',
    f3t: 'Logistics to the UK', f3d: 'We coordinate the export and delivery to your door.',
    stepsT: 'How it works', s1: 'Choose', s1d: 'Browse wineries by region and grape.', s2: 'Reserve', s2d: 'Request access and reserve your selection.', s3: 'Receive', s3d: 'We take care of the rest.',
    bodTitle: 'Our wineries', bodSub: 'Search by name, filter by region and by wine type.',
    search: 'Search winery by name…', allZones: 'All regions', zone: 'Region', grape: 'Wine type', allGrapes: 'All',
    results: 'wineries', noResults: 'No wineries match those filters.', soon: 'Coming soon', view: 'View winery',
    mapSat: 'Satellite', mapStreets: 'Streets', clear: 'Clear filters', loading: 'Loading wineries…', errorLoad: 'We could not load the wineries.',
    grapeNote: 'The wine-type filter fills in as wineries upload their catalogue.',
    popActive: 'with active catalogue',
    vinosT: 'Our cellar', vinosSub: 'Wines from boutique Mendoza wineries, ready to export to the UK.',
    vinosSoon: 'Coming soon', vinosSoonD: 'We are confirming our first wineries. Very soon you will be able to reserve their wines here.',
    add: 'Add to cart', added: 'Added ✓', box6: 'Case of 6', box12: 'Case of 12', bottle: 'Bottle',
    hisT: 'From Mendoza to the United Kingdom', hisS: "A direct bridge between Mendoza's boutique wineries and the British table",
    h1T: 'Our origin',
    h1X: 'Mendoza Reserve was born from an unusual path: our founder trained as a Head Chef for 13 years in the UK, after living in Italy and Spain. That time in English kitchens revealed a gap: the best Argentinian restaurants and steak houses in England rarely served the boutique wines that truly represent Mendoza.',
    h2T: 'What we do',
    h2X: 'We are the direct link between world-class small producers in Mendoza and professional buyers across the UK. We personally select every winery, negotiate on their behalf and coordinate the export, so every bottle arrives with traceability, story and quality.',
    h3T: 'Why work with us',
    h3X: 'Personal curation, not a mass catalogue. Direct trade with the producer, with no middlemen. And a partner who understands both worlds — production in Mendoza and the demands of the English hospitality trade.',
    conT: 'Contact', conSub: 'Tell us what you are looking for and we will get back to you shortly.',
    brand: 'Mendoza Reserve', brandTag: 'Boutique Wine Selections', brandDesc: 'Independent boutique wineries of Mendoza, straight to the British market.',
    salesUK: 'Sales — United Kingdom', salesAR: 'Sales — Argentina (Mendoza)',
    formT: 'Request trade access', fName: 'Full name', fCompany: 'Company / restaurant', fEmail: 'Email', fMsg: 'Message',
    send: 'Send request', sending: 'Sending…', ok: 'Thank you! We received your request and will write to you soon.', err: 'We could not send your message. Please try again in a few minutes.',
    human: 'Please confirm you are human before sending.',
    regT: 'Create account',
  },
};

/* ------------------------------------------------------------------ Historia (texto "tipeado") */
const Historia = ({ c }) => {
  const ref = useRef(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = null;
    const calc = () => {
      raf = null;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      setP(clamp(-r.top / total, 0, 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);

  const parts = [c.hisT, c.hisS, c.h1T, c.h1X, c.h2T, c.h2X, c.h3T, c.h3X];
  const total = parts.reduce((a, s) => a + s.length, 0);
  let left = Math.floor(clamp((p - 0.04) / 0.82, 0, 1) * total);
  const typed = parts.map((s) => { const n = clamp(left, 0, s.length); left -= n; return n; });
  const T = (i) => {
    const s = parts[i];
    const n = typed[i];
    const typing = n > 0 && n < s.length;
    return (<><span>{s.slice(0, n)}</span>{typing && <span className="caret" />}<span className="ghost">{s.slice(n)}</span></>);
  };

  return (
    <section id="historia" className="mr-sec mr-historia" ref={ref}>
      <div className="mr-historia__stick">
        <div className="mr-glass mr-historia__panel">
          <h2 className="mr-h2">{T(0)}</h2>
          <p className="mr-lead mr-historia__sub">{T(1)}</p>
          <div className="mr-rule" />
          <div className="mr-historia__grid">
            {[2, 4, 6].map((i) => (
              <article key={i}>
                <h3>{T(i)}</h3>
                <p>{T(i + 1)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Bodegas + mapa */
const Bodegas = ({ c, lang }) => {
  const navigate = useNavigate();
  const [bodegas, setBodegas] = useState([]);
  const [vinos, setVinos] = useState([]);
  const [state, setState] = useState('loading');
  const [q, setQ] = useState('');
  const [zona, setZona] = useState('');
  const [uva, setUva] = useState('');
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);

  useEffect(() => {
    let alive = true;
    axios.get(`${API_URL}/bodegas/mapa`)
      .then((r) => { if (alive) { setBodegas(Array.isArray(r.data) ? r.data : []); setState('ok'); } })
      .catch(() => { if (alive) setState('error'); });
    axios.get(`${API_URL}/vinos`).then((r) => { if (alive) setVinos(Array.isArray(r.data) ? r.data : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const zonas = useMemo(() => {
    const m = new Map();
    bodegas.forEach((b) => { const z = b.zona || (lang === 'en' ? 'Other' : 'Otras'); m.set(z, (m.get(z) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [bodegas, lang]);

  const uvas = useMemo(() => {
    const set = new Set(DEFAULT_GRAPES);
    vinos.forEach((v) => { if (v.varietal) set.add(String(v.varietal).trim()); });
    return Array.from(set);
  }, [vinos]);

  const uvasPorBodega = useMemo(() => {
    const m = new Map();
    vinos.forEach((v) => {
      if (!v.varietal) return;
      const k = String(v.bodega_id);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(norm(v.varietal));
    });
    return m;
  }, [vinos]);

  const filtradas = useMemo(() => {
    const nq = norm(q);
    return bodegas
      .filter((b) => {
        if (nq && !(norm(b.nombre).includes(nq) || norm(b.subzona).includes(nq) || norm(b.zona).includes(nq))) return false;
        if (zona && (b.zona || '') !== zona) return false;
        if (uva) { const s = uvasPorBodega.get(String(b.id)); if (!s || !Array.from(s).some((x) => x.includes(norm(uva)))) return false; }
        return true;
      })
      .sort((a, b) => (b.estado === 'activa') - (a.estado === 'activa') || String(a.nombre).localeCompare(String(b.nombre)));
  }, [bodegas, q, zona, uva, uvasPorBodega]);

  // --- mapa
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return undefined;
    const map = L.map(mapEl.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomControl: true }).setView([-33.6, -68.9], 8);
    mapRef.current = map;
    HYBRID_LAYERS.forEach((l) => L.tileLayer(l.url, { maxZoom: l.maxZoom, attribution: l.attribution, opacity: l.opacity }).addTo(map));
    markersRef.current = L.featureGroup().addTo(map);
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[data-nav]');
      if (a) { e.preventDefault(); navigate(a.getAttribute('data-nav')); }
    };
    mapEl.current.addEventListener('click', onClick);
    const el = mapEl.current;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('click', onClick); if (ro) ro.disconnect(); map.remove(); mapRef.current = null; };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const grupos = new Map();
    filtradas.forEach((b) => { const z = b.zona || (lang === 'en' ? 'Other' : 'Otras'); if (!grupos.has(z)) grupos.set(z, []); grupos.get(z).push(b); });
    grupos.forEach((items, z) => {
      const activas = items.filter((b) => b.estado === 'activa').length;
      const icon = L.divIcon({ className: 'mapa-bodega-marker', html: `<div class="mapa-bodega-marker-badge">${items.length}</div>`, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -16] });
      const lista = items.map((b) => (b.estado === 'activa'
        ? `<li><a href="/bodega/${escapeHtml(b.slug)}" data-nav="/bodega/${escapeHtml(b.slug)}">${escapeHtml(b.nombre)}</a></li>`
        : `<li class="mapa-popup-inactiva">${escapeHtml(b.nombre)} <span>· ${c.soon.toLowerCase()}</span></li>`)).join('');
      L.marker(coordsForZona(z), { icon }).addTo(group)
        .bindPopup(`<div class="mapa-popup"><h4>${escapeHtml(z)}</h4><p class="mapa-popup-count">${items.length} ${c.results} · ${activas} ${c.popActive}</p><ul class="mapa-popup-lista">${lista}</ul></div>`, { maxWidth: 280 });
    });
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 10 });
  }, [filtradas, lang, c]);

  const flyTo = useCallback((b) => {
    const map = mapRef.current;
    if (map) map.flyTo(coordsForZona(b.zona), 10, { duration: 0.8 });
  }, []);

  const hayFiltro = q || zona || uva;

  return (
    <section id="bodegas" className="mr-sec">
      <Reveal className="mr-head">
        <p className="mr-eyebrow"><FaMapMarkedAlt /> {c.bodTitle}</p>
        <h2 className="mr-h2">{c.bodTitle}</h2>
        <p className="mr-lead">{c.bodSub}</p>
      </Reveal>

      <div className="mr-bod">
        <Reveal effect="left" className="mr-glass mr-bod__panel">
          <div className="mr-search">
            <FaSearch aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.search} aria-label={c.search} />
          </div>

          <div className="mr-chipgroup">
            <span>{c.zone}</span>
            <div className="mr-chips">
              <button type="button" className={!zona ? 'on' : ''} onClick={() => setZona('')}>{c.allZones} <i>{bodegas.length}</i></button>
              {zonas.map(([z, n]) => (
                <button type="button" key={z} className={zona === z ? 'on' : ''} onClick={() => setZona(zona === z ? '' : z)}>{z} <i>{n}</i></button>
              ))}
            </div>
          </div>

          <div className="mr-chipgroup">
            <span>{c.grape}</span>
            <div className="mr-chips">
              <button type="button" className={!uva ? 'on' : ''} onClick={() => setUva('')}>{c.allGrapes}</button>
              {uvas.map((g) => (
                <button type="button" key={g} className={uva === g ? 'on' : ''} onClick={() => setUva(uva === g ? '' : g)}>{g}</button>
              ))}
            </div>
            {vinos.length === 0 && <small className="mr-note">{c.grapeNote}</small>}
          </div>

          <div className="mr-count">
            <b>{filtradas.length}</b> {c.results}
            {hayFiltro && <button type="button" onClick={() => { setQ(''); setZona(''); setUva(''); }}>{c.clear}</button>}
          </div>

          <ul className="mr-list">
            {state === 'loading' && <li className="mr-empty">{c.loading}</li>}
            {state === 'error' && <li className="mr-empty">{c.errorLoad}</li>}
            {state === 'ok' && filtradas.length === 0 && <li className="mr-empty">{c.noResults}</li>}
            {filtradas.map((b) => {
              const activa = b.estado === 'activa';
              const img = resolveBodegaImage(b.imagen);
              const inner = (
                <>
                  <span className="mr-list__img">
                    <img src={img || '/landing/assets/logo-mark.png'} alt="" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/landing/assets/logo-mark.png'; }} />
                  </span>
                  <span className="mr-list__txt">
                    <strong>{b.nombre}</strong>
                    <em>{[b.zona, b.subzona].filter(Boolean).join(' · ')}</em>
                  </span>
                  {activa ? <span className="mr-badge mr-badge--on">{c.view}</span> : <span className="mr-badge">{c.soon}</span>}
                </>
              );
              return (
                <li key={b.id}>
                  {activa
                    ? <Link to={`/bodega/${b.slug}`} className="mr-list__item">{inner}</Link>
                    : <button type="button" className="mr-list__item" onClick={() => flyTo(b)}>{inner}</button>}
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal effect="right" delay={120} className="mr-glass mr-bod__map">
          <div ref={mapEl} className="mr-map" />
        </Reveal>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Vinos */
const Vinos = ({ c }) => {
  const { addToCart } = useCart();
  const [vinos, setVinos] = useState([]);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    let alive = true;
    axios.get(`${API_URL}/vinos`).then((r) => { if (alive) setVinos(Array.isArray(r.data) ? r.data : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const formato = (f) => (f === 'caja6' ? c.box6 : f === 'caja12' ? c.box12 : c.bottle);
  const add = (v) => { addToCart(v); setAdded(v.id); setTimeout(() => setAdded(null), 1500); };

  return (
    <section id="vinos" className="mr-sec">
      <Reveal className="mr-head">
        <p className="mr-eyebrow"><FaWineBottle /> {c.vinosT}</p>
        <h2 className="mr-h2">{c.vinosT}</h2>
        <p className="mr-lead">{c.vinosSub}</p>
      </Reveal>

      {vinos.length === 0 ? (
        <Reveal effect="zoom" className="mr-glass mr-soon">
          <FaGlassCheers />
          <h3>{c.vinosSoon}</h3>
          <p>{c.vinosSoonD}</p>
        </Reveal>
      ) : (
        <div className="mr-wines">
          {vinos.map((v, i) => (
            <Reveal key={v.id} effect="up" delay={(i % 4) * 90} className="mr-glass mr-wine">
              <div className="mr-wine__img">
                <img src={v.imagen_url ? (/^https?:/i.test(v.imagen_url) ? v.imagen_url : `/images/${v.imagen_url}`) : '/landing/assets/logo-mark.png'} alt={v.nombre} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/landing/assets/logo-mark.png'; }} />
              </div>
              {v.bodega_slug && <Link to={`/bodega/${v.bodega_slug}`} className="mr-wine__bod">{v.bodega_nombre}</Link>}
              <h3>{v.nombre}</h3>
              <p className="mr-wine__meta">{[v.varietal, v.cosecha, formato(v.formato)].filter(Boolean).join(' · ')}</p>
              <p className="mr-wine__price">{v.moneda || 'USD'} {Number(v.precio_unitario || 0).toFixed(2)}</p>
              <button type="button" className="mr-btn mr-btn--sm" onClick={() => add(v)}><FaShoppingCart /> {added === v.id ? c.added : c.add}</button>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ Contacto */
const Contacto = ({ c, lang }) => {
  const [f, setF] = useState({ nombre: '', empresa: '', email: '', mensaje: '' });
  const [token, setToken] = useState('');
  const [reset, setReset] = useState(0);
  const [st, setSt] = useState('idle');
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (turnstileEnabled && !token) { setSt('error'); setMsg(c.human); return; }
    setSt('sending'); setMsg('');
    try {
      await axios.post(`${API_URL}/contacto`, {
        nombre: f.nombre,
        email: f.email,
        asunto: f.empresa ? `${c.formT} — ${f.empresa}` : c.formT,
        mensaje: f.mensaje,
        turnstileToken: token || undefined,
      });
      setSt('ok'); setMsg(c.ok);
      setF({ nombre: '', empresa: '', email: '', mensaje: '' });
    } catch (err) {
      setSt('error'); setMsg(err?.response?.data?.error || c.err);
    } finally {
      setToken(''); setReset((n) => n + 1);
    }
  };

  return (
    <section id="contacto" className="mr-sec">
      <Reveal className="mr-head">
        <p className="mr-eyebrow"><FaPhoneAlt /> {c.conT}</p>
        <h2 className="mr-h2">{c.conT}</h2>
        <p className="mr-lead">{c.conSub}</p>
      </Reveal>

      <div className="mr-contact">
        <Reveal effect="left" className="mr-glass mr-contact__info">
          <img src="/landing/assets/logo-mark.png" alt="" width="64" height="64" />
          <h3>{c.brand}</h3>
          <p className="mr-contact__tag">{c.brandTag}</p>
          <p>{c.brandDesc}</p>
          <ul>
            <li><FaWhatsapp /><span><small>{c.salesUK}</small><a href="tel:+447562480662">+44 7562 480662</a></span></li>
            <li><FaWhatsapp /><span><small>{c.salesAR}</small><a href="tel:+542617730270">+54 261 773 0270</a></span></li>
          </ul>
        </Reveal>

        <Reveal effect="right" delay={120} className="mr-glass mr-contact__form">
          <h3>{c.formT}</h3>
          <form onSubmit={submit}>
            <div className="mr-row">
              <label><span>{c.fName}</span><input required value={f.nombre} onChange={set('nombre')} autoComplete="name" /></label>
              <label><span>{c.fCompany}</span><input value={f.empresa} onChange={set('empresa')} autoComplete="organization" /></label>
            </div>
            <label><span>{c.fEmail}</span><input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
            <label><span>{c.fMsg}</span><textarea required rows="4" value={f.mensaje} onChange={set('mensaje')} /></label>
            <Turnstile onToken={setToken} lang={lang} resetKey={reset} />
            <button type="submit" className="mr-btn" disabled={st === 'sending'}><FaPaperPlane /> {st === 'sending' ? c.sending : c.send}</button>
            {msg && <p className={`mr-form-msg ${st}`} role="status">{st === 'ok' && <FaCheckCircle />} {msg}</p>}
          </form>
        </Reveal>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Home */
const Home = () => {
  const { lang } = useLanguage();
  const c = TXT[lang] || TXT.es;
  const location = useLocation();

  // Navegación por ancla (#bodegas, #contacto…) y vuelta arriba al entrar sin ancla.
  useEffect(() => {
    const id = location.hash ? location.hash.slice(1) : '';
    if (!id) { window.scrollTo(0, 0); return undefined; }
    let tries = 0;
    const go = () => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (tries++ < 20) timer = setTimeout(go, 100);
    };
    let timer = setTimeout(go, 60);
    return () => clearTimeout(timer);
  }, [location.hash, location.key]);

  return (
    <div className="mr-home">
      <section id="top" className="mr-hero">
        <div className="mr-hero__in">
          <h1>{c.h1a}<br /><em>{c.h1b}</em></h1>
          <p className="mr-lead">{c.lead}</p>
          <div className="mr-cta">
            <a href="#bodegas" className="mr-btn" onClick={(e) => { e.preventDefault(); document.getElementById('bodegas')?.scrollIntoView({ behavior: 'smooth' }); }}>{c.ctaWineries}</a>
            <a href="#contacto" className="mr-btn mr-btn--ghost" onClick={(e) => { e.preventDefault(); document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' }); }}>{c.ctaContact}</a>
          </div>
        </div>
        <span className="mr-scroll" aria-hidden="true">{c.scroll}<FaChevronDown /></span>
      </section>

      <section className="mr-sec mr-features">
        {[[FaGlassCheers, c.f1t, c.f1d], [FaRegHandshake, c.f2t, c.f2d], [FaTruck, c.f3t, c.f3d]].map(([Icon, t, d], i) => (
          <Reveal key={t} effect={i === 0 ? 'left' : i === 2 ? 'right' : 'up'} delay={i * 100} className="mr-glass mr-feature">
            <span className="mr-ico"><Icon /></span>
            <h3>{t}</h3>
            <p>{d}</p>
          </Reveal>
        ))}
      </section>

      <section className="mr-sec">
        <Reveal className="mr-head"><h2 className="mr-h2">{c.stepsT}</h2></Reveal>
        <div className="mr-steps">
          {[[FaSearch, c.s1, c.s1d], [FaRegHandshake, c.s2, c.s2d], [FaTruck, c.s3, c.s3d]].map(([Icon, t, d], i) => (
            <Reveal key={t} effect="zoom" delay={i * 130} className="mr-glass mr-step">
              <b>{i + 1}</b>
              <span className="mr-ico"><Icon /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Bodegas c={c} lang={lang} />
      <Vinos c={c} />
      <Historia c={c} />
      <Contacto c={c} lang={lang} />

      <section id="registro" className="mr-sec mr-registro">
        <Reveal className="mr-head"><h2 className="mr-h2">{c.regT}</h2></Reveal>
        <Reveal effect="zoom" className="mr-register-wrap"><Register /></Reveal>
      </section>
    </div>
  );
};

export default Home;
