import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { getN8nEnv } from "@/lib/n8n/env";
import { signPayload } from "@/lib/n8n/signer";
import {
  resolveRuntimeConfigByListing,
  upsertHostAccountListing,
} from "@/lib/tenant/server";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  try {
    const { webhookSecret } = getN8nEnv();
    const timestamp = request.headers.get("x-cohost-timestamp") ?? "";
    const signature = request.headers.get("x-cohost-signature") ?? "";

    if (!timestamp || !signature) {
      return NextResponse.json({ error: "Missing signature headers." }, { status: 401 });
    }

    const body = await request.text();
    const expected = signPayload(body, timestamp, webhookSecret);
    if (!safeEqual(signature, expected)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      listingId?: string;
      hostifyAccountRef?: string;
      threadId?: string;
      reservationId?: string;
    };

    if (!payload.listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 });
    }

    const resolved = await resolveRuntimeConfigByListing(payload.listingId);
    if (!resolved) {
      return NextResponse.json(
        {
          error: "No active host-account mapping found for listing.",
          listingId: payload.listingId,
        },
        { status: 404 },
      );
    }

    if (payload.hostifyAccountRef) {
      await upsertHostAccountListing(
        resolved.tenant.id,
        payload.listingId,
        { hostifyAccountRef: payload.hostifyAccountRef },
      );
    }

    return NextResponse.json({
      ok: true,
      hostAccountId: resolved.tenant.id,
      tenantId: resolved.tenant.id,
      listingId: resolved.mapping.listing_id,
      hostifyAccountRef: resolved.mapping.hostify_account_ref,
      mode: resolved.tenant.mode,
      telegramChatId: resolved.tenant.telegram_chat_id,
      globalInstructions: resolved.tenant.global_instructions,
      hostifyApiKey: resolved.hostifyApiKey,
      context: {
        threadId: payload.threadId ?? null,
        reservationId: payload.reservationId ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 },
    );
  }
}
