import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import BodegaDetalle from './components/BodegaDetalle';
import Login from './components/Login';
import Carrito from './components/Carrito';
import OrderTracking from './components/OrderTracking';
import WineryOrderResponse from './components/WineryOrderResponse';
import AdminPanel from './components/admin/AdminPanel';
import BodegaDashboard from './components/bodega/BodegaDashboard';
import CloserDashboard from './components/closer/CloserDashboard';
import MisPedidos from './components/MisPedidos';
import VideoBackdrop from './components/VideoBackdrop';
import FloatingCart from './components/FloatingCart';

import './App.css';
import './styles/GlassPages.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <CartProvider>
            <VideoBackdrop />
            <div className="app-wrapper">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  {/* Todo lo que antes eran páginas sueltas ahora vive dentro del Home, como secciones. */}
                  <Route path="/register" element={<Navigate to="/#registro" replace />} />
                  <Route path="/registro" element={<Navigate to="/#registro" replace />} />
                  <Route path="/bodegas" element={<Navigate to="/#bodegas" replace />} />
                  <Route path="/mapa" element={<Navigate to="/#bodegas" replace />} />
                  <Route path="/vinos" element={<Navigate to="/#vinos" replace />} />
                  <Route path="/historia" element={<Navigate to="/#historia" replace />} />
                  <Route path="/contacto" element={<Navigate to="/#contacto" replace />} />
                  <Route path="/bodega/:id" element={<BodegaDetalle />} />
                  <Route path="/login" element={<Login />} />
                  {/* Alias del mismo login unificado — usados en los links de los emails de
                      bienvenida (registerBodega/registerCloser) para que cada quien entienda
                      a qué panel está entrando; el login en sí es el mismo endpoint para todos. */}
                  <Route path="/bodega/login" element={<Login />} />
                  <Route path="/closer/login" element={<Login />} />
                  <Route path="/admin/login" element={<Login />} />
                  <Route path="/carrito" element={<Carrito />} />

                  {/* Seguimiento de pedido (comprador) — con o sin código en la URL */}
                  <Route path="/seguimiento" element={<OrderTracking />} />
                  <Route path="/seguimiento/:cartGroupId" element={<OrderTracking />} />

                  {/* Historial de pedidos del comprador logueado (invoice incluida) */}
                  <Route path="/mis-pedidos" element={<MisPedidos />} />

                  {/* Link del email a la bodega para aceptar/rechazar un pedido, sin login */}
                  <Route path="/bodega/pedido/:token" element={<WineryOrderResponse />} />

                  {/* Portal de autogestión de la bodega y portal del closer */}
                  <Route path="/bodega/dashboard" element={<BodegaDashboard />} />
                  <Route path="/closer/dashboard" element={<CloserDashboard />} />

                  {/* Panel de administración (Roberto) */}
                  <Route path="/admin" element={<AdminPanel />} />

                  {/* Redirección por defecto */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
            <FloatingCart />
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
