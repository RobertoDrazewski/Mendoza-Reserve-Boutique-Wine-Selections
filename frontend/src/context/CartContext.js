import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

// El carrito puede tener vinos de varias bodegas a la vez. Cada item guarda
// su propio bodega_id / bodega_nombre para que el checkout (Carrito.js)
// pueda mostrarlo agrupado por bodega y mandarlo así al backend, que arma
// una orden por bodega dentro de un mismo pedido (cart_group_id).
export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('mendoza_cart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('mendoza_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (vino, cantidad = 1) => {
        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.id === vino.id);
            if (existing) {
                return prevCart.map((item) =>
                    item.id === vino.id
                        ? { ...item, quantity: item.quantity + cantidad }
                        : item
                );
            }
            return [
                ...prevCart,
                {
                    id: vino.id,
                    bodega_id: vino.bodega_id,
                    bodega_nombre: vino.bodega_nombre,
                    bodega_slug: vino.bodega_slug,
                    nombre: vino.nombre,
                    varietal: vino.varietal,
                    cosecha: vino.cosecha,
                    formato: vino.formato,
                    moneda: vino.moneda || 'USD',
                    precio_unitario: Number(vino.precio_unitario),
                    imagen_url: vino.imagen_url,
                    quantity: cantidad
                }
            ];
        });
    };

    const updateQuantity = (vinoId, delta) => {
        setCart((prevCart) =>
            prevCart.reduce((acc, item) => {
                if (item.id !== vinoId) return [...acc, item];
                const nextQty = item.quantity + delta;
                if (nextQty <= 0) return acc;
                return [...acc, { ...item, quantity: nextQty }];
            }, [])
        );
    };

    const removeFromCart = (vinoId) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== vinoId));
    };

    const clearCart = () => {
        localStorage.removeItem('mendoza_cart');
        setCart([]);
    };

    const getTotal = () => cart.reduce((acc, item) => acc + item.precio_unitario * item.quantity, 0);

    const getCartCount = () => cart.reduce((acc, item) => acc + item.quantity, 0);

    // Agrupa el carrito por bodega — así se ve en Carrito.js y así se manda al backend.
    const getGroupedByBodega = () => {
        const groups = {};
        cart.forEach((item) => {
            if (!groups[item.bodega_id]) {
                groups[item.bodega_id] = {
                    bodega_id: item.bodega_id,
                    bodega_nombre: item.bodega_nombre,
                    items: [],
                    subtotal: 0,
                    moneda: item.moneda
                };
            }
            groups[item.bodega_id].items.push(item);
            groups[item.bodega_id].subtotal += item.precio_unitario * item.quantity;
        });
        return Object.values(groups);
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getTotal,
                getCartCount,
                getGroupedByBodega
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
