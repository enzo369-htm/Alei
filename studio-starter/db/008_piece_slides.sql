-- Fotos extra de una obra. No se dibujan en el free canvas.
-- La imagen de canvas_placements sigue siendo la del lienzo.
-- El carrusel de la ficha muestra esa foto y después estas, en sort_order.

create table if not exists canvas_piece_slides (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references canvas_placements (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  sort_order int not null default 0
);

create index if not exists canvas_piece_slides_placement_idx
  on canvas_piece_slides (placement_id, sort_order);
