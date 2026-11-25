-- =====================================================================
-- Seguridad de la tabla citas (correr en Supabase Studio -> SQL Editor)
-- Correr DESPUES de desplegar el sitio y el Apps Script de esta rama.
-- =====================================================================

-- 1. Vista publica: solo horarios ocupados, sin nombres ni telefonos.
--    La vista corre con permisos de su dueno, por eso el publico puede
--    leerla aunque no pueda leer la tabla citas.
create or replace view public.horarios_ocupados as
  select fecha_cita,
         (upper(cliente) like '%BLOQUEADO%') as bloqueado
  from public.citas
  where fecha_cita > now() - interval '1 day';

revoke all on public.horarios_ocupados from anon, authenticated;
grant select on public.horarios_ocupados to anon, authenticated;

-- 2. Cerrar la tabla citas.
alter table public.citas enable row level security;
drop policy if exists allow_all on public.citas;
revoke all on public.citas from anon;

-- 3. Solo usuarios con login (el despacho) pueden ver/crear/borrar citas.
--    El Apps Script usa la service_role, que no pasa por RLS.
drop policy if exists admin_todo on public.citas;
create policy admin_todo on public.citas
  for all to authenticated
  using (true) with check (true);

-- 4. Verificacion: debe mostrar solo admin_todo
select policyname, roles, cmd from pg_policies where tablename = 'citas';
