-- Migración: agrega la columna descripcion_en (bio en inglés) a una base
-- de bodegas que ya existe (por ejemplo la de Aiven en producción).
-- Es segura de correr más de una vez (IF NOT EXISTS).
--
-- Uso: pegar y ejecutar esto en la consola SQL de Aiven, o correr
-- `npm run migrar-descripcion-en` desde backend/ (hace lo mismo por Node).

ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS descripcion_en TEXT AFTER descripcion;
