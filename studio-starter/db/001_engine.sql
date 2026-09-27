-- Tablas del motor. Todo lo demás lo aportan las recetas o los módulos.

create extension if not exists pgcrypto;

-- Registro de assets. Una fila por imagen subida, con todas sus variantes.
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  -- Clave en R2 de la variante mayor.
  r2_key text,
  -- URL de la variante mayor. Sirve como src suelto donde no haga falta srcset.
  url text not null,
  -- Dimensiones intrínsecas de la variante mayor, para reservar el espacio y
  -- evitar el salto de layout.
  width int,
  height int,
  mime text,
  -- { "format": "webp", "widths": [{ "w", "h", "key", "url" }, …] }
  variants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists media_created_at_idx on media (created_at desc);
