-- Migración: crea la tabla `reservas` (pago de la comisión del 12% que el
-- comprador le hace directo a Mendoza Reserve vía Revolut) en una base que ya
-- existe (por ejemplo la de Aiven en producción).
--
-- Uso: pegar y ejecutar esto en la consola SQL de Aiven, o mejor, correr
-- `npm run migrar-reservas` desde backend/ (hace lo mismo por Node, pero
-- primero chequea si la tabla ya existe, así se puede correr más de una vez
-- sin problema).

CREATE TABLE IF NOT EXISTS reservas (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    cart_group_id       CHAR(36) NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    moneda              CHAR(3) NOT NULL DEFAULT 'GBP',
    estado              ENUM('pendiente','pagada','fallida','reembolsada','parcialmente_reembolsada')
                        NOT NULL DEFAULT 'pendiente',
    reembolsado_monto   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    revolut_order_id    VARCHAR(64) UNIQUE,
    checkout_url        TEXT,
    paid_at             DATETIME NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reservas_cart_group ON reservas (cart_group_id);
CREATE INDEX idx_reservas_estado ON reservas (estado);
