-- =====================================================================
-- update_bodega_images.sql — asigna una imagen a las bodegas: fotos
-- propias en frontend/public/images (nombre de archivo) para las 9 que
-- ya teníamos, y fotos tomadas directo del sitio oficial de cada bodega
-- (URL completa) para las otras 51 encontradas automáticamente.
-- Alternativa a correr el script backend/scripts/actualizar_imagenes_bodegas.js
-- (hace lo mismo, pero desde código). Ejecutar DESPUÉS de seed_bodegas.sql.
-- =====================================================================

-- --- Fotos propias, en frontend/public/images ---
UPDATE bodegas SET imagen = 'Catena Zapata.jpeg' WHERE slug = 'catena-zapata';
UPDATE bodegas SET imagen = 'ACHAVAL_FERRER_1.jpeg' WHERE slug = 'achaval-ferrer';
UPDATE bodegas SET imagen = 'elenemigo.jpeg' WHERE slug = 'casa-vigil-el-enemigo';
UPDATE bodegas SET imagen = 'Trapiche.jpeg' WHERE slug = 'trapiche';
UPDATE bodegas SET imagen = 'Zuccardi.jpeg' WHERE slug = 'santa-julia-familia-zuccardi';
UPDATE bodegas SET imagen = 'Salentein.jpeg' WHERE slug = 'bodega-salentein';
UPDATE bodegas SET imagen = 'Zuccardi.jpeg' WHERE slug = 'zuccardi-valle-de-uco';
UPDATE bodegas SET imagen = 'agostino.jpeg' WHERE slug = 'casa-agostino';
UPDATE bodegas SET imagen = 'alfacrux.jpeg' WHERE slug = 'alfa-crux';

-- --- Fotos tomadas del sitio oficial de cada bodega (URL externa) ---
UPDATE bodegas SET imagen = 'https://www.norton.com.ar/wp-content/uploads/2023/09/Bodega-Norton-pano1-1-1.jpg' WHERE slug = 'bodega-norton';
UPDATE bodegas SET imagen = 'https://static.wixstatic.com/media/8f2e60_7021a4e601954be984f0dc647f35d3fe~mv2.jpg' WHERE slug = 'renacer';
UPDATE bodegas SET imagen = 'https://www.pulentaestate.com/img/vineyards.jpg' WHERE slug = 'pulenta-estate';
UPDATE bodegas SET imagen = 'https://matiasriccitelli.com/wp-content/uploads/2020/04/05.vineyard.jpg' WHERE slug = 'riccitelli-wines';
UPDATE bodegas SET imagen = 'https://www.bressiabodega.com/img/bressia-bodega.jpg' WHERE slug = 'bressia';
UPDATE bodegas SET imagen = 'https://bodegaatamisque.com/wp-content/uploads/2026/03/bodega-1.jpg' WHERE slug = 'atamisque';
UPDATE bodegas SET imagen = 'https://lagarde.com.ar/wp-content/uploads/2025/04/2-4-scaled.webp' WHERE slug = 'lagarde';
UPDATE bodegas SET imagen = 'https://tempusalba.com/img/tempusalba.com/Articulo/63/bodega1.jpg' WHERE slug = 'tempus-alba';
UPDATE bodegas SET imagen = 'https://static.wixstatic.com/media/fe24ac_1ec0b9cabb9e45b5a72daff8c5631c99~mv2.jpg/v1/fit/w_2500,h_1330,al_c/fe24ac_1ec0b9cabb9e45b5a72daff8c5631c99~mv2.jpg' WHERE slug = 'familia-cecchin';
UPDATE bodegas SET imagen = 'https://domainebousquet.com/wp-content/uploads/2026/02/imgHISTORIAinterior.jpg' WHERE slug = 'domaine-bousquet';
UPDATE bodegas SET imagen = 'https://www.andeluna.com.ar/wp-content/uploads/2020/05/BODEGA-ANDELUNA-NEVADA.jpg' WHERE slug = 'andeluna-cellars';
UPDATE bodegas SET imagen = 'https://vinesofmendoza.com/wp-content/uploads/2025/05/001.jpg' WHERE slug = 'the-vines-of-mendoza';
UPDATE bodegas SET imagen = 'https://monteviejo.com.ar/files/bodega_general.jpg' WHERE slug = 'monteviejo-clos-de-los-siete';
UPDATE bodegas SET imagen = 'https://casadeuco.com/wp-content/uploads/2021/05/Visita-la-Bodega05-Vineyard-Tasting01-1.jpg' WHERE slug = 'casa-de-uco';
UPDATE bodegas SET imagen = 'https://www.bodegapiedranegra.com/image/piedranegra_images_site/2/fr/accueil-e1_b1_image-background_1440.jpg?1594389476' WHERE slug = 'bodega-piedra-negra-francois-lurton';
UPDATE bodegas SET imagen = 'https://bodegacaelum.com.ar/wp-content/uploads/2024/07/Mer-1.jpg' WHERE slug = 'bodegas-caelum';
UPDATE bodegas SET imagen = 'https://www.terrazasdelosandes.com/sites/default/files/styles/header_slide_m_/public/media/image/TDLA-PlacaWebRedise%C3%B1o-Extremo100p-2316x1014.jpg.webp' WHERE slug = 'terrazas-de-los-andes';
UPDATE bodegas SET imagen = 'https://vinacobos.com/hubfs/terroirHome.png' WHERE slug = 'vina-cobos';
UPDATE bodegas SET imagen = 'https://penedoborges.com/wp-content/uploads/2022/11/pb2-scaled.jpg' WHERE slug = 'bodega-penedo-borges';
UPDATE bodegas SET imagen = 'https://www.lamadridwines.com/wp-content/uploads/2023/02/Lamadrid_Home_foto_-Agrelo-min.jpg' WHERE slug = 'lamadrid-wines';
UPDATE bodegas SET imagen = 'https://durigutti.com/wp-content/uploads/2026/09/social-image_1200x630.webp' WHERE slug = 'durigutti-family-winemakers-finca-victoria';
UPDATE bodegas SET imagen = 'https://rosellboher.com/images/thumbnails/Rosell-Boher-sitio.jpg' WHERE slug = 'rosell-boher';
UPDATE bodegas SET imagen = 'https://altoslashormigas.com/wp-content/uploads/2025/05/Alto-Las-Hormigas-Historia.jpg' WHERE slug = 'altos-las-hormigas';
UPDATE bodegas SET imagen = 'https://altavistawines.com/wp-content/uploads/2024/05/altavistaenero-17-1024x800.jpg' WHERE slug = 'alta-vista';
UPDATE bodegas SET imagen = 'https://www.nietosenetiner.com.ar/wp-content/uploads/2021/01/finca-las-tortugas.jpg' WHERE slug = 'nieto-senetiner';
UPDATE bodegas SET imagen = 'https://www.casarena.com/images/home/hero-home.jpg' WHERE slug = 'casarena';
UPDATE bodegas SET imagen = 'https://www.chevaldesandes.com/wp-content/uploads/2024/12/cheval-des-andes-argentina-mendoza.jpg' WHERE slug = 'cheval-des-andes';
UPDATE bodegas SET imagen = 'https://cdn.prod.website-files.com/6761588337ee7f2746137546/677bdab4ef3ec01fabc0f84b_nuestros-vinedos.avif' WHERE slug = 'bodega-argento';
UPDATE bodegas SET imagen = 'https://www.bodegaseptima.com/wp-content/uploads/2023/09/Pano-atardecer-1-800x600.jpg' WHERE slug = 'septima';
UPDATE bodegas SET imagen = 'https://www.lafite.com/wp-content/uploads/2023/01/DSC1106-1-scaled.jpg' WHERE slug = 'bodegas-caro';
UPDATE bodegas SET imagen = 'https://flichman.com.ar/wp-content/uploads/2023/12/HOME.jpg' WHERE slug = 'finca-flichman';
UPDATE bodegas SET imagen = 'https://domainestdiego.com/wp-content/uploads/2018/07/slide-1-home-terraza-domaine.jpg' WHERE slug = 'domaine-st-diego';
UPDATE bodegas SET imagen = 'https://milsuelos.com/wp-content/uploads/2025/02/foto-principal-vinedos-scaled.jpg' WHERE slug = 'mil-suelos';
UPDATE bodegas SET imagen = 'https://bodegalarural.com.ar/wp-content/uploads/2026/02/home-blr2-1-1024x506.jpg' WHERE slug = 'la-rural-rutini-wines';
UPDATE bodegas SET imagen = 'https://huentalawines.com.ar/wp-content/uploads/2025/09/La-Isabel-Estate-768x432.png' WHERE slug = 'huentala-wines';
UPDATE bodegas SET imagen = 'https://bodegabombal.com/wp-content/uploads/2025/05/bodega-bombal-portada-2025.jpg' WHERE slug = 'bodega-bombal';
UPDATE bodegas SET imagen = 'https://bodegalaazul.com/wp-content/uploads/2024/07/0011_bodega-03-1024x684.jpg' WHERE slug = 'bodega-la-azul';
UPDATE bodegas SET imagen = 'https://www.corazondelsol.com/wp-content/uploads/2024/12/Home-Header-1.webp' WHERE slug = 'corazon-del-sol';
UPDATE bodegas SET imagen = 'https://gimenezriili.com/wp-content/uploads/2025/12/Gimenez-Riili-Los-chacayes-Valle-de-Uco-bodega-vino-Mendoza-ArgentinaRecurso-26-50.jpg' WHERE slug = 'gimenez-riili';
UPDATE bodegas SET imagen = 'https://bodegahinojosa.com/proximamente/wp-content/uploads/2025/11/FOTO-BODEGA-HINOJOSA.jpg' WHERE slug = 'bodega-hinojosa';
UPDATE bodegas SET imagen = 'https://cuvelierlosandes.com/public/assets/img/exp00.jpg' WHERE slug = 'cuvelier-de-los-andes';
UPDATE bodegas SET imagen = 'https://sanpolo.com.ar/wp-content/uploads/2022/11/273591485_495606358864929_6516123423292900504_n.jpg' WHERE slug = 'bodega-san-polo';
UPDATE bodegas SET imagen = 'https://www.algodonwineestates.com/wp-content/uploads/2024/02/0G3A8180-1500x1000-1-1024x683.jpg' WHERE slug = 'vinas-del-golf-algodon-wine-estates';
UPDATE bodegas SET imagen = 'https://cdn.shopify.com/s/files/1/0592/3481/2066/files/sherade.jpg?v=1634135155' WHERE slug = 'valentin-bianchi';
UPDATE bodegas SET imagen = 'https://www.bodegalaabeja.com.ar/wp-content/uploads/2024/10/foto27a-1.jpg' WHERE slug = 'bodega-la-abeja';
UPDATE bodegas SET imagen = 'https://www.jeanrivier.com/img/slider_home/slider_tributo.jpg' WHERE slug = 'bodega-jean-rivier';
UPDATE bodegas SET imagen = 'https://haarthwines.com/wp-content/uploads/2023/09/DSCF4460-cr.jpg' WHERE slug = 'bodega-haarth';
UPDATE bodegas SET imagen = 'https://www.viejascepas.com.ar/images/Img-Home-3.jpg' WHERE slug = 'bodega-familia-anaya-viejas-cepas';
UPDATE bodegas SET imagen = 'https://bodegaweinert.com/cdn/shop/files/banner_home_960x850_5ab1bc24-ca46-4e47-a185-a53636378ec7.jpg?v=1745250217' WHERE slug = 'bodega-weinert-cavas-de-weinert';
UPDATE bodegas SET imagen = 'https://www.diamandes.com/wp-content/uploads/2022/12/bodega-diamandes.jpg' WHERE slug = 'diamandes';
UPDATE bodegas SET imagen = 'https://flechasdelosandes.com/wp-content/uploads/2021/04/MG_5120pano.jpg' WHERE slug = 'flechas-de-los-andes';
