import React, { useEffect, useRef, useState } from 'react';

// Hace aparecer un bloque con un efecto cuando entra en pantalla al hacer scroll.
// effect: 'up' | 'left' | 'right' | 'zoom'. Los estilos están en Home.css (.reveal).
const Reveal = ({ as: Tag = 'div', effect = 'up', delay = 0, className = '', children, ...rest }) => {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${effect} ${on ? 'is-in' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
