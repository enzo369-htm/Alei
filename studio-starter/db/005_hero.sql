-- Pinturas del home. Una fila por imagen, en orden.
-- Las fotos viven en media (R2). Esto solo arma la rotación.

create table if not exists hero_slides (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media (id) on delete cascade,
  sort_order int not null default 0,
  unique (media_id)
);
