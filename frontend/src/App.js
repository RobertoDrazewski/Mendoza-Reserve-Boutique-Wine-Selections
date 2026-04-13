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
                  {/* ✅ SOLUCIÓN: Definimos las dos variantes (Inglés y Español) */}
                  {/* Esto evita que el comodín "*" te mande al Home si haces clic en el Navbar viejo */}
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