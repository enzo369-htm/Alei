-- Receta base-editorial. Copia este archivo a db/00N_….sql y renombrá
-- editorial_items (textos, series, muestras…). Campos extra van acá, en esta copia.

create table if not exists editorial_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  cover_media_id uuid references media (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists editorial_items_sort_idx
  on editorial_items (sort_order, created_at desc);
