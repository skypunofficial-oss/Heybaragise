-- HEYBARAGISE v55 PRODUCT ORDER SAFETY
-- Run once in Supabase SQL Editor only if you upgraded from an older schema.

alter table public.products
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (order by sort_order asc, created_at asc) as rn
  from public.products
)
update public.products p
set sort_order = ranked.rn
from ranked
where p.id = ranked.id;
