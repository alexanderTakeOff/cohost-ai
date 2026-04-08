import { redirect } from "next/navigation";

import {
  CLOSED_BETA_LABEL,
  CLOSED_BETA_MAX_ACTIVE_LISTINGS,
  PRODUCT_NAME,
  formatClosedBetaSummary,
} from "@/lib/product/beta";
import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getHostAccountListingsForCurrentUser,
  getMaskedHostifyKey,
  getTenantForCurrentUser,
} from "@/lib/tenant/server";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
        <div className="w-full max-w-xl rounded-lg border border-amber-400/40 bg-amber-50/80 p-6 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100">
          <p className="font-semibold">Supabase is not configured.</p>
          <p className="mt-2">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTabValue = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams?.tab[0]
    : resolvedSearchParams?.tab;

  const tenant = await getTenantForCurrentUser();
  const listings = await getHostAccountListingsForCurrentUser();

  const maskedKey = getMaskedHostifyKey(tenant);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <section className="w-full max-w-5xl space-y-6 rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-black">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold">{PRODUCT_NAME} onboarding</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Configure account access, listings, assistant behavior, and economics without making the
            onboarding table a runtime dependency.
          </p>
        </header>

        <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Signed in as: {user.email ?? "Unknown user"}
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
          <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
            During beta, each client can keep up to {CLOSED_BETA_MAX_ACTIVE_LISTINGS} active
            listings enabled in the control plane. Existing live routing stays runtime-first.
          </p>
        </div>

        <div className="rounded-md border border-black/10 p-4 text-sm text-zinc-700 dark:border-white/15 dark:text-zinc-300">
          <p className="font-medium">Recommended setup order</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
            <li>Save account settings with your Hostify key, Telegram chat ID, and draft mode.</li>
            <li>Refresh listings and confirm the webhook listing IDs you expect to receive.</li>
            <li>Only switch to autopilot after you confirm message flow on the dashboard.</li>
          </ol>
        </div>

        {maskedKey ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Existing Hostify key: {maskedKey}
          </p>
        ) : null}

        {tenant?.hostify_customer_id ? (
          <div className="rounded-md border border-black/10 p-4 text-sm text-zinc-700 dark:border-white/15 dark:text-zinc-300">
            <p className="font-medium">Connected Hostify account</p>
            <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <p>
                Customer ID: <span className="font-mono">{tenant.hostify_customer_id}</span>
              </p>
              <p>Customer name: {tenant.hostify_customer_name ?? "Not available"}</p>
              <p>Integration: {tenant.hostify_integration_nickname ?? "Not available"}</p>
            </div>
          </div>
        ) : null}

        <OnboardingForm tenant={tenant} listings={listings} initialTab={initialTabValue} />

        {!hasN8nEnv() ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            N8N_WEBHOOK_URL / N8N_WEBHOOK_SECRET are not set yet. Onboarding will save data, but n8n
            sync will remain disabled.
          </p>
        ) : null}

        <div className="flex justify-end">
          <AssistantLauncher label="Ask Jenny" />
        </div>
      </section>
    </main>
  );
}
