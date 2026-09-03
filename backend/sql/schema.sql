-- =====================================================================
-- Mendoza Reserve — esquema de base de datos (MySQL / MariaDB / Aiven)
-- Marketplace de comisión: bodegas boutique de Mendoza <-> compradores UK
--
-- v1 de pagos: el comprador paga/coordina el envío directo con la bodega;
-- la plataforma cobra una comisión a la bodega (facturada aparte, no se
-- procesa dinero de terceros en este esquema todavía).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- usuarios: compradores + admin (Roberto). Las bodegas NO tienen login
-- en v1 (actúan por email con accept_token) — ver tabla `orders`.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100),
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    rol             ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
    empresa         VARCHAR(150),               -- nombre del restaurante/negocio comprador (UK)
    telefono        VARCHAR(50),
    pais            VARCHAR(80) DEFAULT 'United Kingdom',
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    fecha_registro  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- mensajes_contacto: formulario de contacto público del sitio (ya
-- existía en el proyecto original — se conserva).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_contacto (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    asunto          VARCHAR(200),
    mensaje         TEXT NOT NULL,
    fecha_envio     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- bodegas: catálogo de bodegas de Mendoza. Empiezan en 'pendiente_contacto'
-- y sólo se muestran públicamente cuando estado = 'activa'.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bodegas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    slug            VARCHAR(170) NOT NULL UNIQUE,
    zona            VARCHAR(100),
    subzona         VARCHAR(120),
    direccion       VARCHAR(255),
    telefono        VARCHAR(60),
    whatsapp        VARCHAR(60),
    email           VARCHAR(150),
    sitio_web       VARCHAR(255),
    descripcion     TEXT,                       -- texto largo para la ficha de bodega
    logo_url        VARCHAR(255),
    imagen          VARCHAR(255),                -- imagen de portada (compat con frontend existente)
    comision_pct    DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    estado          ENUM('pendiente_contacto','contactada','activa','inactiva','rechazada')
                    NOT NULL DEFAULT 'pendiente_contacto',
    contacto_nombre VARCHAR(120),                -- persona de contacto en la bodega
    notas           TEXT,
    fecha_alta      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_activacion DATETIME NULL,
    UNIQUE KEY uq_bodega_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bodegas_estado ON bodegas (estado);

-- ---------------------------------------------------------------------
-- vinos: catálogo de cada bodega. Sólo se muestran si activo=1 y la
-- bodega está 'activa'.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    bodega_id       INT NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    varietal        VARCHAR(100),
    cosecha         SMALLINT,                     -- año / vintage
    descripcion     TEXT,
    formato         ENUM('botella','caja6','caja12') NOT NULL DEFAULT 'botella',
    moneda          CHAR(3) NOT NULL DEFAULT 'USD',
    precio_unitario DECIMAL(10,2) NOT NULL,        -- precio del formato indicado
    stock           INT NOT NULL DEFAULT 0,
    imagen_url      VARCHAR(255),
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vinos_bodega FOREIGN KEY (bodega_id) REFERENCES bodegas(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vinos_bodega ON vinos (bodega_id);
CREATE INDEX idx_vinos_activo ON vinos (activo);

-- ---------------------------------------------------------------------
-- orders: UNA fila por BODEGA dentro de un mismo pedido del comprador.
-- Si el carrito tiene vinos de 2 bodegas, se generan 2 filas con el
-- mismo cart_group_id (así el comprador ve "1 pedido", la bodega sólo
-- ve lo suyo, y la comisión se calcula por bodega).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    cart_group_id       CHAR(36) NOT NULL,          -- UUID que agrupa el pedido completo del comprador
    user_id             INT NULL,                   -- NULL permitido: compra como invitado
    bodega_id           INT NOT NULL,
    subtotal            DECIMAL(10,2) NOT NULL,
    moneda              CHAR(3) NOT NULL DEFAULT 'USD',
    comision_pct_aplicada DECIMAL(5,2) NOT NULL,
    comision_monto       DECIMAL(10,2) NOT NULL,
    comision_estado       ENUM('pendiente','facturada','pagada') NOT NULL DEFAULT 'pendiente',
    estado              ENUM('pendiente_bodega','confirmada','en_preparacion','enviada',
                              'en_transito','entregada','cancelada')
                        NOT NULL DEFAULT 'pendiente_bodega',
    buyer_name          VARCHAR(150) NOT NULL,
    buyer_company       VARCHAR(150),
    buyer_email         VARCHAR(150) NOT NULL,
    buyer_phone         VARCHAR(60),
    shipping_address    TEXT NOT NULL,
    shipping_country    VARCHAR(80) NOT NULL DEFAULT 'United Kingdom',
    accept_token        CHAR(64) NOT NULL UNIQUE,   -- token para que la bodega confirme sin login
    notas_bodega         TEXT,                       -- comentario opcional de la bodega al confirmar/rechazar
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at         DATETIME NULL,
    CONSTRAINT fk_orders_bodega FOREIGN KEY (bodega_id) REFERENCES bodegas(id),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_cart_group ON orders (cart_group_id);
CREATE INDEX idx_orders_bodega ON orders (bodega_id);
CREATE INDEX idx_orders_estado ON orders (estado);
CREATE INDEX idx_orders_user ON orders (user_id);

-- ---------------------------------------------------------------------
-- order_items: líneas de un pedido (siempre vinos de la misma bodega
-- que el order al que pertenecen).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    vino_id         INT NOT NULL,
    bodega_id       INT NOT NULL,
    cantidad        INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,        -- snapshot del precio al momento de la compra
    CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_vino FOREIGN KEY (vino_id) REFERENCES vinos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_items_order ON order_items (order_id);

-- ---------------------------------------------------------------------
-- shipments: seguimiento de envío, 1 a 1 con orders (cada bodega envía
-- lo suyo por separado).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_id            INT NOT NULL UNIQUE,
    carrier             VARCHAR(100),
    tracking_number     VARCHAR(150),
    tracking_url        VARCHAR(255),
    status              ENUM('preparando','enviado','en_transito','entregado','incidencia')
                        NOT NULL DEFAULT 'preparando',
    shipped_at          DATETIME NULL,
    estimated_delivery  DATE NULL,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- leads_uk: CRM interno de Roberto (NO público) para la campaña de
-- mails en frío a compradores potenciales en UK.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads_uk (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre_contacto VARCHAR(150),
    negocio         VARCHAR(150) NOT NULL,
    tipo            ENUM('restaurante','importador','tienda','distribuidor','otro') NOT NULL DEFAULT 'restaurante',
    email           VARCHAR(150),
    telefono        VARCHAR(60),
    ciudad          VARCHAR(100),
    sitio_web       VARCHAR(255),
    estado          ENUM('no_contactado','contactado','interesado','cliente','descartado')
                    NOT NULL DEFAULT 'no_contactado',
    notas           TEXT,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_contacto DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_leads_estado ON leads_uk (estado);

SET FOREIGN_KEY_CHECKS = 1;
