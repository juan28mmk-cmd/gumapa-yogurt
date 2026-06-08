alter table pedidos add column if not exists monto numeric(12,2) not null default 0;
alter table entregas add column if not exists pedido_id uuid references pedidos(id);

alter table inventario_movimientos add column if not exists lote text;
alter table inventario_movimientos add column if not exists fecha_creacion date;
alter table inventario_movimientos add column if not exists fecha_vencimiento date;

alter table facturas add column if not exists pedido_id uuid references pedidos(id);
alter table contabilidad_asientos add column if not exists factura_id uuid references facturas(id);
alter table contabilidad_asientos add column if not exists gasto_id uuid;

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  proveedor text,
  categoria text not null default 'Gasto general',
  descripcion text,
  monto numeric(12,2) not null default 0,
  metodo_pago text not null default 'Caja/Banco',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table gastos enable row level security;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'contabilidad_asientos_gasto_id_fkey'
      and table_name = 'contabilidad_asientos'
  ) then
    alter table contabilidad_asientos
      add constraint contabilidad_asientos_gasto_id_fkey
      foreign key (gasto_id) references gastos(id);
  end if;
end $$;

drop policy if exists "anon_delete_facturas" on facturas;
create policy "anon_delete_facturas" on facturas for delete using (true);

drop policy if exists "anon_update_facturas" on facturas;
create policy "anon_update_facturas" on facturas for update using (true) with check (true);

drop policy if exists "anon_delete_asientos" on contabilidad_asientos;
create policy "anon_delete_asientos" on contabilidad_asientos for delete using (true);

drop policy if exists "anon_delete_clientes" on clientes;
create policy "anon_delete_clientes" on clientes for delete using (true);

drop policy if exists "anon_delete_pedidos" on pedidos;
create policy "anon_delete_pedidos" on pedidos for delete using (true);

drop policy if exists "anon_delete_entregas" on entregas;
create policy "anon_delete_entregas" on entregas for delete using (true);

drop policy if exists "anon_update_pedidos" on pedidos;
create policy "anon_update_pedidos" on pedidos for update using (true) with check (true);

drop policy if exists "anon_delete_productos" on productos;
create policy "anon_delete_productos" on productos for delete using (true);

drop policy if exists "anon_delete_inventario" on inventario_movimientos;
create policy "anon_delete_inventario" on inventario_movimientos for delete using (true);

drop policy if exists "anon_delete_lineas" on contabilidad_lineas;
create policy "anon_delete_lineas" on contabilidad_lineas for delete using (true);

drop policy if exists "anon_select_gastos" on gastos;
create policy "anon_select_gastos" on gastos for select using (true);

drop policy if exists "anon_insert_gastos" on gastos;
create policy "anon_insert_gastos" on gastos for insert with check (true);

drop policy if exists "anon_delete_gastos" on gastos;
create policy "anon_delete_gastos" on gastos for delete using (true);

create table if not exists calendario_tareas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  titulo text not null,
  descripcion text,
  prioridad text not null default 'Normal',
  alerta time,
  completada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calendario_tareas enable row level security;

drop policy if exists "anon_select_calendario_tareas" on calendario_tareas;
create policy "anon_select_calendario_tareas" on calendario_tareas for select using (true);

drop policy if exists "anon_insert_calendario_tareas" on calendario_tareas;
create policy "anon_insert_calendario_tareas" on calendario_tareas for insert with check (true);

drop policy if exists "anon_update_calendario_tareas" on calendario_tareas;
create policy "anon_update_calendario_tareas" on calendario_tareas for update using (true) with check (true);

drop policy if exists "anon_delete_calendario_tareas" on calendario_tareas;
create policy "anon_delete_calendario_tareas" on calendario_tareas for delete using (true);
alter table calendario_tareas add column if not exists pedido_id uuid references pedidos(id);
alter table calendario_tareas add column if not exists entrega_id uuid references entregas(id);

