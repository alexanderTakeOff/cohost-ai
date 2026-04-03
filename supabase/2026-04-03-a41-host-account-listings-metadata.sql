-- A4.1: listing metadata for UI identification and control
-- Safe for already-deployed databases.

alter table if exists public.host_account_listings
  add column if not exists listing_name text,
  add column if not exists channel_listing_id text,
  add column if not exists last_seen_at timestamptz;

create index if not exists host_account_listings_channel_listing_id_idx
  on public.host_account_listings (channel_listing_id);
