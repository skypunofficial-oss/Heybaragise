-- ============================================
-- HEYBARAGISE PREMIUM STORE DATABASE
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '📱',
  short_description text,
  description text,
  image_url text,
  external_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  description text,
  image_url text,
  external_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  original_price numeric(12,2) default 0,
  sale_price numeric(12,2) not null default 0,
  external_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unique(combo_id, product_id)
);

-- Admin whitelist. Insert your own Supabase Auth user id after you create your account.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.packages enable row level security;
alter table public.promotions enable row level security;
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
alter table public.admin_users enable row level security;

-- Public can read only active public content
create policy "public read active products" on public.products
for select using (active = true);

create policy "public read packages" on public.packages
for select using (
  exists(select 1 from public.products p where p.id = packages.product_id and p.active = true)
);

create policy "public read active promotions" on public.promotions
for select using (active = true);

create policy "public read active combos" on public.combos
for select using (active = true);

create policy "public read combo items" on public.combo_items
for select using (
  exists(select 1 from public.combos c where c.id = combo_items.combo_id and c.active = true)
);

-- Admin read/write policies
create policy "admins manage products" on public.products
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins manage packages" on public.packages
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins manage promotions" on public.promotions
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins manage combos" on public.combos
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins manage combo items" on public.combo_items
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "user can read own admin row" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Storage bucket for product images and posters
insert into storage.buckets (id, name, public)
values ('media','media',true)
on conflict (id) do nothing;

-- Public can read images
create policy "public read media" on storage.objects
for select using (bucket_id = 'media');

-- Only whitelisted admins can upload/update/delete media
create policy "admins upload media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'media'
  and exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "admins update media" on storage.objects
for update to authenticated
using (
  bucket_id = 'media'
  and exists(select 1 from public.admin_users a where a.user_id = auth.uid())
)
with check (
  bucket_id = 'media'
  and exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "admins delete media" on storage.objects
for delete to authenticated
using (
  bucket_id = 'media'
  and exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- IMPORTANT:
-- 1) Create your admin user in Supabase Authentication.
-- 2) Then run this query with your user's UUID:
-- insert into public.admin_users (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
