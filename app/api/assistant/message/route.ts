import { NextResponse } from "next/server";

import { runAssistantTurn } from "@/lib/ai/runtime";
import { createClient } from "@/lib/supabase/server";
import { getAssistantContextForCurrentUser, getTenantForCurrentUser } from "@/lib/tenant/server";
import type {
  AssistantConversationContext,
  AssistantUserMessageRequest,
} from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      context?: AssistantConversationContext | null;
      message?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const tenant = user ? await getTenantForCurrentUser() : null;
    const assistantContext = user ? await getAssistantContextForCurrentUser() : null;

    const input: AssistantUserMessageRequest = {
      context: body.context ?? null,
      message: typeof body.message === "string" ? body.message : "",
      authenticated: Boolean(user),
      tenant: {
        hasTenant: Boolean(tenant),
        hasHostifyBinding: Boolean(tenant?.hostify_customer_id),
        hasHostifyKey: Boolean(tenant?.hostify_api_key_encrypted),
        hostifyCustomerId: tenant?.hostify_customer_id ?? null,
        telegramChatId: tenant?.telegram_chat_id ?? null,
      },
      assistantContext: assistantContext
        ? {
            userEmail: assistantContext.user.email,
            tenantId: assistantContext.tenant?.id ?? null,
            hostifyCustomerId: assistantContext.tenant?.hostifyCustomerId ?? null,
            hostifyCustomerName: assistantContext.tenant?.hostifyCustomerName ?? null,
            hostifyIntegration: assistantContext.tenant?.hostifyIntegration ?? null,
            hasHostifyKey: assistantContext.tenant?.hasHostifyKey ?? false,
            hasGlobalInstructions: assistantContext.tenant?.hasGlobalInstructions ?? false,
            activeListings: assistantContext.listings.active,
            totalListings: assistantContext.listings.total,
            runtimeUnresolved:
              typeof assistantContext.runtime?.unresolved === "number"
                ? assistantContext.runtime.unresolved
                : undefined,
            mode: assistantContext.tenant?.mode ?? null,
          }
        : null,
    };

    const response = await runAssistantTurn(input);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assistant request failed." },
      { status: 500 },
    );
  }
}
