import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { getN8nEnv } from "@/lib/n8n/env";
import { signPayload } from "@/lib/n8n/signer";
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

    const payload = JSON.parse(body) as {
      tenantId?: string;
      eventType?: string;
      payload?: Record<string, unknown>;
    };

    if (!payload.tenantId || !payload.eventType) {
      return NextResponse.json({ error: "tenantId and eventType are required." }, { status: 400 });
    }

    await addTenantEventWithAdmin(
      payload.tenantId,
      payload.eventType,
      payload.payload ?? {},
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
