export type TenantMode = "draft" | "autopilot";

export type TenantRecord = {
  id: string;
  user_id: string;
  hostify_api_key_encrypted: string | null;
  telegram_chat_id: string | null;
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
