import React, { useEffect, useRef } from 'react';

// Verificación humana de Cloudflare Turnstile (el sitio ya está en Cloudflare).
// La clave pública se define al compilar: REACT_APP_TURNSTILE_SITE_KEY.
// Sin clave, el widget no se muestra y el formulario sigue funcionando como antes.
const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
export const turnstileEnabled = Boolean(SITE_KEY);

let scriptPromise = null;
const loadScript = () => {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

const Turnstile = ({ onToken, lang = 'es', resetKey = 0 }) => {
  const boxRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY || !boxRef.current) return undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          language: lang === 'en' ? 'en' : 'es',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => onToken(''));
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current); } catch (e) { /* ya no existe */ }
        widgetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={boxRef} className="mr-turnstile" />;
};

export default Turnstile;
