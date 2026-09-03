-- =====================================================================
-- update_bodega_images.sql — asigna una imagen local a las bodegas para
-- las que ya había una foto en frontend/public/images (del proyecto
-- original). El resto de las bodegas usa el placeholder visual del
-- frontend (no hace falta imagen real todavía).
-- Ejecutar DESPUÉS de seed_bodegas.sql.
-- =====================================================================

UPDATE bodegas SET imagen = 'Catena Zapata.jpeg' WHERE slug = 'catena-zapata';
UPDATE bodegas SET imagen = 'ACHAVAL_FERRER_1.jpeg' WHERE slug = 'achaval-ferrer';
UPDATE bodegas SET imagen = 'elenemigo.jpeg' WHERE slug = 'casa-vigil-el-enemigo';
UPDATE bodegas SET imagen = 'Trapiche.jpeg' WHERE slug = 'trapiche';
UPDATE bodegas SET imagen = 'Zuccardi.jpeg' WHERE slug = 'santa-julia-familia-zuccardi';
UPDATE bodegas SET imagen = 'Salentein.jpeg' WHERE slug = 'bodega-salentein';
UPDATE bodegas SET imagen = 'Zuccardi.jpeg' WHERE slug = 'zuccardi-valle-de-uco';
UPDATE bodegas SET imagen = 'agostino.jpeg' WHERE slug = 'casa-agostino';
UPDATE bodegas SET imagen = 'alfacrux.jpeg' WHERE slug = 'alfa-crux';
