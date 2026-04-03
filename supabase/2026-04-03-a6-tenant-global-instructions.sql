alter table if exists public.tenants
  add column if not exists global_instructions text;
