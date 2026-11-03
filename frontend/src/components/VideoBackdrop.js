import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/VideoBackdrop.css';

// Fondo global: el video aéreo de Aquila Aerial corre con el scroll detrás de TODO el sitio.
// - Escritorio: el video real (H.264) dividido en 5 tramos de 10 s; se mueve con `currentTime`.
//   HD (1080p) por defecto; 720p en equipos con poca memoria.
// - Celulares: secuencia de cuadros WebP verticales (más liviana para datos móviles).
// - Si en escritorio el video no carga: queda el póster fijo (nunca un fondo liso).
// Fuera del Home se queda en un cuadro fijo, así nunca hay un fondo liso.
const VIDEO_DIR_HD = '/landing/assets/video/hd/';
const VIDEO_DIR_SD = '/landing/assets/video/sd/';
const VIDEO_VER = '1';
const SEG_DURS = [10, 10, 10, 10, 8.1];
const SEG_START = [0, 10, 20, 30, 40];
const TOTAL_DUR = 48.1;
const FPS = 30;
const FRAMES = { dir: '/landing/assets/frames-p/', total: 84 };
const STATIC_PROGRESS = 0.3; // cuadro que se muestra fuera del Home

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const segIndexAt = (t) => {
  for (let i = SEG_START.length - 1; i > 0; i -= 1) if (t >= SEG_START[i]) return i;
  return 0;
};

/* ------------------------------------------------------------------ */
/* Motor de VIDEO (tramos con <video> controlados por el scroll)        */
/* ------------------------------------------------------------------ */
function startVideoEngine({ host, isHomeRef, lowMem, reduced, onFail }) {
  const dir = lowMem ? VIDEO_DIR_SD : VIDEO_DIR_HD;
  const n = SEG_DURS.length;
  const vids = [];
  const hasSrc = new Array(n).fill(false);
  let active = 0;
  let shown = -1;
  let current = 0;
  let target = 0;
  let progress = 0;
  let raf = null;
  let alive = true;
  let failed = false;

  const fail = () => {
    if (failed || !alive) return;
    failed = true;
    onFail();
  };

  const edgeTime = (k) => (k > active ? 0 : Math.max(0, SEG_DURS[k] - 1 / FPS));

  const park = (k) => {
    const v = vids[k];
    if (k === active || !hasSrc[k] || v.readyState < 1 || v.seeking) return;
    const want = edgeTime(k);
    if (Math.abs(v.currentTime - want) > 0.02) v.currentTime = want;
  };

  const load = (k) => {
    if (hasSrc[k]) return;
    hasSrc[k] = true;
    vids[k].src = `${dir}seg${k}.mp4?v=${VIDEO_VER}`;
    vids[k].load();
  };
  const unload = (k) => {
    if (!hasSrc[k]) return;
    hasSrc[k] = false;
    vids[k].removeAttribute('src');
    vids[k].load();
    if (shown === k) shown = -1;
  };

  // Mantiene cargado el tramo actual y el vecino al que nos acercamos.
  const manage = (local) => {
    const keep = {};
    keep[active] = true;
    if (local < SEG_DURS[active] * 0.4 && active > 0) keep[active - 1] = true;
    if (local > SEG_DURS[active] * 0.6 && active < n - 1) keep[active + 1] = true;
    for (let k = 0; k < n; k += 1) {
      if (keep[k]) load(k);
      else if (Math.abs(k - active) >= 2) unload(k);
    }
    for (let k = 0; k < n; k += 1) park(k);
  };

  const show = (k) => {
    if (shown === k) return;
    if (shown >= 0) vids[shown].style.opacity = '0';
    vids[k].style.opacity = '1';
    shown = k;
  };

  function tick() {
    raf = null;
    if (!alive || failed) return;
    current += (target - current) * (reduced ? 1 : 0.2);
    if (Math.abs(target - current) < 0.004) current = target;
    const t = clamp(current, 0, TOTAL_DUR - 0.001);
    const k = segIndexAt(t);
    const local = t - SEG_START[k];
    if (k !== active) active = k;
    manage(local);
    const v = vids[k];
    let busy = false;
    if (hasSrc[k] && v.readyState >= 1) {
      const want = Math.min(Math.round(local * FPS) / FPS, Math.max(0, SEG_DURS[k] - 1 / FPS));
      if (!v.seeking && Math.abs(v.currentTime - want) > 0.0005) {
        try { v.currentTime = want; } catch (e) { /* aún no listo */ }
      }
      busy = v.seeking;
      if (v.readyState >= 2 && !v.seeking) show(k);
    } else {
      busy = true;
    }
    host.style.transform = `scale(${1 + 0.07 * progress})`; // empuje lento
    if (current !== target || busy) schedule(); // eslint-disable-line no-use-before-define
  }
  function schedule() {
    if (!raf && alive) raf = requestAnimationFrame(tick);
  }

  const makeVideo = (k) => {
    const v = document.createElement('video');
    v.className = 'mr-backdrop__video';
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.disablePictureInPicture = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v.style.opacity = '0';
    v.addEventListener('loadedmetadata', () => { park(k); schedule(); });
    v.addEventListener('loadeddata', schedule);
    v.addEventListener('canplay', schedule);
    v.addEventListener('seeked', schedule);
    v.addEventListener('error', () => { if (hasSrc[k] && k === active) fail(); });
    host.appendChild(v);
    return v;
  };
  for (let k = 0; k < n; k += 1) vids.push(makeVideo(k));

  const refresh = () => {
    if (isHomeRef.current) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    } else {
      progress = STATIC_PROGRESS;
    }
    target = progress * TOTAL_DUR;
    if (reduced) current = target;
    schedule();
  };

  // Si en 12 s no apareció ningún cuadro (red lenta o formato no soportado), usamos las imágenes.
  const watchdog = window.setTimeout(() => { if (shown < 0) fail(); }, 12000);

  current = isHomeRef.current ? 0 : STATIC_PROGRESS * TOTAL_DUR;
  refresh();
  current = target; // el primer cuadro aparece sin recorrido
  schedule();

  return {
    refresh,
    stop: () => {
      alive = false;
      window.clearTimeout(watchdog);
      if (raf) cancelAnimationFrame(raf);
      vids.forEach((v) => { v.removeAttribute('src'); v.load(); if (v.parentNode) v.parentNode.removeChild(v); });
    },
  };
}

/* ------------------------------------------------------------------ */
/* Motor de CUADROS (respaldo y celulares): canvas con secuencia WebP   */
/* ------------------------------------------------------------------ */
function startFramesEngine({ canvas, isHomeRef, lite, reduced }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const { dir: DIR, total: TOTAL } = FRAMES;
  const frames = new Array(TOTAL);
  const decoded = {};
  const RADIUS = lite ? 6 : 10;
  let current = 0;
  let target = 0;
  let progress = 0;
  let lastDrawn = -1;
  let raf = null;
  let alive = true;

  const src = (i) => {
    const img = frames[i];
    return img && img.complete && img.naturalWidth ? img : null;
  };
  const nearest = (i) => {
    if (src(i)) return src(i);
    for (let d = 1; d < TOTAL; d += 1) {
      if (src(i - d)) return src(i - d);
      if (src(i + d)) return src(i + d);
    }
    return null;
  };

  // Decodificación anticipada de los cuadros vecinos (el navegador administra la memoria).
  const decodeOne = (i) => {
    const img = frames[i];
    if (i < 0 || i >= TOTAL || decoded[i] || !img || !img.complete || !img.naturalWidth || !img.decode) return;
    decoded[i] = true;
    img.decode().catch(() => {}).then(() => { window.setTimeout(() => { decoded[i] = false; }, 4000); });
  };
  const warm = (idx) => {
    for (let d = 0; d <= RADIUS; d += 1) {
      decodeOne(idx + d);
      decodeOne(idx - d);
    }
  };

  const draw = (idx) => {
    const img = nearest(idx);
    if (!img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / iw, ch / ih) * (1 + 0.07 * progress);
    const w = iw * s;
    const h = ih * s;
    try { ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h); } catch (e) { /* cuadro aún no listo */ }
  };

  function tick() {
    raf = null;
    if (!alive) return;
    current += (target - current) * 0.15;
    if (Math.abs(target - current) < 0.01) current = target;
    const idx = clamp(Math.round(current), 0, TOTAL - 1);
    if (idx !== lastDrawn) {
      draw(idx);
      lastDrawn = idx;
      warm(idx);
    }
    if (current !== target) schedule(); // eslint-disable-line no-use-before-define
  }
  function schedule() {
    if (!raf && alive) raf = requestAnimationFrame(tick);
  }

  const refresh = () => {
    if (isHomeRef.current) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    } else {
      progress = STATIC_PROGRESS;
    }
    target = progress * (TOTAL - 1);
    if (reduced) current = target;
    schedule();
  };

  const resize = () => {
    const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    lastDrawn = -1;
    schedule();
  };

  // Primero cada 6º cuadro (el scroll ya funciona casi de inmediato) y después se rellenan los huecos.
  const loadFrames = () => {
    const order = [];
    const seen = {};
    for (let i = 0; i < TOTAL; i += 6) { order.push(i); seen[i] = true; }
    for (let i = 0; i < TOTAL; i += 1) if (!seen[i]) order.push(i);
    let cursor = 0;
    let inflight = 0;
    const MAX = 6;
    function pump() {
      while (alive && inflight < MAX && cursor < order.length) {
        const n = order[cursor];
        cursor += 1;
        inflight += 1;
        loadOne(n); // eslint-disable-line no-use-before-define
      }
    }
    function loadOne(n) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { inflight -= 1; if (Math.abs(n - current) <= RADIUS) { lastDrawn = -1; } schedule(); pump(); };
      img.onerror = () => { inflight -= 1; pump(); };
      img.src = `${DIR}f_${String(n + 1).padStart(3, '0')}.webp`;
      frames[n] = img;
    }
    pump();
  };

  resize();
  refresh();
  loadFrames();
  window.addEventListener('resize', resize);

  return {
    refresh,
    stop: () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}

/* ------------------------------------------------------------------ */

const VideoBackdrop = () => {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isHomeRef = useRef(isHome);
  const refreshRef = useRef(() => {});

  useEffect(() => {
    isHomeRef.current = isHome;
    refreshRef.current();
  }, [isHome]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const forceHQ = /[?&]hq(=|&|$)/.test(window.location.search); // ?hq=1 fuerza la mejor calidad
    // Equipos con pocos núcleos: sin desenfoques costosos (el video sigue en HD).
    const lite = !forceHQ && ((navigator.hardwareConcurrency || 8) <= 4);
    // Poca memoria real: video de 720p.
    const lowMem = !forceHQ && ((navigator.deviceMemory || 8) <= 4);
    document.documentElement.classList.toggle('mr-lite', lite);

    let engine = null;
    let disposed = false;

    const startFrames = () => {
      if (disposed) return;
      host.style.display = 'none';
      canvas.style.display = 'block';
      engine = startFramesEngine({ canvas, isHomeRef, lite: lite || lowMem, reduced });
      refreshRef.current = engine.refresh;
    };

    // Si el video falla en escritorio, queda el póster fijo.
    const startPoster = () => {
      if (disposed) return;
      if (engine) engine.stop();
      engine = null;
      host.style.display = 'none';
      refreshRef.current = () => {};
    };

    const canPlayH264 = (() => {
      try {
        const v = document.createElement('video');
        return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.640028"'));
      } catch (e) { return false; }
    })();

    if (!mobile && canPlayH264) {
      engine = startVideoEngine({ host, isHomeRef, lowMem, reduced, onFail: startPoster });
      refreshRef.current = engine.refresh;
    } else if (mobile) {
      startFrames();
    } else {
      startPoster();
    }

    const onScroll = () => refreshRef.current();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // El alto de la página cambia cuando cargan las bodegas/vinos: se recalcula el recorrido.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => refreshRef.current());
      ro.observe(document.body);
    }

    return () => {
      disposed = true;
      if (engine) engine.stop();
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className={`mr-backdrop ${isHome ? '' : 'mr-backdrop--dim'}`}
      style={{ backgroundImage: "url('/landing/assets/poster.webp?v=2')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      aria-hidden="true"
    >
      <div ref={hostRef} className="mr-backdrop__stage" />
      <canvas ref={canvasRef} className="mr-backdrop__canvas" style={{ display: 'none' }} />
      <div className="mr-backdrop__shade" />
    </div>
  );
};

export default VideoBackdrop;
