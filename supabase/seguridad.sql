-- =====================================================================
-- Seguridad de la tabla citas (Supabase Studio -> SQL Editor -> Run)
-- Correr DESPUES de desplegar el sitio y el Apps Script de esta rama.
-- Cambia el correo de abajo por el del usuario que creaste en
-- Authentication -> Users.
-- =====================================================================

-- 1. Lista de administradores (solo ellos ven/editan citas).
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- sin politicas: nadie la lee por la API
revoke all on public.admins from anon, authenticated;
insert into public.admins (email) values ('asesoriaslicmanene@gmail.com')
  on conflict do nothing;

-- 2. Vista publica: solo horarios ocupados, sin nombres ni telefonos.
create or replace view public.horarios_ocupados as
  select fecha_cita,
         (upper(cliente) like '%BLOQUEADO%') as bloqueado
  from public.citas
  where fecha_cita > now() - interval '1 day';
revoke all on public.horarios_ocupados from anon, authenticated;
grant select on public.horarios_ocupados to anon, authenticated;

-- 3. Cerrar la tabla citas. El Apps Script usa la service_role (no pasa por RLS).
alter table public.citas enable row level security;
drop policy if exists allow_all on public.citas;
revoke all on public.citas from anon;
drop policy if exists admin_todo on public.citas;
create policy admin_todo on public.citas
  for all to authenticated
  using      (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email'));

-- 4. Verificacion: debe mostrar solo admin_todo
select policyname, roles, cmd from pg_policies where tablename = 'citas';
