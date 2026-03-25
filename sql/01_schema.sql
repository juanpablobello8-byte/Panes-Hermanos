BEGIN;

-- =========================================================
-- ROLES Y SEGURIDAD
-- =========================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    permisos JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dni_nie VARCHAR(30) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(150) UNIQUE,
    puesto VARCHAR(80),
    fecha_contratacion DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SUCURSALES Y CAJAS
-- =========================================================

CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cajas_fisicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON UPDATE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_caja_por_sucursal UNIQUE (sucursal_id, nombre)
);

CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID NOT NULL REFERENCES cajas_fisicas(id) ON UPDATE CASCADE,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON UPDATE CASCADE,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMPTZ,
    monto_apertura NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_apertura >= 0),
    monto_cierre_esperado NUMERIC(12,2) CHECK (monto_cierre_esperado >= 0),
    monto_cierre_real NUMERIC(12,2) CHECK (monto_cierre_real >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
    observaciones TEXT,
    CONSTRAINT chk_turno_estado CHECK (estado IN ('ABIERTO', 'CERRADO', 'CANCELADO'))
);

-- =========================================================
-- CATÁLOGO
-- =========================================================

CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_padre_id UUID REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE impuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje >= 0)
);

CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nit_rfc VARCHAR(30) UNIQUE,
    razon_social VARCHAR(150) NOT NULL,
    nombre_contacto VARCHAR(120),
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    impuesto_id UUID REFERENCES impuestos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL ON UPDATE CASCADE,
    codigo_barras VARCHAR(100) UNIQUE,
    sku VARCHAR(60) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    es_servicio BOOLEAN NOT NULL DEFAULT FALSE,
    precio_venta_base NUMERIC(12,2) NOT NULL CHECK (precio_venta_base >= 0),
    costo_promedio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_promedio >= 0),
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INVENTARIO
-- =========================================================

CREATE TABLE inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    ubicacion_pasillo VARCHAR(100),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_inventario_producto_sucursal UNIQUE (producto_id, sucursal_id)
);

CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE ON UPDATE CASCADE,
    empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL ON UPDATE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
    referencia VARCHAR(100),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    CONSTRAINT chk_tipo_movimiento CHECK (
        tipo_movimiento IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'COMPRA', 'DEVOLUCION')
    )
);

-- =========================================================
-- CLIENTES Y PAGOS
-- =========================================================

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento VARCHAR(30) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metodos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================================================
-- VENTAS
-- =========================================================

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES turnos(id) ON UPDATE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    folio VARCHAR(50) NOT NULL UNIQUE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal_neto NUMERIC(12,2) NOT NULL CHECK (subtotal_neto >= 0),
    total_impuestos NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_impuestos >= 0),
    total_venta NUMERIC(12,2) NOT NULL CHECK (total_venta >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA',
    observaciones TEXT,
    CONSTRAINT chk_estado_venta CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'CANCELADA'))
);

CREATE TABLE detalle_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON UPDATE CASCADE,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario_venta NUMERIC(12,2) NOT NULL CHECK (precio_unitario_venta >= 0),
    costo_unitario_historico NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_unitario_historico >= 0),
    porcentaje_impuesto NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_impuesto >= 0),
    monto_impuesto NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_impuesto >= 0),
    subtotal_item NUMERIC(12,2) NOT NULL CHECK (subtotal_item >= 0)
);

CREATE TABLE pagos_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    metodo_pago_id UUID NOT NULL REFERENCES metodos_pago(id) ON UPDATE CASCADE,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    detalles_pago JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- COMPRAS
-- =========================================================

CREATE TABLE compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON UPDATE CASCADE,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON UPDATE CASCADE,
    numero_factura_proveedor VARCHAR(80),
    fecha_compra TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal_compra NUMERIC(12,2) NOT NULL CHECK (subtotal_compra >= 0),
    total_impuestos NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_impuestos >= 0),
    total_compra NUMERIC(12,2) NOT NULL CHECK (total_compra >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'RECIBIDA',
    observaciones TEXT,
    CONSTRAINT chk_estado_compra CHECK (estado IN ('PENDIENTE', 'RECIBIDA', 'CANCELADA'))
);

CREATE TABLE detalle_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE ON UPDATE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON UPDATE CASCADE,
    cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario_compra NUMERIC(12,2) NOT NULL CHECK (precio_unitario_compra >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

-- =========================================================
-- REPORTES Y AUDITORÍA
-- =========================================================

CREATE TABLE reportes_programados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    tipo_reporte VARCHAR(80) NOT NULL,
    frecuencia VARCHAR(20) NOT NULL,
    emails_destinatarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    filtros_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_frecuencia_reporte CHECK (
        frecuencia IN ('DIARIO', 'SEMANAL', 'MENSUAL', 'MANUAL')
    )
);

CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id UUID,
    accion VARCHAR(20) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalle JSONB,
    CONSTRAINT chk_accion_auditoria CHECK (
        accion IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CANCELACION')
    )
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX idx_empleados_usuario_id ON empleados(usuario_id);

CREATE INDEX idx_cajas_sucursal_id ON cajas_fisicas(sucursal_id);
CREATE INDEX idx_turnos_caja_id ON turnos(caja_id);
CREATE INDEX idx_turnos_empleado_id ON turnos(empleado_id);
CREATE INDEX idx_turnos_estado ON turnos(estado);

CREATE INDEX idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX idx_productos_impuesto_id ON productos(impuesto_id);
CREATE INDEX idx_productos_proveedor_id ON productos(proveedor_id);
CREATE INDEX idx_productos_nombre ON productos(nombre);

CREATE INDEX idx_inventario_producto_id ON inventario(producto_id);
CREATE INDEX idx_inventario_sucursal_id ON inventario(sucursal_id);

CREATE INDEX idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);
CREATE INDEX idx_movimientos_empleado_id ON movimientos_inventario(empleado_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);

CREATE INDEX idx_ventas_turno_id ON ventas(turno_id);
CREATE INDEX idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_estado ON ventas(estado);

CREATE INDEX idx_detalle_venta_venta_id ON detalle_venta(venta_id);
CREATE INDEX idx_detalle_venta_producto_id ON detalle_venta(producto_id);

CREATE INDEX idx_pagos_venta_venta_id ON pagos_venta(venta_id);
CREATE INDEX idx_pagos_venta_metodo_id ON pagos_venta(metodo_pago_id);

CREATE INDEX idx_compras_proveedor_id ON compras(proveedor_id);
CREATE INDEX idx_compras_empleado_id ON compras(empleado_id);
CREATE INDEX idx_compras_fecha ON compras(fecha_compra);
CREATE INDEX idx_compras_estado ON compras(estado);

CREATE INDEX idx_detalle_compra_compra_id ON detalle_compra(compra_id);
CREATE INDEX idx_detalle_compra_producto_id ON detalle_compra(producto_id);

CREATE INDEX idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla_afectada);

-- =========================================================
-- VISTAS DE REPORTES
-- =========================================================

CREATE VIEW vw_ventas_diarias AS
SELECT
    DATE(v.fecha) AS dia,
    COUNT(v.id) AS total_ventas,
    COALESCE(SUM(v.total_venta), 0) AS monto_total
FROM ventas v
WHERE v.estado = 'COMPLETADA'
GROUP BY DATE(v.fecha)
ORDER BY dia DESC;

CREATE VIEW vw_productos_mas_vendidos AS
SELECT
    p.id AS producto_id,
    p.nombre,
    COALESCE(SUM(dv.cantidad), 0) AS total_vendido,
    COALESCE(SUM(dv.subtotal_item), 0) AS ingreso_generado
FROM detalle_venta dv
JOIN productos p ON p.id = dv.producto_id
JOIN ventas v ON v.id = dv.venta_id
WHERE v.estado = 'COMPLETADA'
GROUP BY p.id, p.nombre
ORDER BY total_vendido DESC, ingreso_generado DESC;

CREATE VIEW vw_inventario_bajo AS
SELECT
    s.nombre AS sucursal,
    p.nombre AS producto,
    i.cantidad AS stock_actual,
    p.stock_minimo
FROM inventario i
JOIN productos p ON p.id = i.producto_id
JOIN sucursales s ON s.id = i.sucursal_id
WHERE i.cantidad <= p.stock_minimo
ORDER BY sucursal, producto;

CREATE VIEW vw_compras_por_periodo AS
SELECT
    DATE(c.fecha_compra) AS dia,
    COUNT(c.id) AS total_compras,
    COALESCE(SUM(c.total_compra), 0) AS monto_total
FROM compras c
WHERE c.estado = 'RECIBIDA'
GROUP BY DATE(c.fecha_compra)
ORDER BY dia DESC;

COMMIT;