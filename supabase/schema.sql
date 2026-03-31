-- Core tenant table for MVP
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  hostify_api_key_encrypted text,
  telegram_chat_id text,
  mode text not null default 'draft' check (mode in ('draft', 'autopilot')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Minimal runtime/event table for metrics and auditing
create table if not exists public.tenant_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists tenant_events_tenant_id_created_at_idx
  on public.tenant_events (tenant_id, created_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- RLS hardening
alter table public.tenants enable row level security;
alter table public.tenant_events enable row level security;

drop policy if exists "tenant_owner_select" on public.tenants;
create policy "tenant_owner_select"
on public.tenants
for select
using (auth.uid() = user_id);

drop policy if exists "tenant_owner_insert" on public.tenants;
create policy "tenant_owner_insert"
on public.tenants
for insert
with check (auth.uid() = user_id);

drop policy if exists "tenant_owner_update" on public.tenants;
create policy "tenant_owner_update"
on public.tenants
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tenant_owner_delete" on public.tenants;
create policy "tenant_owner_delete"
on public.tenants
for delete
using (auth.uid() = user_id);

drop policy if exists "tenant_events_owner_select" on public.tenant_events;
create policy "tenant_events_owner_select"
on public.tenant_events
for select
using (
  exists (
    select 1
    from public.tenants t
    where t.id = tenant_events.tenant_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "tenant_events_owner_insert" on public.tenant_events;
create policy "tenant_events_owner_insert"
on public.tenant_events
for insert
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = tenant_events.tenant_id
      and t.user_id = auth.uid()
  )
);
