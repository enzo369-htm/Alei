-- Cada lienzo (grilla) se puede ocultar sin borrarlo.

alter table canvases
  add column if not exists visible boolean not null default true;
