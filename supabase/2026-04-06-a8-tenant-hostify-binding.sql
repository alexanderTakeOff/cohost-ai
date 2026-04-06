alter table if exists public.tenants
  add column if not exists hostify_customer_id text,
  add column if not exists hostify_customer_name text,
  add column if not exists hostify_integration_id text,
  add column if not exists hostify_integration_nickname text;
