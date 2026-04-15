import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { getN8nEnv } from "@/lib/n8n/env";
import { signPayload } from "@/lib/n8n/signer";
import {
  extractHostifyAccountRefFromTopicArn,
  getTenantIdByHostifyAccountRef,
  RuntimeConfigAmbiguousError,
  resolveRuntimeConfigByAccountAndListing,
  trackRuntimeResolution,
  trackRuntimeUnresolved,
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
      topicArn?: string;
    };

    if (!payload.listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 });
    }

    const accountRefFromTopic = extractHostifyAccountRefFromTopicArn(payload.topicArn);
    const normalizedListingId = payload.listingId.trim();
    const normalizedAccountRef = payload.hostifyAccountRef ?? accountRefFromTopic ?? null;
    let resolved: Awaited<ReturnType<typeof resolveRuntimeConfigByAccountAndListing>> = null;
    try {
      resolved = await resolveRuntimeConfigByAccountAndListing({
        listingId: normalizedListingId,
        hostifyAccountRef: normalizedAccountRef,
        threadId: payload.threadId ?? null,
        reservationId: payload.reservationId ?? null,
      });
    } catch (error) {
      if (!(error instanceof RuntimeConfigAmbiguousError)) {
        throw error;
      }
      return NextResponse.json(
        {
          error: "Runtime config is ambiguous for this listing/account mapping.",
          code: "RUNTIME_CONFIG_AMBIGUOUS",
          listingId: normalizedListingId,
          hostifyAccountRef: error.hostifyAccountRef ?? normalizedAccountRef,
          tenantIds: error.tenantIds,
          reason: error.reason,
          resolutionPath: "ambiguous",
        },
        { status: 409 },
      );
    }
    if (!resolved) {
      const unresolvedAccountRef = normalizedAccountRef;
      if (unresolvedAccountRef) {
        const unresolvedTenantId = await getTenantIdByHostifyAccountRef(unresolvedAccountRef, {
          listingId: normalizedListingId,
        });
        if (unresolvedTenantId) {
          await trackRuntimeUnresolved({
            tenantId: unresolvedTenantId,
            webhookListingId: normalizedListingId,
            hostifyAccountRef: unresolvedAccountRef,
            threadId: payload.threadId ?? null,
            reservationId: payload.reservationId ?? null,
          });
        }
      }
      return NextResponse.json(
        {
          error: "No active host-account mapping found for listing.",
          listingId: normalizedListingId,
          hostifyAccountRef: normalizedAccountRef,
          resolutionPath: "unresolved",
        },
        { status: 404 },
      );
    }

    if (payload.hostifyAccountRef || accountRefFromTopic) {
      await upsertHostAccountListing(
        resolved.tenant.id,
        normalizedListingId,
        { hostifyAccountRef: normalizedAccountRef },
      );
    }

    await trackRuntimeResolution({
      tenantId: resolved.tenant.id,
      resolutionPath: resolved.resolutionPath,
      webhookListingId: normalizedListingId,
      canonicalListingId: resolved.mapping.listing_id,
      accountId: resolved.mapping.account_id ?? null,
      hostifyAccountRef: resolved.mapping.hostify_account_ref ?? normalizedAccountRef,
      threadId: payload.threadId ?? null,
      reservationId: payload.reservationId ?? null,
    });

    return NextResponse.json({
      ok: true,
      hostAccountId: resolved.tenant.id,
      tenantId: resolved.tenant.id,
      listingId: resolved.mapping.listing_id,
      hostifyAccountRef: resolved.mapping.hostify_account_ref,
      accountId: resolved.mapping.account_id ?? null,
      resolutionPath: resolved.resolutionPath,
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
