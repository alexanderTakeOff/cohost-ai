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
    <main className="flex flex-1 items-center justify-center bg-transparent p-6">
      <section className="w-full max-w-5xl space-y-5 rounded-[28px] border border-black/8 bg-white/80 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold">{PRODUCT_NAME} onboarding</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Jenny can guide the setup. This page stays focused on your actual account and listing state.
          </p>
        </header>

        <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Signed in as: {user.email ?? "Unknown user"}
        </div>

        <div className="rounded-2xl border border-[rgba(200,182,226,0.45)] bg-[rgba(242,228,216,0.45)] p-4 text-sm text-slate-800 shadow-[0_12px_32px_rgba(168,133,208,0.08)] dark:border-[rgba(200,182,226,0.25)] dark:bg-[rgba(200,182,226,0.08)] dark:text-slate-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            During beta, each client can keep up to {CLOSED_BETA_MAX_ACTIVE_LISTINGS} active
            listings in the control plane.
          </p>
        </div>

        {maskedKey ? (
          <p className="rounded-2xl bg-[rgba(255,255,255,0.55)] px-3 py-2 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
            Existing Hostify key: {maskedKey}
          </p>
        ) : null}

        {tenant?.hostify_customer_id ? (
          <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
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
      </section>
    </main>
  );
}
