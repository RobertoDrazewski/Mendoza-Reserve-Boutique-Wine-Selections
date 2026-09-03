import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Carrito.css';

const Carrito = () => {
    const { cart, updateQuantity, removeFromCart, clearCart, getTotal, getGroupedByBodega } = useCart();
    const { lang } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [form, setForm] = useState({
        name: user?.nombre || '',
        company: '',
        email: user?.email || '',
        phone: '',
        address: '',
        country: 'United Kingdom'
    });

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    const t = {
        es: {
            title: 'Tu Carrito', empty: 'Tu carrito está vacío', total: 'Total estimado', btn: 'Finalizar Compra',
            clear: 'Vaciar Carrito', loginReq: 'Necesitás iniciar sesión para confirmar el pedido',
            viewWines: 'Ver Vinos', proceed: 'Continuar con los datos de envío',
            name: 'Nombre completo', company: 'Empresa / Restaurante (opcional)', email: 'Email',
            phone: 'Teléfono', address: 'Dirección de envío (Reino Unido)', country: 'País',
            confirm: 'Confirmar Pedido', processing: 'Procesando...',
            note: 'Cada bodega gestiona su propio envío y coordina el pago directamente con vos. Vas a recibir un email de confirmación con el estado de cada parte del pedido.',
            perBodega: 'de'
        },
        en: {
            title: 'Your Cart', empty: 'Your cart is empty', total: 'Estimated total', btn: 'Checkout',
            clear: 'Clear Cart', loginReq: 'You need to log in to confirm the order',
            viewWines: 'View Wines', proceed: 'Continue to shipping details',
            name: 'Full name', company: 'Company / Restaurant (optional)', email: 'Email',
            phone: 'Phone', address: 'Shipping address (UK)', country: 'Country',
            confirm: 'Confirm Order', processing: 'Processing...',
            note: 'Each winery manages its own shipping and settles payment directly with you. You will receive a confirmation email with the status of each part of the order.',
            perBodega: 'from'
        }
    };
    const currentT = t[lang] || t['es'];

    const getImageUrl = (item) => {
        const raw = item.imagen_url;
        if (!raw) return '/images/logo.jpg';
        if (raw.startsWith('http')) return raw;
        return `/images/${raw}`;
    };

    const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleProceed = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setShowCheckout(true);
    };

    const handleConfirmar = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }
        if (!form.name || !form.email || !form.address) return;

        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const items = cart.map((item) => ({ id: item.id, quantity: item.quantity, bodega_id: item.bodega_id }));
            const res = await axios.post(`${API_URL}/orders`, {
                items,
                buyer: { name: form.name, company: form.company || undefined, email: form.email, phone: form.phone || undefined },
                shipping: { address: form.address, country: form.country }
            });
            clearCart();
            navigate(`/seguimiento/${res.data.cartGroupId}?email=${encodeURIComponent(form.email)}`);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Error al procesar el pedido.');
        } finally {
            setIsProcessing(false);
        }
    };

    const grupos = getGroupedByBodega();

    return (
        <div className="carrito-container">
            <h1 className="carrito-title">{currentT.title}</h1>

            {cart.length === 0 ? (
                <div className="carrito-vacio">
                    <p>{currentT.empty}</p>
                    <Link to="/vinos" className="btn-primary">{currentT.viewWines}</Link>
                </div>
            ) : (
                <div className="carrito-wrapper">
                    {grupos.map((grupo) => (
                        <div key={grupo.bodega_id} className="cart-bodega-group">
                            <h3 className="cart-bodega-heading">{grupo.bodega_nombre}</h3>
                            <div className="cart-items-list">
                                {grupo.items.map((item) => (
                                    <div key={item.id} className="cart-item-row">
                                        <div className="cart-item-img-container">
                                            <img
                                                src={getImageUrl(item)}
                                                alt={item.nombre}
                                                onError={(e) => { e.target.src = '/images/logo.jpg'; }}
                                            />
                                        </div>

                                        <div className="cart-item-info">
                                            <h3>{item.nombre}</h3>
                                            <span className="unit-price">{item.moneda} {item.precio_unitario.toFixed(2)}</span>
                                        </div>

                                        <div className="cart-item-actions">
                                            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                            <span className="qty-number">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                        </div>

                                        <div className="cart-item-subtotal">
                                            {item.moneda} {(item.precio_unitario * item.quantity).toFixed(2)}
                                        </div>

                                        <button className="btn-remove-item" onClick={() => removeFromCart(item.id)} aria-label="Quitar">×</button>
                                    </div>
                                ))}
                            </div>
                            <div className="cart-bodega-subtotal">
                                Subtotal {currentT.perBodega} {grupo.bodega_nombre}: <strong>{grupo.moneda} {grupo.subtotal.toFixed(2)}</strong>
                            </div>
                        </div>
                    ))}

                    <p className="cart-note">{currentT.note}</p>

                    <div className="cart-footer-summary">
                        <button className="btn-clear-cart" onClick={clearCart}>{currentT.clear}</button>

                        <div className="total-box">
                            <div className="total-row">
                                <span>{currentT.total}:</span>
                                <h3>USD {getTotal().toFixed(2)}</h3>
                            </div>

                            {!showCheckout ? (
                                <button className="btn-checkout-final" onClick={handleProceed}>
                                    {currentT.proceed}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {showCheckout && (
                        <form className="checkout-form" onSubmit={handleConfirmar}>
                            <h3>{currentT.confirm}</h3>
                            {errorMsg && <p className="checkout-error">{errorMsg}</p>}
                            <div className="checkout-grid">
                                <label>
                                    {currentT.name}
                                    <input name="name" value={form.name} onChange={handleFormChange} required />
                                </label>
                                <label>
                                    {currentT.company}
                                    <input name="company" value={form.company} onChange={handleFormChange} />
                                </label>
                                <label>
                                    {currentT.email}
                                    <input type="email" name="email" value={form.email} onChange={handleFormChange} required />
                                </label>
                                <label>
                                    {currentT.phone}
                                    <input name="phone" value={form.phone} onChange={handleFormChange} />
                                </label>
                                <label className="full-width">
                                    {currentT.address}
                                    <textarea name="address" value={form.address} onChange={handleFormChange} required rows={2} />
                                </label>
                                <label>
                                    {currentT.country}
                                    <input name="country" value={form.country} onChange={handleFormChange} />
                                </label>
                            </div>
                            <button type="submit" className="btn-checkout-final" disabled={isProcessing}>
                                {isProcessing ? currentT.processing : currentT.confirm}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default Carrito;
