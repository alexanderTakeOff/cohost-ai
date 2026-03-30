"use server";

import { redirect } from "next/navigation";

import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { sendTenantConfigToN8n } from "@/lib/n8n/client";
import {
  addTenantEvent,
  getDecryptedHostifyKey,
  getTenantForCurrentUser,
  upsertTenantForCurrentUser,
} from "@/lib/tenant/server";
import type { TenantMode } from "@/lib/tenant/types";

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

    const tenant = await upsertTenantForCurrentUser({
      hostifyApiKey: hostifyApiKey || undefined,
      telegramChatId,
      mode,
    });

    await addTenantEvent(tenant.id, "onboarding_saved", {
      mode: tenant.mode,
      telegramChatId: tenant.telegram_chat_id,
    });

    if (hasN8nEnv()) {
      const decryptedHostifyKey = getDecryptedHostifyKey(tenant);
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
      success: "Onboarding saved successfully.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save onboarding.",
      success: null,
    };
  }
}

export async function syncTenantToN8n(_prevState: ActionResult): Promise<ActionResult> {
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

export type { ActionResult };
