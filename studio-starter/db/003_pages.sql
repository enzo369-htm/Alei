-- Receta base-page. Una fila por slug (bio, statement, contacto…).
-- Copiá y, si hace falta, agregá columnas en ESA copia.

create table if not exists pages (
  slug text primary key,
  title text not null default '',
  body text not null default '',
  image_media_id uuid references media (id) on delete set null,
  updated_at timestamptz not null default now()
);
