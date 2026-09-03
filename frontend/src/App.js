import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import BodegasLista from './components/BodegasLista';
import BodegaDetalle from './components/BodegaDetalle';
import Vinos from './components/Vinos';
import Historia from './components/Historia';
import Contacto from './components/Contacto';
import Login from './components/Login';
import Register from './components/Register';
import Carrito from './components/Carrito';
import OrderTracking from './components/OrderTracking';
import WineryOrderResponse from './components/WineryOrderResponse';
import AdminPanel from './components/admin/AdminPanel';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <CartProvider>
            <div className="app-wrapper">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/register" element={<Register />} />
                  <Route path="/registro" element={<Register />} />

                  <Route path="/" element={<Home />} />
                  <Route path="/bodegas" element={<BodegasLista />} />
                  <Route path="/bodega/:id" element={<BodegaDetalle />} />
                  <Route path="/vinos" element={<Vinos />} />
                  <Route path="/historia" element={<Historia />} />
                  <Route path="/contacto" element={<Contacto />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/carrito" element={<Carrito />} />

                  {/* Seguimiento de pedido (comprador) — con o sin código en la URL */}
                  <Route path="/seguimiento" element={<OrderTracking />} />
                  <Route path="/seguimiento/:cartGroupId" element={<OrderTracking />} />

                  {/* Link del email a la bodega para aceptar/rechazar un pedido, sin login */}
                  <Route path="/bodega/pedido/:token" element={<WineryOrderResponse />} />

                  {/* Panel de administración (Roberto) */}
                  <Route path="/admin" element={<AdminPanel />} />

                  {/* Redirección por defecto */}
                  <Route path="*" element={<Home />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
