-- HEYBARAGISE: SOCIAL + BACKGROUND/THEME UPDATE
-- Run once AFTER the original supabase.sql

alter table public.promotions
  add column if not exists category text not null default 'promotion';

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  external_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1,
  background_image text,
  accent_color text not null default '#9ed8f5',
  secondary_color text not null default '#f6b6d1',
  updated_at timestamptz not null default now()
);

insert into public.site_settings
  (id, background_image, accent_color, secondary_color)
values
  (1, null, '#9ed8f5', '#f6b6d1')
on conflict (id) do nothing;

alter table public.social_links enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "public read active social links" on public.social_links;
drop policy if exists "admins manage social links" on public.social_links;
drop policy if exists "public read site settings" on public.site_settings;
drop policy if exists "admins manage site settings" on public.site_settings;

create policy "public read active social links"
on public.social_links
for select
using (is_active = true);

create policy "admins manage social links"
on public.social_links
for all to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

create policy "public read site settings"
on public.site_settings
for select
using (true);

create policy "admins manage site settings"
on public.site_settings
for all to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
