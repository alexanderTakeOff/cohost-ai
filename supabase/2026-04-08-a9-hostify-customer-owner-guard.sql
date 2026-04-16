create unique index if not exists tenants_active_hostify_customer_id_uniq
  on public.tenants (hostify_customer_id)
  where hostify_customer_id is not null
    and is_active = true;
