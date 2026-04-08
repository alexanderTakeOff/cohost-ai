import { NextResponse } from "next/server";

import { runAssistantTurn } from "@/lib/ai/runtime";
import { createClient } from "@/lib/supabase/server";
import { getTenantForCurrentUser } from "@/lib/tenant/server";
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

    const input: AssistantUserMessageRequest = {
      context: body.context ?? null,
      message: typeof body.message === "string" ? body.message : "",
      authenticated: Boolean(user),
      tenant: {
        telegramChatId: tenant?.telegram_chat_id ?? null,
      },
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
