import type { TenantMode } from "./types";

export function parseTenantMode(mode: string): TenantMode {
  return mode === "autopilot" ? "autopilot" : "draft";
}

export function isLikelyHostifyKey(value: string) {
  return value.trim().length >= 12;
}

export function isLikelyTelegramChatId(value: string) {
  return /^-?\d{5,}$/.test(value.trim());
}
