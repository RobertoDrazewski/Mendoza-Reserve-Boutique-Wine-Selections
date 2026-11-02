import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/VideoBackdrop.css';

// Fondo de video global: un <canvas> fijo detrás de TODO el sitio. En el Home el
// scroll "recorre" el vuelo aéreo sobre Mendoza (secuencia de frames WebP); en el
// resto de las páginas se queda en un cuadro fijo, así nunca hay un fondo liso.
// Los frames viven en /public/landing/assets (frames = escritorio, frames-m = móvil).
const DIR_DESKTOP = '/landing/assets/frames/';
const DIR_MOBILE = '/landing/assets/frames-m/';
const STATIC_PROGRESS = 0.3; // cuadro que se muestra fuera del Home

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const VideoBackdrop = () => {
  const canvasRef = useRef(null);
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
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Equipos modestos (pocos núcleos / poca RAM): menos resolución y sin efectos de desenfoque.
    const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    document.documentElement.classList.toggle('mr-lite', lite);
    const TOTAL = mobile ? 84 : 150;
    const DIR = mobile ? DIR_MOBILE : DIR_DESKTOP;

    const frames = new Array(TOTAL);   // imágenes descargadas (sólo el archivo comprimido)
    const bitmaps = new Array(TOTAL);  // cuadros ya decodificados, sólo los cercanos al actual
    const pending = {};
    const RADIUS = lite ? 8 : 12;
    let current = 0;
    let target = 0;
    let progress = 0;
    let lastDrawn = -1;
    let raf = null;
    let alive = true;

    // Un cuadro está listo para dibujar si ya está decodificado (bitmap) o, al menos, descargado.
    const src = (i) => {
      if (bitmaps[i]) return bitmaps[i];
      const img = frames[i];
      return img && img.complete && img.naturalWidth ? img : null;
    };
    const dims = (o) => ({ w: o.naturalWidth || o.width, h: o.naturalHeight || o.height });
    const nearest = (i) => {
      if (src(i)) return src(i);
      for (let d = 1; d < TOTAL; d += 1) {
        if (src(i - d)) return src(i - d);
        if (src(i + d)) return src(i + d);
      }
      return null;
    };

    // Decodifica por adelantado los cuadros vecinos (en ambas direcciones) y libera los lejanos.
    // Así, al subir y bajar el scroll nunca hay que decodificar un WebP "en el momento".
    const decodeOne = (i) => {
      const img = frames[i];
      if (i < 0 || i >= TOTAL || bitmaps[i] || pending[i] || !img || !img.complete || !img.naturalWidth) return;
      pending[i] = true;
      createImageBitmap(img).then((bm) => {
        pending[i] = false;
        if (!alive || Math.abs(i - current) > RADIUS + 4) { bm.close(); return; }
        bitmaps[i] = bm;
      }).catch(() => { pending[i] = false; });
    };
    const warm = (idx) => {
      if (typeof createImageBitmap === 'undefined') return;
      for (let i = 0; i < TOTAL; i += 1) {
        if (Math.abs(i - idx) > RADIUS + 4 && bitmaps[i]) { bitmaps[i].close(); bitmaps[i] = null; }
      }
      for (let d = 0; d <= RADIUS; d += 1) {
        decodeOne(idx + d);
        decodeOne(idx - d);
      }
    };

    const draw = (idx) => {
      const img = nearest(idx);
      if (!img) return;
      const { w: iw, h: ih } = dims(img);
      const cw = canvas.width;
      const ch = canvas.height;
      const s = Math.max(cw / iw, ch / ih) * (1 + 0.07 * progress); // empuje lento
      const w = iw * s;
      const h = ih * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const tick = () => {
      raf = null;
      if (!alive) return;
      current += (target - current) * 0.15; // la inercia da el efecto de vuelo
      if (Math.abs(target - current) < 0.01) current = target;
      const idx = clamp(Math.round(current), 0, TOTAL - 1);
      if (idx !== lastDrawn) {
        draw(idx);
        lastDrawn = idx;
        warm(idx);
      }
      if (current !== target) schedule(); // eslint-disable-line no-use-before-define
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

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
    refreshRef.current = refresh;

    const resize = () => {
      const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.25);
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
      let active = 0;
      const MAX = 6;
      const loadOne = (n) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { active -= 1; if (Math.abs(n - current) <= RADIUS) { lastDrawn = -1; } schedule(); pump(); };
        img.onerror = () => { active -= 1; pump(); };
        img.src = `${DIR}f_${String(n + 1).padStart(3, '0')}.webp`;
        frames[n] = img;
      };
      function pump() {
        while (alive && active < MAX && cursor < order.length) {
          const n = order[cursor];
          cursor += 1;
          active += 1;
          loadOne(n);
        }
      }
      pump();
    };

    resize();
    refresh();
    loadFrames();
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('resize', refresh);
    // El alto de la página cambia cuando cargan las bodegas/vinos: se recalcula el recorrido.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => refresh());
      ro.observe(document.body);
    }

    return () => {
      alive = false;
      bitmaps.forEach((b) => { if (b) b.close(); });
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  return (
    <div
      className={`mr-backdrop ${isHome ? '' : 'mr-backdrop--dim'}`}
      style={{ backgroundImage: "url('/landing/assets/poster.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="mr-backdrop__canvas" />
      <div className="mr-backdrop__shade" />
    </div>
  );
};

export default VideoBackdrop;
