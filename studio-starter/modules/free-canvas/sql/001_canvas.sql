-- Módulo free-canvas. Bloques canvas|text por scope (demo, editorial-<uuid>…).
-- Sin tabla sections ni ficha de artista.

create table if not exists canvases (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  kind text not null default 'canvas' check (kind in ('canvas', 'text')),
  title text not null default '',
  body text not null default '',
  sort_order int not null default 0,
  height_ratio double precision not null default 1.2,
  created_at timestamptz not null default now()
);

create index if not exists canvases_scope_sort_idx on canvases (scope, sort_order);

create table if not exists canvas_placements (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references canvases (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  x double precision not null default 8,
  y double precision not null default 8,
  width double precision not null default 24,
  z_index int not null default 0,
  created_at timestamptz not null default now()
);
