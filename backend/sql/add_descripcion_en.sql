-- Migración: agrega la columna descripcion_en (bio en inglés) a una base
-- de bodegas que ya existe (por ejemplo la de Aiven en producción).
--
-- Uso: pegar y ejecutar esto en la consola SQL de Aiven, o mejor, correr
-- `npm run migrar-descripcion-en` desde backend/ (hace lo mismo por Node,
-- pero primero chequea si la columna ya existe, así se puede correr más
-- de una vez sin problema).
--
-- OJO si lo corrés a mano acá: si la columna ya existe, este ALTER va a
-- fallar con "Duplicate column name" — es la señal de que ya está aplicada,
-- no rompe nada, solo no lo corras dos veces.

ALTER TABLE bodegas ADD COLUMN descripcion_en TEXT AFTER descripcion;
