-- Un clip opcional por obra. Se ve en la ficha, no en el lienzo.
-- El archivo vive en media (R2), igual que las fotos.

alter table canvas_placements
  add column if not exists video_media_id uuid references media (id) on delete set null;
