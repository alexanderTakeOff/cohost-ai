-- A4: host-account/listing mapping for runtime config resolution
-- Legacy naming note:
-- `tenants` table currently represents host accounts.

create table if not exists public.host_account_listings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  listing_id text not null,
  hostify_account_ref text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, listing_id)
);

create index if not exists host_account_listings_listing_id_idx
  on public.host_account_listings (listing_id);

create index if not exists host_account_listings_tenant_id_idx
  on public.host_account_listings (tenant_id);

drop trigger if exists host_account_listings_set_updated_at on public.host_account_listings;
create trigger host_account_listings_set_updated_at
before update on public.host_account_listings
for each row execute function public.set_updated_at();

alter table public.host_account_listings enable row level security;

drop policy if exists "host_account_listings_owner_select" on public.host_account_listings;
create policy "host_account_listings_owner_select"
on public.host_account_listings
for select
using (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listings.tenant_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "host_account_listings_owner_insert" on public.host_account_listings;
create policy "host_account_listings_owner_insert"
on public.host_account_listings
for insert
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listings.tenant_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "host_account_listings_owner_update" on public.host_account_listings;
create policy "host_account_listings_owner_update"
on public.host_account_listings
for update
using (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listings.tenant_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listings.tenant_id
      and t.user_id = auth.uid()
  )
);
