import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/FloatingCart.css';

const KEY = 'mr_cart_pos';
const SIZE = 64;

const clampPos = (x, y) => ({
  x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - SIZE - 8)),
  y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - SIZE - 8)),
});

const initialPos = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return clampPos(saved.x, saved.y);
  } catch (e) { /* sin storage */ }
  return clampPos(window.innerWidth - SIZE - 24, window.innerHeight - SIZE - 110);
};

// Carrito flotante: se arrastra a cualquier lado de la pantalla (mouse o dedo) y
// recuerda dónde lo dejaste. Un toque/clic sin arrastrar abre el carrito.
const FloatingCart = () => {
  const { getCartCount, getTotal, cart } = useCart();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pos, setPos] = useState(initialPos);
  const [dragging, setDragging] = useState(false);
  const [bump, setBump] = useState(false);
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0, sx: 0, sy: 0 });
  const count = getCartCount();
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setBump(true);
      const id = setTimeout(() => setBump(false), 700);
      prevCount.current = count;
      return () => clearTimeout(id);
    }
    prevCount.current = count;
    return undefined;
  }, [count]);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e) => {
    drag.current = { active: true, moved: false, dx: e.clientX - pos.x, dy: e.clientY - pos.y, sx: e.clientX, sy: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (!d.active) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) setPos(clampPos(e.clientX - d.dx, e.clientY - d.dy));
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
    setDragging(false);
    if (d.moved) {
      setPos((p) => {
        try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (err) { /* sin storage */ }
        return p;
      });
    } else {
      navigate('/carrito');
    }
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate('/carrito');
    }
  };

  if (pathname === '/carrito') return null;

  const label = lang === 'en' ? 'Shopping cart — drag to move' : 'Carrito de compras — arrastrá para moverlo';
  const total = cart.length ? getTotal() : 0;

  return (
    <div
      className={`mr-cart ${dragging ? 'is-dragging' : ''} ${bump ? 'is-bump' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      role="button"
      tabIndex={0}
      aria-label={`${label} (${count})`}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <FaShoppingCart className="mr-cart__icon" />
      {count > 0 && <span className="mr-cart__badge">{count}</span>}
      {count > 0 && <span className="mr-cart__total">{total.toFixed(0)}</span>}
    </div>
  );
};

export default FloatingCart;
