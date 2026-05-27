alter table pedidos add column if not exists monto numeric(12,2) not null default 0;

alter table inventario_movimientos add column if not exists lote text;
alter table inventario_movimientos add column if not exists fecha_creacion date;
alter table inventario_movimientos add column if not exists fecha_vencimiento date;

alter table facturas add column if not exists pedido_id uuid references pedidos(id);
alter table contabilidad_asientos add column if not exists factura_id uuid references facturas(id);

drop policy if exists "anon_delete_facturas" on facturas;
create policy "anon_delete_facturas" on facturas for delete using (true);

drop policy if exists "anon_delete_asientos" on contabilidad_asientos;
create policy "anon_delete_asientos" on contabilidad_asientos for delete using (true);
