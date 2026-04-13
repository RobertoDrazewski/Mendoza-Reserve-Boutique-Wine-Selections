const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/db');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const vinosRoutes = require('./routes/vinos');
const ordersRoutes = require('./routes/orders');
const bodegasRoutes = require('./routes/bodegas'); // <-- Restaurado
const contactoRoutes = require('./routes/contacto'); // <-- Restaurado (por si lo usabas)

const app = express();
const PORT = process.env.PORT || 4000;

// 1. SEGURIDAD: Permitir carga de recursos externos (Imágenes)
app.use(helmet({ 
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false 
}));

// 2. CONFIGURACIÓN DE CORS
const allowedOrigins = [
    'https://mendoza-reserve.co.uk',
    'https://www.mendoza-reserve.co.uk',
    'https://mendoza-frontend.onrender.com',
    'https://mendoza-reserve-boutique-wine-selections.onrender.com',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. CARPETA DE IMÁGENES (Punto Crítico para Render)
// Sirve la carpeta 'images' desde la raíz del backend con permisos CORS
app.use('/images', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*'); 
    next();
}, express.static(path.join(__dirname, 'images')));

// Si usas una subcarpeta public/images, esta línea actúa como respaldo:
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 5. REGISTRO DE RUTAS API
app.use('/api/auth', authRoutes);
app.use('/api/vinos', vinosRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bodegas', bodegasRoutes); // <-- Restaurado (Corrige el error 404)
app.use('/api/contacto', contactoRoutes); // <-- Restaurado

// Ruta de salud del sistema
app.get('/', (req, res) => res.json({ 
    status: 'online',
    message: 'Mendoza Reserve API is running'
}));

// 6. ARRANQUE DEL SERVIDOR
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor Mendoza Reserve corriendo en puerto: ${PORT}`);
    try {
        await db.query('SELECT 1');
        console.log(`✅ Conexión a Base de Datos: EXITOSA`);
    } catch (err) {
        console.error('❌ Error crítico de conexión a DB:', err.message);
    }
});