-- Título, ficha y Available/Sold por pintura del lienzo.
-- Las URLs /works/:id y /colabs/:id usan el id de canvas_placements.

alter table canvas_placements
  add column if not exists title text not null default '';

alter table canvas_placements
  add column if not exists ficha text not null default '';

alter table canvas_placements
  add column if not exists availability text not null default 'available';
