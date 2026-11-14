-- Opción 2 del home: un archivo centrado, con tamaño propio.
-- No toca hero_slides. Hero 1 sigue siendo la rotación con flores.

create table if not exists hero_fit (
  id int primary key default 1 check (id = 1),
  mode text not null default 'motion' check (mode in ('motion', 'fit')),
  media_id uuid references media (id) on delete set null,
  scale int not null default 60 check (scale >= 20 and scale <= 100)
);

insert into hero_fit (id, mode, scale)
values (1, 'motion', 60)
on conflict (id) do nothing;
