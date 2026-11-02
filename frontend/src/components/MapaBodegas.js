import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';
import '../styles/MapaBodegas.css';

// Coordenadas aproximadas (centro) de cada zona vitivinícola de Mendoza tal
// como aparecen en nuestra base de datos (backend/sql/seed_bodegas.sql).
// No es geocodificación por dirección exacta calle por calle — eso requiere
// una API de mapas paga (Google Places con facturación habilitada) que hoy
// no tenemos — sino el centro aproximado de cada departamento/zona, para
// agrupar visualmente las bodegas "por zona" tal como se pidió.
const ZONA_COORDS = {
    'Luján de Cuyo': [-33.0333, -68.8833],
    'Maipú': [-32.9833, -68.7833],
    'Godoy Cruz': [-32.9264, -68.8306],
    'Guaymallén': [-32.9019, -68.8064],
    'Zona Este': [-33.1400, -68.4700],
    'Valle de Uco': [-33.5500, -69.0500],
    'San Rafael': [-34.6177, -68.3301],
    'General Alvear': [-34.9756, -67.6892],
};
// Centro aproximado de la provincia, sólo por si aparece alguna zona nueva
// que todavía no está en la tabla de arriba.
const ZONA_FALLBACK = [-33.6, -68.9];

// Dos capas de mapa para elegir: satelital (por defecto, para ver fincas/viñedos
// reales) y calles (OpenStreetMap, como estaba antes). Las dos son gratuitas y no
// piden API key ni cuenta con billing (a diferencia de Google Maps satelital).
const TILE_LAYERS = {
    satelital: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
    },
    calles: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    },
};

function coordsForZona(zona) {
    if (!zona) return ZONA_FALLBACK;
    if (ZONA_COORDS[zona]) return ZONA_COORDS[zona];
    // Algunas filas combinan dos departamentos ("General Alvear / Rivadavia") —
    // probamos con el primero de la lista.
    const primero = zona.split('/')[0].trim();
    return ZONA_COORDS[primero] || ZONA_FALLBACK;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const MapaBodegas = () => {
    const [bodegas, setBodegas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapDivRef = useRef(null);
    const mapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const [vista, setVista] = useState('satelital');
    const { lang } = useLanguage();

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const t = {
        es: {
            title: 'Mapa de Bodegas',
            subtitle: 'Toda nuestra red de bodegas boutique de Mendoza, agrupadas por zona vitivinícola.',
            loading: 'Cargando mapa...',
            error: 'Error de conexión.',
            wineries: 'bodegas',
            active: 'con catálogo activo',
            activeShort: 'activas',
            comingSoon: 'próximamente',
            legendTitle: 'Zonas',
            viewSatellite: 'Satelital',
            viewStreets: 'Calles',
        },
        en: {
            title: 'Winery Map',
            subtitle: 'Our full network of Mendoza boutique wineries, grouped by wine region.',
            loading: 'Loading map...',
            error: 'Connection error.',
            wineries: 'wineries',
            active: 'active catalogue',
            activeShort: 'active',
            comingSoon: 'coming soon',
            legendTitle: 'Regions',
            viewSatellite: 'Satellite',
            viewStreets: 'Streets',
        },
    };
    const currentT = t[lang] || t['es'];

    useEffect(() => {
        const fetchBodegas = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/bodegas/mapa`);
                setBodegas(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error al cargar el mapa de bodegas:', err);
                setError(currentT.error);
            } finally {
                setLoading(false);
            }
        };
        fetchBodegas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL]);

    // Agrupa las bodegas por zona
    const zonas = useMemo(() => {
        const grupos = new Map();
        bodegas.forEach((b) => {
            const zona = b.zona || (lang === 'en' ? 'Other' : 'Otras');
            if (!grupos.has(zona)) grupos.set(zona, []);
            grupos.get(zona).push(b);
        });
        return Array.from(grupos.entries()).map(([zona, items]) => ({
            zona,
            items,
            coords: coordsForZona(zona),
            activas: items.filter((b) => b.estado === 'activa').length,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodegas, lang]);

    // Inicializa/actualiza el mapa de Leaflet cada vez que cambian las zonas
    useEffect(() => {
        if (!mapDivRef.current || zonas.length === 0) return undefined;

        if (!mapRef.current) {
            mapRef.current = L.map(mapDivRef.current, {
                scrollWheelZoom: false,
            }).setView([-33.6, -68.9], 8);
            // La capa base (satelital/calles) la agrega el efecto de abajo, que
            // reacciona a "vista" — así se puede cambiar de capa sin recrear el mapa.
        }

        const map = mapRef.current;
        const markers = [];

        zonas.forEach(({ zona, items, coords, activas }) => {
            const icon = L.divIcon({
                className: 'mapa-bodega-marker',
                html: `<div class="mapa-bodega-marker-badge">${items.length}</div>`,
                iconSize: [38, 38],
                iconAnchor: [19, 19],
                popupAnchor: [0, -16],
            });

            const listaHtml = items
                .slice()
                .sort((a, b) => (b.estado === 'activa') - (a.estado === 'activa') || a.nombre.localeCompare(b.nombre))
                .map((b) => {
                    const nombre = escapeHtml(b.nombre);
                    if (b.estado === 'activa') {
                        return `<li><a href="/bodega/${escapeHtml(b.slug)}">${nombre}</a></li>`;
                    }
                    return `<li class="mapa-popup-inactiva">${nombre} <span>· ${currentT.comingSoon}</span></li>`;
                })
                .join('');

            const popupHtml = `
                <div class="mapa-popup">
                    <h4>${escapeHtml(zona)}</h4>
                    <p class="mapa-popup-count">${items.length} ${currentT.wineries} · ${activas} ${currentT.active}</p>
                    <ul class="mapa-popup-lista">${listaHtml}</ul>
                </div>
            `;

            const marker = L.marker(coords, { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 280 });
            markers.push(marker);
        });

        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.25));
        }

        return () => {
            markers.forEach((m) => map.removeLayer(m));
        };
    }, [zonas, currentT]);

    // Cambia la capa base (satelital/calles) cuando el usuario elige otra vista, y
    // también la primera vez que el mapa se crea (zonas.length pasa de 0 a >0, que es
    // cuando el efecto de arriba instancia mapRef.current).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }
        const capa = TILE_LAYERS[vista] || TILE_LAYERS.satelital;
        tileLayerRef.current = L.tileLayer(capa.url, {
            attribution: capa.attribution,
            maxZoom: capa.maxZoom,
        }).addTo(map);
        tileLayerRef.current.bringToBack();

        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vista, zonas.length]);

    // Limpieza del mapa al desmontar el componente
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    if (loading) return (
        <div className="status-message">
            <span className="status-message-text">{currentT.loading}</span>
        </div>
    );
    if (error) return (
        <div className="status-message error">
            <span className="status-message-text">{error}</span>
        </div>
    );

    return (
        <div className="mapa-page">
            <div className="mapa-hero-inner">
                <h1>{currentT.title}</h1>
                <p className="mapa-subtitle">{currentT.subtitle}</p>
            </div>

            <div className="mapa-container">
                <div className="mapa-panel">
                    <div className="mapa-leaflet-wrap">
                        <div ref={mapDivRef} className="mapa-leaflet" />
                        <div className="mapa-vista-toggle">
                            <button
                                type="button"
                                className={vista === 'satelital' ? 'active' : ''}
                                onClick={() => setVista('satelital')}
                            >
                                🛰 {currentT.viewSatellite}
                            </button>
                            <button
                                type="button"
                                className={vista === 'calles' ? 'active' : ''}
                                onClick={() => setVista('calles')}
                            >
                                🗺 {currentT.viewStreets}
                            </button>
                        </div>
                    </div>

                    <div className="mapa-legend">
                        <h3>{currentT.legendTitle}</h3>
                        <ul>
                            {zonas
                                .slice()
                                .sort((a, b) => b.items.length - a.items.length)
                                .map(({ zona, items, activas }) => (
                                    <li key={zona}>
                                        <span className="mapa-legend-dot" />
                                        <span className="mapa-legend-zona">{zona}</span>
                                        <span className="mapa-legend-count">{items.length} · {activas} {currentT.activeShort}</span>
                                    </li>
                                ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapaBodegas;
