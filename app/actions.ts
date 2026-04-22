"use server";

import { redirect } from "next/navigation";

import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { sendTenantConfigToN8n } from "@/lib/n8n/client";
import {
  addTenantEvent,
  getDecryptedHostifyKey,
  getTenantEconomicsMetrics,
  getListingEconomicsForCurrentUser,
  setHostAccountListingActiveForCurrentUser,
  syncTenantHostifyBindingForCurrentUser,
  syncHostAccountListingsFromHostify,
  getTenantForCurrentUser,
  updateTenantEconomicAssumptionsForCurrentUser,
  upsertTenantForCurrentUser,
} from "@/lib/tenant/server";
import type { TenantMode } from "@/lib/tenant/types";
import { createEventPayload, TenantEventType } from "@/lib/tenant/events";
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

export type EconomicsActionResult = ActionResult & {
  metrics?: Awaited<ReturnType<typeof getTenantEconomicsMetrics>>;
  listingBreakdown?: Awaited<ReturnType<typeof getListingEconomicsForCurrentUser>>;
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
    const telegramChatIdRaw = getFormValue(formData, "telegramChatId");
    const telegramChatId = telegramChatIdRaw || null;
    const mode = getFormValue(formData, "mode") as TenantMode;
    const globalInstructionsRaw = formData.get("globalInstructions");
    const globalInstructions =
      typeof globalInstructionsRaw === "string" ? globalInstructionsRaw.slice(0, 6000) : "";
    const saveScope = getFormValue(formData, "saveScope");

    if (telegramChatId && !isLikelyTelegramChatId(telegramChatId)) {
      return {
        error: "Telegram chat id must be numeric (example: -1001234567890).",
        success: null,
      };
    }

    const tenant = await upsertTenantForCurrentUser({
      hostifyApiKey: hostifyApiKey || undefined,
      telegramChatId,
      globalInstructions,
      mode,
    });
    const decryptedHostifyKey = getDecryptedHostifyKey(tenant);
    const shouldSyncListings = saveScope !== "assistant";
    const hostifyBinding =
      shouldSyncListings && decryptedHostifyKey
        ? await syncTenantHostifyBindingForCurrentUser(decryptedHostifyKey)
        : null;
    const syncSummary =
      shouldSyncListings && decryptedHostifyKey
        ? await syncHostAccountListingsFromHostify(tenant.id, decryptedHostifyKey)
        : { fetched: 0, upserted: 0 };

    await addTenantEvent(
      tenant.id,
      TenantEventType.ONBOARDING_UPDATED,
      createEventPayload({
        tenantId: tenant.id,
        source: "app",
        mode: tenant.mode,
        scope: saveScope || "account",
        telegramChatId: tenant.telegram_chat_id,
        globalInstructionsLength: tenant.global_instructions?.length ?? 0,
        hostifyCustomerId: hostifyBinding?.binding.customerId ?? tenant.hostify_customer_id ?? null,
        hostifyCustomerName: hostifyBinding?.binding.customerName ?? tenant.hostify_customer_name ?? null,
        listingsFetched: syncSummary.fetched,
        listingsUpserted: syncSummary.upserted,
      }),
    );

    if (hasN8nEnv()) {
      const idempotencyKey = await sendTenantConfigToN8n(tenant, decryptedHostifyKey);

      await addTenantEvent(
        tenant.id,
        TenantEventType.N8N_SYNC_SENT,
        createEventPayload({
          tenantId: tenant.id,
          source: "app",
          mode: tenant.mode,
        }),
        idempotencyKey,
      );
    }

    return {
      error: null,
      success: shouldSyncListings
        ? `Onboarding saved successfully. Hostify account ${hostifyBinding?.binding.customerId ?? tenant.hostify_customer_id ?? "confirmed"}. Listings synced: ${syncSummary.fetched}.`
        : "Assistant settings saved successfully.",
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
    await addTenantEvent(
      tenant.id,
      TenantEventType.LISTINGS_REFRESHED,
      createEventPayload({
        tenantId: tenant.id,
        source: "app",
        listingsFetched: summary.fetched,
        listingsUpserted: summary.upserted,
      }),
    );

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
      await addTenantEvent(tenant.id, TenantEventType.LISTING_STATUS_CHANGED, {
        ...createEventPayload({
          tenantId: tenant.id,
          source: "app",
          listingId,
          active,
        }),
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
      TenantEventType.N8N_SYNC_SENT,
      createEventPayload({
        tenantId: tenant.id,
        source: "app",
        mode: tenant.mode,
      }),
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

export async function saveEconomicAssumptions(
  _prevState: EconomicsActionResult,
  formData: FormData,
): Promise<EconomicsActionResult> {
  void _prevState;
  try {
    const laborCostPerHourUsd = Number(getFormValue(formData, "laborCostPerHourUsd"));
    const avgHandleMinutesPerMessage = Number(getFormValue(formData, "avgHandleMinutesPerMessage"));
    const laborRate = Number.isFinite(laborCostPerHourUsd) ? Math.max(laborCostPerHourUsd, 0) : 0;
    const avgMinutes = Number.isFinite(avgHandleMinutesPerMessage)
      ? Math.max(avgHandleMinutesPerMessage, 0)
      : 0;

    const tenant = await updateTenantEconomicAssumptionsForCurrentUser({
      laborCostPerHourUsd: laborRate,
      avgHandleMinutesPerMessage: avgMinutes,
    });

    await addTenantEvent(
      tenant.id,
      TenantEventType.ONBOARDING_UPDATED,
      createEventPayload({
        tenantId: tenant.id,
        source: "app",
        scope: "economics",
        laborCostPerHourUsd: laborRate,
        avgHandleMinutesPerMessage: avgMinutes,
      }),
    );

    const metrics = await getTenantEconomicsMetrics(tenant.id);
    const listingBreakdown = await getListingEconomicsForCurrentUser();

    return {
      error: null,
      success: "Economic assumptions saved.",
      metrics,
      listingBreakdown,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save economic assumptions.",
      success: null,
    };
  }
}
