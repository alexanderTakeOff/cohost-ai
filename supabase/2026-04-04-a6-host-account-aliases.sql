-- A6: runtime-first alias support for listing resolution
-- Allows resolver to match webhook/reservation IDs to canonical listing mappings.

create table if not exists public.host_account_listing_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  canonical_listing_id text not null,
  alias_type text not null,
  alias_value text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, alias_type, alias_value)
);

alter table if exists public.host_account_listings
  add column if not exists target_id text,
  add column if not exists parent_listing_id text,
  add column if not exists account_id text;

create index if not exists host_account_listings_target_id_idx
  on public.host_account_listings (target_id);

create index if not exists host_account_listings_parent_listing_id_idx
  on public.host_account_listings (parent_listing_id);

create index if not exists host_account_listings_account_id_idx
  on public.host_account_listings (account_id);

create index if not exists host_account_listing_aliases_tenant_alias_idx
  on public.host_account_listing_aliases (tenant_id, alias_type, alias_value);

create index if not exists host_account_listing_aliases_canonical_idx
  on public.host_account_listing_aliases (tenant_id, canonical_listing_id);

drop trigger if exists host_account_listing_aliases_set_updated_at on public.host_account_listing_aliases;
create trigger host_account_listing_aliases_set_updated_at
before update on public.host_account_listing_aliases
for each row execute function public.set_updated_at();

alter table public.host_account_listing_aliases enable row level security;

drop policy if exists "host_account_listing_aliases_owner_select" on public.host_account_listing_aliases;
create policy "host_account_listing_aliases_owner_select"
on public.host_account_listing_aliases
for select
using (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listing_aliases.tenant_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "host_account_listing_aliases_owner_insert" on public.host_account_listing_aliases;
create policy "host_account_listing_aliases_owner_insert"
on public.host_account_listing_aliases
for insert
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listing_aliases.tenant_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "host_account_listing_aliases_owner_update" on public.host_account_listing_aliases;
create policy "host_account_listing_aliases_owner_update"
on public.host_account_listing_aliases
for update
using (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listing_aliases.tenant_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = host_account_listing_aliases.tenant_id
      and t.user_id = auth.uid()
  )
);
