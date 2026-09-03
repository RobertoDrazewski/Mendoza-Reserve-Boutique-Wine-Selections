import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Los proveedores de contexto (Language/Auth/Cart) viven dentro de App.js,
// junto al Router — así evitamos tener dos instancias de cada contexto
// (una acá y otra en App.js) que antes convivían sin necesidad.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
