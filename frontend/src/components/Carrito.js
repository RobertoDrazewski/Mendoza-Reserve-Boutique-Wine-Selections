import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Carrito.css';

const Carrito = () => {
  const { cart, addToCart, removeFromCart, clearCart, getTotal } = useCart();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const BASE_SERVER_URL = API_URL.replace('/api', '');

  const t = {
    es: { title: "Tu Carrito", empty: "Tu carrito está vacío", total: "Total", btn: "Finalizar Compra", clear: "Vaciar Carrito", loginReq: "Inicia sesión para comprar" },
    en: { title: "Your Cart", empty: "Your cart is empty", total: "Total", btn: "Checkout", clear: "Clear Cart", loginReq: "Login to buy" }
  };
  const currentT = t[lang] || t['es'];

  const getImageUrl = (item) => {
    if (!item) return "/images/logo.jpg";
    const rawImg = item.imagen_url || item.imagen || item.foto;
    if (!rawImg) return "/images/logo.jpg";
    if (rawImg.startsWith('http')) return rawImg;
    const fileName = rawImg.replace('/images/', '').replace('images/', '').trim();
    return `${BASE_SERVER_URL}/images/${fileName}`;
  };

  const handleFinalizarCompra = async () => {
    if (!user) {
      alert(currentT.loginReq);
      return navigate('/login');
    }
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const orderData = { items: cart, total: getTotal() };
      await axios.post(`${API_URL}/orders`, orderData);
      alert("¡Gracias por tu compra!");
      clearCart();
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pedido.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="carrito-container">
      <h1 className="carrito-title">{currentT.title}</h1>
      
      {cart.length === 0 ? (
        <div className="carrito-vacio">
          <p>{currentT.empty}</p>
          <Link to="/vinos" className="btn-primary">Ver Vinos</Link>
        </div>
      ) : (
        <div className="carrito-wrapper">
          <div className="cart-items-list">
            {cart.map((item) => (
              <div key={item.id} className="cart-item-row">
                <div className="cart-item-img-container">
                  <img 
                    src={getImageUrl(item)} 
                    alt={item.nombre} 
                    onError={(e) => { e.target.src = "/images/logo.jpg"; }}
                  />
                </div>
                
                <div className="cart-item-info">
                  <h3>{item.nombre}</h3>
                  <span className="unit-price">USD {item.precio}</span>
                </div>

                <div className="cart-item-actions">
                  <button onClick={() => removeFromCart(item.id)}>-</button>
                  <span className="qty-number">{item.quantity}</span>
                  <button onClick={() => addToCart(item)}>+</button>
                </div>

                <div className="cart-item-subtotal">
                  USD {(item.precio * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="cart-footer-summary">
            <button className="btn-clear-cart" onClick={clearCart}>
              {currentT.clear}
            </button>
            
            <div className="total-box">
              <div className="total-row">
                <span>{currentT.total}:</span>
                <h3>USD {getTotal().toFixed(2)}</h3>
              </div>
              <button 
                className="btn-checkout-final" 
                onClick={handleFinalizarCompra} 
                disabled={isProcessing}
              >
                {isProcessing ? "..." : currentT.btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carrito;