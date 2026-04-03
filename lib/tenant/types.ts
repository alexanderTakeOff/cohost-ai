export type TenantMode = "draft" | "autopilot";

export type TenantRecord = {
  id: string;
  user_id: string;
  hostify_api_key_encrypted: string | null;
  telegram_chat_id: string | null;
  global_instructions: string | null;
  mode: TenantMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantMetrics = {
  totalEvents: number;
  aiReplies: number;
  guestMessages: number;
  lastEventAt: string | null;
};

export type HostAccountListingRecord = {
  id: string;
  tenant_id: string;
  listing_id: string;
  listing_name: string | null;
  channel_listing_id: string | null;
  hostify_account_ref: string | null;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};
