-- Inglés opcional, en el mismo registro. Vacío, nunca nulo.
-- About guarda el inglés dentro del JSON de pages.body (un bloque, campos paralelos).

alter table canvas_placements
  add column if not exists title_en text not null default '';

alter table canvas_placements
  add column if not exists ficha_en text not null default '';

alter table canvas_placements
  add column if not exists piece_text_en text not null default '';

alter table canvases
  add column if not exists title_en text not null default '';

alter table canvases
  add column if not exists body_en text not null default '';
