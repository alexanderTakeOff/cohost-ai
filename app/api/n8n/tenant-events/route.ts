import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { getN8nEnv } from "@/lib/n8n/env";
import { signPayload } from "@/lib/n8n/signer";
import {
  canonicalizeExternalEventType,
  enrichEventPayload,
  type TenantEventType,
} from "@/lib/tenant/events";
import { addTenantEventWithAdmin } from "@/lib/tenant/server";

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
    const idempotencyKey = request.headers.get("x-cohost-idempotency-key") ?? undefined;

    if (!timestamp || !signature) {
      return NextResponse.json({ error: "Missing signature headers." }, { status: 401 });
    }

    const body = await request.text();
    const expected = signPayload(body, timestamp, webhookSecret);

    if (!safeEqual(signature, expected)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const rawBody = JSON.parse(body) as Record<string, unknown>;
    const tenantId =
      (typeof rawBody.tenantId === "string" ? rawBody.tenantId : null) ??
      (typeof rawBody.tenant_id === "string" ? rawBody.tenant_id : null);
    const eventType =
      (typeof rawBody.eventType === "string" ? rawBody.eventType : null) ??
      (typeof rawBody.event_type === "string" ? rawBody.event_type : null);
    if (!tenantId || !eventType) {
      return NextResponse.json({ error: "tenantId and eventType are required." }, { status: 400 });
    }

    const rawPayload =
      rawBody.payload && typeof rawBody.payload === "object" && !Array.isArray(rawBody.payload)
        ? (rawBody.payload as Record<string, unknown>)
        : Object.fromEntries(
            Object.entries(rawBody).filter(
              ([key]) => !["tenantId", "tenant_id", "eventType", "event_type", "payload"].includes(key),
            ),
          );
    const canonicalEventType = canonicalizeExternalEventType(eventType) as TenantEventType;
    const enrichedPayload = enrichEventPayload(rawPayload, {
      tenantId,
      source: "n8n_callback",
    });

    await addTenantEventWithAdmin(
      tenantId,
      canonicalEventType,
      enrichedPayload,
      idempotencyKey,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 },
    );
  }
}
