/**
 * actualizar_imagenes_bodegas.js
 *
 * Carga el campo "imagen" de las bodegas contra la base de datos real (usa
 * las credenciales de backend/.env, las mismas que usa el servidor), para
 * que la tarjeta de cada una en /bodegas muestre una foto real en vez del
 * placeholder con la letra inicial.
 *
 * Hay dos tipos de valor acá:
 *  - un NOMBRE DE ARCHIVO (ej. 'Trapiche.jpeg') -> es una foto que subimos
 *    nosotros a frontend/public/images.
 *  - una URL COMPLETA (http/https) -> es una foto que vive en el sitio
 *    oficial de la bodega; el frontend la muestra directo desde ahí (no
 *    hace falta descargarla ni alojarla nosotros). Se buscaron a mano,
 *    revisando el sitio de cada bodega, priorizando una foto real de la
 *    finca/viñedo/bodega (nunca un logo ni un ícono).
 *
 * Uso (desde la carpeta backend/):
 *   node scripts/actualizar_imagenes_bodegas.js
 *   (o "npm run actualizar-imagenes-bodegas")
 *
 * Es seguro correrlo más de una vez (solo pisa el campo "imagen" de las
 * bodegas listadas abajo, por su slug).
 *
 * IMPORTANTE sobre las URLs externas: son fotos hosteadas en el sitio de
 * cada bodega, no controladas por nosotros. Si la bodega rediseña su sitio
 * o borra esa foto, el link puede quedar roto (el frontend ya tiene un
 * fallback automático al logo genérico en ese caso, así que nunca se ve un
 * ícono de "imagen rota"). Cuando la bodega confirme participación y nos
 * pase fotos propias, conviene reemplazar la URL por un archivo local.
 */
const pool = require('../config/db');

const IMAGENES = {
    // --- Fotos propias, en frontend/public/images ---
    'catena-zapata': 'Catena Zapata.jpeg',
    'achaval-ferrer': 'ACHAVAL_FERRER_1.jpeg',
    'casa-vigil-el-enemigo': 'elenemigo.jpeg',
    'trapiche': 'Trapiche.jpeg',
    'santa-julia-familia-zuccardi': 'Zuccardi.jpeg',
    'bodega-salentein': 'Salentein.jpeg',
    'zuccardi-valle-de-uco': 'Zuccardi.jpeg',
    'casa-agostino': 'agostino.jpeg',
    'alfa-crux': 'alfacrux.jpeg',

    // --- Fotos tomadas del sitio oficial de cada bodega (URL externa) ---
    'bodega-norton': 'https://www.norton.com.ar/wp-content/uploads/2023/09/Bodega-Norton-pano1-1-1.jpg',
    'renacer': 'https://static.wixstatic.com/media/8f2e60_7021a4e601954be984f0dc647f35d3fe~mv2.jpg',
    'pulenta-estate': 'https://www.pulentaestate.com/img/vineyards.jpg',
    'riccitelli-wines': 'https://matiasriccitelli.com/wp-content/uploads/2020/04/05.vineyard.jpg',
    'bressia': 'https://www.bressiabodega.com/img/bressia-bodega.jpg',
    'atamisque': 'https://bodegaatamisque.com/wp-content/uploads/2026/03/bodega-1.jpg',
    'lagarde': 'https://lagarde.com.ar/wp-content/uploads/2025/04/2-4-scaled.webp',
    'tempus-alba': 'https://tempusalba.com/img/tempusalba.com/Articulo/63/bodega1.jpg',
    'familia-cecchin': 'https://static.wixstatic.com/media/fe24ac_1ec0b9cabb9e45b5a72daff8c5631c99~mv2.jpg/v1/fit/w_2500,h_1330,al_c/fe24ac_1ec0b9cabb9e45b5a72daff8c5631c99~mv2.jpg',
    'domaine-bousquet': 'https://domainebousquet.com/wp-content/uploads/2026/02/imgHISTORIAinterior.jpg',
    'andeluna-cellars': 'https://www.andeluna.com.ar/wp-content/uploads/2020/05/BODEGA-ANDELUNA-NEVADA.jpg',
    'the-vines-of-mendoza': 'https://vinesofmendoza.com/wp-content/uploads/2025/05/001.jpg',
    'monteviejo-clos-de-los-siete': 'https://monteviejo.com.ar/files/bodega_general.jpg',
    'casa-de-uco': 'https://casadeuco.com/wp-content/uploads/2021/05/Visita-la-Bodega05-Vineyard-Tasting01-1.jpg',
    'bodega-piedra-negra-francois-lurton': 'https://www.bodegapiedranegra.com/image/piedranegra_images_site/2/fr/accueil-e1_b1_image-background_1440.jpg?1594389476',
    'bodegas-caelum': 'https://bodegacaelum.com.ar/wp-content/uploads/2024/07/Mer-1.jpg',
    'terrazas-de-los-andes': 'https://www.terrazasdelosandes.com/sites/default/files/styles/header_slide_m_/public/media/image/TDLA-PlacaWebRedise%C3%B1o-Extremo100p-2316x1014.jpg.webp',
    'vina-cobos': 'https://vinacobos.com/hubfs/terroirHome.png',
    'bodega-penedo-borges': 'https://penedoborges.com/wp-content/uploads/2022/11/pb2-scaled.jpg',
    'lamadrid-wines': 'https://www.lamadridwines.com/wp-content/uploads/2023/02/Lamadrid_Home_foto_-Agrelo-min.jpg',
    'durigutti-family-winemakers-finca-victoria': 'https://durigutti.com/wp-content/uploads/2026/09/social-image_1200x630.webp',
    'rosell-boher': 'https://rosellboher.com/images/thumbnails/Rosell-Boher-sitio.jpg',
    'altos-las-hormigas': 'https://altoslashormigas.com/wp-content/uploads/2025/05/Alto-Las-Hormigas-Historia.jpg',
    'alta-vista': 'https://altavistawines.com/wp-content/uploads/2024/05/altavistaenero-17-1024x800.jpg',
    'nieto-senetiner': 'https://www.nietosenetiner.com.ar/wp-content/uploads/2021/01/finca-las-tortugas.jpg',
    'casarena': 'https://www.casarena.com/images/home/hero-home.jpg',
    'cheval-des-andes': 'https://www.chevaldesandes.com/wp-content/uploads/2024/12/cheval-des-andes-argentina-mendoza.jpg',
    'bodega-argento': 'https://cdn.prod.website-files.com/6761588337ee7f2746137546/677bdab4ef3ec01fabc0f84b_nuestros-vinedos.avif',
    'septima': 'https://www.bodegaseptima.com/wp-content/uploads/2023/09/Pano-atardecer-1-800x600.jpg',
    'bodegas-caro': 'https://www.lafite.com/wp-content/uploads/2023/01/DSC1106-1-scaled.jpg',
    'finca-flichman': 'https://flichman.com.ar/wp-content/uploads/2023/12/HOME.jpg',
    'domaine-st-diego': 'https://domainestdiego.com/wp-content/uploads/2018/07/slide-1-home-terraza-domaine.jpg',
    'mil-suelos': 'https://milsuelos.com/wp-content/uploads/2025/02/foto-principal-vinedos-scaled.jpg',
    'la-rural-rutini-wines': 'https://bodegalarural.com.ar/wp-content/uploads/2026/02/home-blr2-1-1024x506.jpg',
    'huentala-wines': 'https://huentalawines.com.ar/wp-content/uploads/2025/09/La-Isabel-Estate-768x432.png',
    'bodega-bombal': 'https://bodegabombal.com/wp-content/uploads/2025/05/bodega-bombal-portada-2025.jpg',
    'bodega-la-azul': 'https://bodegalaazul.com/wp-content/uploads/2024/07/0011_bodega-03-1024x684.jpg',
    'corazon-del-sol': 'https://www.corazondelsol.com/wp-content/uploads/2024/12/Home-Header-1.webp',
    'gimenez-riili': 'https://gimenezriili.com/wp-content/uploads/2025/12/Gimenez-Riili-Los-chacayes-Valle-de-Uco-bodega-vino-Mendoza-ArgentinaRecurso-26-50.jpg',
    'bodega-hinojosa': 'https://bodegahinojosa.com/proximamente/wp-content/uploads/2025/11/FOTO-BODEGA-HINOJOSA.jpg',
    'cuvelier-de-los-andes': 'https://cuvelierlosandes.com/public/assets/img/exp00.jpg',
    'bodega-san-polo': 'https://sanpolo.com.ar/wp-content/uploads/2022/11/273591485_495606358864929_6516123423292900504_n.jpg',
    'vinas-del-golf-algodon-wine-estates': 'https://www.algodonwineestates.com/wp-content/uploads/2024/02/0G3A8180-1500x1000-1-1024x683.jpg',
    'valentin-bianchi': 'https://cdn.shopify.com/s/files/1/0592/3481/2066/files/sherade.jpg?v=1634135155',
    'bodega-la-abeja': 'https://www.bodegalaabeja.com.ar/wp-content/uploads/2024/10/foto27a-1.jpg',
    'bodega-jean-rivier': 'https://www.jeanrivier.com/img/slider_home/slider_tributo.jpg',
    'bodega-haarth': 'https://haarthwines.com/wp-content/uploads/2023/09/DSCF4460-cr.jpg',
    'bodega-familia-anaya-viejas-cepas': 'https://www.viejascepas.com.ar/images/Img-Home-3.jpg',
    'bodega-weinert-cavas-de-weinert': 'https://bodegaweinert.com/cdn/shop/files/banner_home_960x850_5ab1bc24-ca46-4e47-a185-a53636378ec7.jpg?v=1745250217',
    'diamandes': 'https://www.diamandes.com/wp-content/uploads/2022/12/bodega-diamandes.jpg',
    'flechas-de-los-andes': 'https://flechasdelosandes.com/wp-content/uploads/2021/04/MG_5120pano.jpg',
};

(async () => {
    console.log(`Actualizando imagen de ${Object.keys(IMAGENES).length} bodegas...\n`);
    let actualizadas = 0;
    let sinCoincidencia = [];

    for (const [slug, valor] of Object.entries(IMAGENES)) {
        try {
            const [result] = await pool.query(
                'UPDATE bodegas SET imagen = ? WHERE slug = ?',
                [valor, slug]
            );
            if (result.affectedRows > 0) {
                console.log(`✔ ${slug}`);
                actualizadas += result.affectedRows;
            } else {
                sinCoincidencia.push(slug);
                console.log(`✘ ${slug} — no se encontró ninguna bodega con ese slug`);
            }
        } catch (err) {
            console.error(`✘ Error actualizando ${slug}:`, err.message);
        }
    }

    console.log(`\n${actualizadas} fila(s) actualizada(s).`);
    if (sinCoincidencia.length) {
        console.log(`Slugs sin coincidencia (revisá el nombre exacto en la tabla "bodegas"): ${sinCoincidencia.join(', ')}`);
    }

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM bodegas');
    const [[{ conImagen }]] = await pool.query("SELECT COUNT(*) AS conImagen FROM bodegas WHERE imagen IS NOT NULL AND imagen <> ''");
    console.log(`\nEstado actual: ${conImagen} de ${total} bodegas tienen imagen asignada.`);
    console.log('El resto sigue mostrando el placeholder con la letra inicial (no tienen sitio web, o su sitio no tenía ninguna foto usable).');

    process.exit(0);
})().catch((err) => {
    console.error('Error de conexión:', err.message);
    process.exit(1);
});
