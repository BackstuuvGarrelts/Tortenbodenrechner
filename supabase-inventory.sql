create table if not exists public.inventory_items (
  id text primary key,
  qr_code text not null unique,
  name text not null,
  container text default '',
  filled_at date not null,
  best_before date not null,
  shelf_life_days integer default 30,
  photos jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items_read" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;
drop policy if exists "inventory_items_delete" on public.inventory_items;

create policy "inventory_items_read"
  on public.inventory_items for select
  to anon
  using (true);

create policy "inventory_items_insert"
  on public.inventory_items for insert
  to anon
  with check (true);

create policy "inventory_items_update"
  on public.inventory_items for update
  to anon
  using (true)
  with check (true);

create policy "inventory_items_delete"
  on public.inventory_items for delete
  to anon
  using (true);

create index if not exists inventory_items_qr_code_idx on public.inventory_items (qr_code);
create index if not exists inventory_items_best_before_idx on public.inventory_items (best_before);
