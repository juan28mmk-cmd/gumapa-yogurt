-- Gumapa Supabase schema
-- Ejecutar en Supabase SQL Editor. Las tablas inician vacias.

create extension if not exists "pgcrypto";

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  zona text,
  tipo text default 'Minorista',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  precio numeric(12,2) not null default 0,
  stock_minimo numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  producto_id uuid references productos(id),
  cliente_nombre text,
  producto_nombre text,
  cantidad numeric(12,2) not null default 0,
  monto numeric(12,2) not null default 0,
  estado text not null default 'Pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id),
  producto_nombre text,
  tipo text not null check (tipo in ('Entrada', 'Salida', 'Ajuste')),
  cantidad numeric(12,2) not null default 0,
  lote text,
  fecha_creacion date,
  fecha_vencimiento date,
  motivo text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists entregas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id),
  cliente_nombre text,
  ruta text,
  fecha_entrega date,
  estado text not null default 'Programada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facturas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id),
  cliente_id uuid references clientes(id),
  cliente_nombre text,
  numero text,
  monto numeric(12,2) not null default 0,
  estado text not null default 'Borrador',
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contabilidad_cuentas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null check (tipo in ('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Costo')),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contabilidad_periodos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'Abierto',
  created_at timestamptz not null default now()
);

create table if not exists contabilidad_asientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  referencia text,
  factura_id uuid references facturas(id),
  descripcion text not null,
  total_debe numeric(12,2) not null default 0,
  total_haber numeric(12,2) not null default 0,
  estado text not null default 'Borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asiento_cuadrado check (total_debe = total_haber)
);

create table if not exists contabilidad_lineas (
  id uuid primary key default gen_random_uuid(),
  asiento_id uuid not null references contabilidad_asientos(id) on delete cascade,
  cuenta_id uuid not null references contabilidad_cuentas(id),
  descripcion text,
  debe numeric(12,2) not null default 0,
  haber numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint linea_con_monto check (debe >= 0 and haber >= 0 and debe <> haber)
);

alter table clientes enable row level security;
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table inventario_movimientos enable row level security;
alter table entregas enable row level security;
alter table facturas enable row level security;
alter table contabilidad_cuentas enable row level security;
alter table contabilidad_periodos enable row level security;
alter table contabilidad_asientos enable row level security;
alter table contabilidad_lineas enable row level security;

-- Politicas simples para prototipo con anon key.
-- Para produccion, reemplazar por politicas basadas en auth.uid() y roles.
create policy "anon_select_clientes" on clientes for select using (true);
create policy "anon_insert_clientes" on clientes for insert with check (true);
create policy "anon_delete_clientes" on clientes for delete using (true);
create policy "anon_select_productos" on productos for select using (true);
create policy "anon_insert_productos" on productos for insert with check (true);
create policy "anon_select_pedidos" on pedidos for select using (true);
create policy "anon_insert_pedidos" on pedidos for insert with check (true);
create policy "anon_delete_pedidos" on pedidos for delete using (true);
create policy "anon_select_inventario" on inventario_movimientos for select using (true);
create policy "anon_insert_inventario" on inventario_movimientos for insert with check (true);
create policy "anon_select_entregas" on entregas for select using (true);
create policy "anon_insert_entregas" on entregas for insert with check (true);
create policy "anon_select_facturas" on facturas for select using (true);
create policy "anon_insert_facturas" on facturas for insert with check (true);
create policy "anon_delete_facturas" on facturas for delete using (true);
create policy "anon_select_cuentas" on contabilidad_cuentas for select using (true);
create policy "anon_insert_cuentas" on contabilidad_cuentas for insert with check (true);
create policy "anon_select_periodos" on contabilidad_periodos for select using (true);
create policy "anon_insert_periodos" on contabilidad_periodos for insert with check (true);
create policy "anon_select_asientos" on contabilidad_asientos for select using (true);
create policy "anon_insert_asientos" on contabilidad_asientos for insert with check (true);
create policy "anon_delete_asientos" on contabilidad_asientos for delete using (true);
create policy "anon_select_lineas" on contabilidad_lineas for select using (true);
create policy "anon_insert_lineas" on contabilidad_lineas for insert with check (true);
create policy "anon_delete_lineas" on contabilidad_lineas for delete using (true);

-- Ejemplos opcionales. Dejados comentados para que el sistema inicie en cero.
-- insert into contabilidad_cuentas (codigo, nombre, tipo) values
-- ('1-01', 'Caja', 'Activo'),
-- ('1-02', 'Banco', 'Activo'),
-- ('4-01', 'Ventas de yogurt y helados', 'Ingreso'),
-- ('5-01', 'Materia prima', 'Costo'),
-- ('6-01', 'Gastos de transporte', 'Gasto');
