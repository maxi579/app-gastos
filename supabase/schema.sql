-- PERFILES: datos generales de cada usuario
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text,
  sueldo numeric(14,2),
  tono_asistente text not null default 'directo'
    check (tono_asistente in ('amable', 'directo', 'estricto')),
  creado_en timestamptz not null default now()
);

-- TARJETAS: las tarjetas de cada usuario
create table tarjetas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  banco text,
  red text check (red in ('visa', 'mastercard', 'amex', 'otra')),
  dia_cierre smallint check (dia_cierre between 1 and 31),
  dia_vencimiento smallint check (dia_vencimiento between 1 and 31),
  creado_en timestamptz not null default now()
);

-- GASTOS: cada compra (en una o varias cuotas)
create table gastos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users on delete cascade,
  tarjeta_id uuid references tarjetas on delete set null,
  descripcion text not null,
  categoria text,
  monto_total numeric(14,2) not null check (monto_total > 0),
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  cantidad_cuotas smallint not null default 1 check (cantidad_cuotas >= 1),
  fecha_compra date not null default current_date,
  primer_mes_cuota date,
  texto_original text,
  creado_en timestamptz not null default now()
);

create index on tarjetas (usuario_id);
create index on gastos (usuario_id);
create index on gastos (tarjeta_id);

-- SEGURIDAD: cada usuario solo accede a sus propios datos
alter table perfiles enable row level security;
alter table tarjetas enable row level security;
alter table gastos enable row level security;

create policy "Cada usuario gestiona su perfil" on perfiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Cada usuario gestiona sus tarjetas" on tarjetas
  for all using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

create policy "Cada usuario gestiona sus gastos" on gastos
  for all using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();