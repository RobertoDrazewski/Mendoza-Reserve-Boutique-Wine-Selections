import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('mendoza_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('mendoza_cart', JSON.stringify(cart));
        // LOG DE DEPURACIÓN: Verás en la consola si el carrito tiene las imágenes
        console.log("🛒 Carrito actualizado en LocalStorage:", cart);
    }, [cart]);

    const addToCart = (product) => {
        setCart((prevCart) => {
            const isItemInCart = prevCart.find((item) => item.id === product.id);

            if (isItemInCart) {
                return prevCart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            // ASEGURAMOS QUE EL OBJETO LLEVE LA IMAGEN
            // Si el componente Vinos lo muestra bien, aquí nos aseguramos de guardarlo
            return [...prevCart, { 
                ...product, 
                quantity: 1,
                // Si por alguna razón la prop se llama distinto en la DB, 
                // aquí la normalizamos a imagen_url
                imagen_url: product.imagen_url || product.imagen 
            }];
        });
    };

    const removeFromCart = (productId) => {
        setCart((prevCart) => {
            return prevCart.reduce((acc, item) => {
                if (item.id === productId) {
                    if (item.quantity === 1) return acc;
                    return [...acc, { ...item, quantity: item.quantity - 1 }];
                }
                return [...acc, item];
            }, []);
        });
    };

    const clearCart = () => {
        localStorage.removeItem('mendoza_cart'); // Limpieza forzada
        setCart([]);
    };

    const getTotal = () => {
        return cart.reduce((acc, item) => acc + item.precio * item.quantity, 0);
    };

    const getCartCount = () => {
        return cart.reduce((acc, item) => acc + item.quantity, 0);
    };

    return (
        <CartContext.Provider value={{ 
            cart, 
            addToCart, 
            removeFromCart, 
            clearCart, 
            getTotal, 
            getCartCount 
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);