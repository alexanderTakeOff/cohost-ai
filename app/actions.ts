"use server";

import { redirect } from "next/navigation";

import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { sendTenantConfigToN8n } from "@/lib/n8n/client";
import {
  addTenantEvent,
  getDecryptedHostifyKey,
  setHostAccountListingActiveForCurrentUser,
  syncHostAccountListingsFromHostify,
  getTenantForCurrentUser,
  upsertTenantForCurrentUser,
} from "@/lib/tenant/server";
import type { TenantMode } from "@/lib/tenant/types";
import { isLikelyTelegramChatId } from "@/lib/tenant/validators";

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

type ActionResult = {
  error: string | null;
  success: string | null;
};

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveOnboarding(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  void _prevState;
  try {
    const hostifyApiKey = getFormValue(formData, "hostifyApiKey");
    const telegramChatId = getFormValue(formData, "telegramChatId");
    const mode = getFormValue(formData, "mode") as TenantMode;

    if (!telegramChatId) {
      return {
        error: "Telegram chat id is required.",
        success: null,
      };
    }

    if (!isLikelyTelegramChatId(telegramChatId)) {
      return {
        error: "Telegram chat id must be numeric (example: -1001234567890).",
        success: null,
      };
    }

    const tenant = await upsertTenantForCurrentUser({
      hostifyApiKey: hostifyApiKey || undefined,
      telegramChatId,
      mode,
    });
    const decryptedHostifyKey = getDecryptedHostifyKey(tenant);
    const syncSummary = decryptedHostifyKey
      ? await syncHostAccountListingsFromHostify(tenant.id, decryptedHostifyKey)
      : { fetched: 0, upserted: 0 };

    await addTenantEvent(tenant.id, "onboarding_saved", {
      mode: tenant.mode,
      telegramChatId: tenant.telegram_chat_id,
      listingsFetched: syncSummary.fetched,
      listingsUpserted: syncSummary.upserted,
    });

    if (hasN8nEnv()) {
      const idempotencyKey = await sendTenantConfigToN8n(tenant, decryptedHostifyKey);

      await addTenantEvent(
        tenant.id,
        "n8n_sync_sent",
        {
          mode: tenant.mode,
        },
        idempotencyKey,
      );
    }

    return {
      error: null,
      success: `Onboarding saved successfully. Listings synced: ${syncSummary.fetched}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save onboarding.",
      success: null,
    };
  }
}

export async function refreshListings(_prevState: ActionResult): Promise<ActionResult> {
  void _prevState;
  try {
    const tenant = await getTenantForCurrentUser();
    if (!tenant) {
      return {
        error: "Please complete onboarding first.",
        success: null,
      };
    }

    const hostifyApiKey = getDecryptedHostifyKey(tenant);
    if (!hostifyApiKey) {
      return {
        error: "Hostify API key is missing.",
        success: null,
      };
    }

    const summary = await syncHostAccountListingsFromHostify(tenant.id, hostifyApiKey);
    await addTenantEvent(tenant.id, "listings_refreshed", {
      listingsFetched: summary.fetched,
      listingsUpserted: summary.upserted,
    });

    return {
      error: null,
      success: `Listings refreshed. Found ${summary.fetched}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to refresh listings.",
      success: null,
    };
  }
}

export async function toggleListingActive(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  void _prevState;
  try {
    const listingId = getFormValue(formData, "listingId");
    const activeRaw = getFormValue(formData, "active");

    if (!listingId) {
      return {
        error: "listingId is required.",
        success: null,
      };
    }

    const active = activeRaw === "true";
    await setHostAccountListingActiveForCurrentUser(listingId, active);

    const tenant = await getTenantForCurrentUser();
    if (tenant) {
      await addTenantEvent(tenant.id, "listing_status_changed", {
        listingId,
        active,
      });
    }

    return {
      error: null,
      success: active ? "Listing enabled." : "Listing disabled.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update listing status.",
      success: null,
    };
  }
}

export async function syncTenantToN8n(_prevState: ActionResult): Promise<ActionResult> {
  void _prevState;
  try {
    if (!hasN8nEnv()) {
      return {
        error: "n8n webhook is not configured yet.",
        success: null,
      };
    }

    const tenant = await getTenantForCurrentUser();

    if (!tenant) {
      return {
        error: "Please complete onboarding first.",
        success: null,
      };
    }

    const hostifyApiKey = getDecryptedHostifyKey(tenant);
    const idempotencyKey = await sendTenantConfigToN8n(tenant, hostifyApiKey);

    await addTenantEvent(
      tenant.id,
      "n8n_sync_sent",
      {
        mode: tenant.mode,
      },
      idempotencyKey,
    );

    return {
      error: null,
      success: "Tenant config was sent to n8n.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to sync with n8n.",
      success: null,
    };
  }
}
