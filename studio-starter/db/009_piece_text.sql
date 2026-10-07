-- Texto de la obra, aparte de la ficha (medidas y técnica).
-- El tamaño y la fuente los fija la página, no el admin.

alter table canvas_placements
  add column if not exists piece_text text not null default '';
