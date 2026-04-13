import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Importamos los proveedores de contexto
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext'; // <--- Importamos el nuevo contexto

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <CartProvider> {/* <--- Agregamos el proveedor del carrito */}
          <App />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);