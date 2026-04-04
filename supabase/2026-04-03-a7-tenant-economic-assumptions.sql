alter table public.tenants
  add column if not exists labor_hourly_rate_usd numeric(10, 2),
  add column if not exists avg_handle_minutes_per_message numeric(6, 2);
