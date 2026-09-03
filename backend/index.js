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
const shipmentsRoutes = require('./routes/shipments');
const leadsRoutes = require('./routes/leads'); // CRM interno de leads UK (no público)
const chatRoutes = require('./routes/chat'); // Asistente IA de seguimiento de pedido (Fase 5)

const app = express();
const PORT = process.env.PORT || 4000;

// 1. SEGURIDAD: Permitir carga de recursos externos (Imágenes)
app.use(helmet({ 
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false 
}));

// 2. CONFIGURACIÓN DE CORS
// Este server sirve la API y el build de React desde el MISMO servicio (ver punto 5.1 más
// abajo), así que en producción normal el pedido es same-origin: el navegador igual manda
// el header Origin en POST/PUT/DELETE, pero coincide con el propio Host de la petición.
// Por eso primero comparamos Origin contra Host (siempre permitido, sea cual sea el dominio
// final) y la lista de abajo queda sólo para casos de origen distinto (dev con frontend
// aparte en :3000, o un preview de Render/Railway con otro subdominio).
const allowedOrigins = [
    'https://mendoza-reserve.co.uk',
    'https://www.mendoza-reserve.co.uk',
    'https://mendoza-frontend.onrender.com',
    'https://mendoza-reserve-boutique-wine-selections.onrender.com',
    'http://localhost:3000',
    process.env.EXTRA_CORS_ORIGIN // permite sumar un dominio más por env var, sin tocar código
].filter(Boolean);

// Usamos el "options delegate" de la librería cors (recibe el req real, no sólo el origin)
// para poder comparar el Origin contra el Host de la propia petición y así soportar el
// deploy same-origin sin tener que ir agregando cada subdominio de Railway a mano.
const corsOptionsDelegate = (req, callback) => {
    const origin = req.header('Origin');
    let esMismoOrigen = false;
    if (origin) {
        try {
            esMismoOrigen = new URL(origin).host === req.headers.host;
        } catch (e) {
            esMismoOrigen = false;
        }
    }
    const permitido = !origin || esMismoOrigen || allowedOrigins.includes(origin);
    callback(null, {
        origin: permitido,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    });
};

app.use(cors(corsOptionsDelegate));

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
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/leads', leadsRoutes); // uso interno (admin) — CRM de leads UK
app.use('/api/chat', chatRoutes);

// Ruta de salud del sistema
app.get('/api/health', (req, res) => res.json({
    status: 'online',
    message: 'Mendoza Reserve API is running'
}));

// 5.1 SERVIR EL FRONTEND (build de React) DESDE ESTE MISMO SERVICIO
// Así en Railway alcanza con UN solo servicio: Express expone la API en /api/* y,
// para cualquier otra ruta, sirve el build de React (index.html) — así funciona
// el ruteo del lado del cliente (React Router) también al refrescar la página.
const fs = require('fs');
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
} else {
    // En desarrollo local normalmente corrés `npm start` del frontend aparte (puerto 3000)
    // y no existe frontend/build todavía — no rompe nada, sólo no hay nada que servir en "/".
    app.get('/', (req, res) => res.json({ status: 'online', message: 'Mendoza Reserve API is running (sin build de frontend local)' }));
}

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