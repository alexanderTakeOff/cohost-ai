import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CLOSED_BETA_LABEL,
  CLOSED_BETA_MAX_ACTIVE_LISTINGS,
  formatClosedBetaSummary,
  PRODUCT_NAME,
} from "@/lib/product/beta";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getListingEconomicsForCurrentUser,
  getMaskedHostifyKey,
  getTenantEconomicsMetrics,
  getTenantForCurrentUser,
  getTenantMetrics,
} from "@/lib/tenant/server";

function formatDate(value: string | null) {
  if (!value) {
    return "No events yet";
  }

  return new Date(value).toLocaleString();
}

function formatMoneyUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function DashboardPage() {
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

  const tenant = await getTenantForCurrentUser();

  if (!tenant) {
    redirect("/onboarding");
  }

  const metrics = await getTenantMetrics(tenant.id);
  const economics = await getTenantEconomicsMetrics(tenant.id);
  const listingEconomics = await getListingEconomicsForCurrentUser();
  const maskedKey = getMaskedHostifyKey(tenant);
  const activeListingCount = listingEconomics.length;
  const runtimeHealthy = metrics.runtimeResolution.unresolved === 0;
  const recentRuntimeNote = metrics.lastRuntimeIssueAt
    ? `Last runtime issue observed ${formatDate(metrics.lastRuntimeIssueAt)}.`
    : "No unresolved runtime issues observed yet.";

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent p-6">
      <section className="w-full max-w-2xl space-y-5 rounded-[28px] border border-black/8 bg-white/80 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold">{PRODUCT_NAME} Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            A calm view of tenant status, runtime health, and the next action worth taking.
          </p>
        </header>

        <div className="rounded-2xl border border-[rgba(200,182,226,0.45)] bg-[rgba(242,228,216,0.45)] p-4 text-sm text-slate-800 shadow-[0_12px_32px_rgba(168,133,208,0.08)] dark:border-[rgba(200,182,226,0.25)] dark:bg-[rgba(200,182,226,0.08)] dark:text-slate-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Keep draft mode on until listing sync and runtime counters look calm.
          </p>
        </div>

        <div className="rounded-2xl bg-[rgba(255,255,255,0.55)] px-3 py-2 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
          Signed in as: {user.email ?? "Unknown user"}
        </div>

        <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Connected Hostify account
          </p>
          <div className="mt-2 space-y-2 text-zinc-700 dark:text-zinc-300">
            <p>
              Customer ID:{" "}
              <span className="font-mono font-medium">{tenant.hostify_customer_id ?? "Not linked yet"}</span>
            </p>
            <p>
              Customer name: <span className="font-medium">{tenant.hostify_customer_name ?? "Unknown"}</span>
            </p>
            <p>
              Integration:{" "}
              <span className="font-medium">
                {tenant.hostify_integration_nickname ?? tenant.hostify_integration_id ?? "Unknown"}
              </span>
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 text-sm ${
            runtimeHealthy
              ? "border-[rgba(191,220,210,0.55)] bg-[rgba(191,220,210,0.28)] text-slate-900 dark:border-[rgba(191,220,210,0.24)] dark:bg-[rgba(191,220,210,0.1)] dark:text-slate-100"
              : "border-[rgba(242,228,216,0.85)] bg-[rgba(242,228,216,0.52)] text-slate-900 dark:border-[rgba(242,228,216,0.22)] dark:bg-[rgba(242,228,216,0.08)] dark:text-slate-100"
          }`}
        >
          <p className="font-medium">
            {runtimeHealthy ? "Runtime routing looks healthy." : "Runtime routing needs attention."}
          </p>
          <p className="mt-2 text-xs">
            {runtimeHealthy
              ? "Direct mappings, aliases, and fallback routing are being tracked. Keep monitoring after new listing syncs."
              : "Review recent unresolved activity and compare webhook listing IDs with onboarding listings before enabling broader autopilot usage."}
          </p>
          <p className="mt-2 text-xs opacity-80">{recentRuntimeNote}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat title="Assistant status" value={tenant.is_active ? "ON" : "OFF"} />
          <Stat title="Mode" value={tenant.mode === "autopilot" ? "Autopilot" : "Draft"} />
          <Stat title="Total events" value={String(metrics.totalEvents)} />
          <Stat title="Last event" value={formatDate(metrics.lastEventAt)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat title="Guest messages" value={String(metrics.guestMessages)} />
          <Stat title="AI replies" value={String(metrics.aiReplies)} />
        </div>

        <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Runtime resolution path
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Active listings: {activeListingCount} / {CLOSED_BETA_MAX_ACTIVE_LISTINGS}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat title="Direct mapping" value={String(metrics.runtimeResolution.directMapping)} />
            <Stat title="Alias mapping" value={String(metrics.runtimeResolution.aliasMapping)} />
            <Stat title="Details fallback" value={String(metrics.runtimeResolution.detailsFallback)} />
            <Stat title="Unresolved" value={String(metrics.runtimeResolution.unresolved)} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat title="Backfills recorded" value={String(metrics.runtimeBackfills)} />
            <Stat title="Last runtime issue" value={formatDate(metrics.lastRuntimeIssueAt)} />
          </div>
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Runtime routing remains account-first. The onboarding listings table is for visibility and policy
            control, not the sole runtime source of truth.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat title="Assistant cost (USD)" value={formatMoneyUsd(economics.aiCostUsd)} />
          <Stat title="Estimated labor saved (USD)" value={formatMoneyUsd(economics.estimatedLaborSavedUsd)} />
          <Stat title="Estimated net value (USD)" value={formatMoneyUsd(economics.netValueUsd)} />
          <Stat title="Hours saved (est.)" value={economics.estimatedHoursSaved.toFixed(2)} />
        </div>

        <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Economic assumptions
          </p>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Labor cost/hour:{" "}
            <span className="font-medium">{formatMoneyUsd(economics.laborRateUsd)}</span>
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Avg handling time/message:{" "}
            <span className="font-medium">
              {economics.avgHandleMinutesPerMessage.toFixed(2)} min
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Listing economics (MVP)
          </p>
          {listingEconomics.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              No listing-level economics data yet.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
              <table className="min-w-full divide-y divide-black/10 text-xs dark:divide-white/15">
                <thead className="bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Listing ID</th>
                    <th className="px-3 py-2 text-left font-medium">Guest messages</th>
                    <th className="px-3 py-2 text-left font-medium">AI replies</th>
                    <th className="px-3 py-2 text-left font-medium">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/15">
                  {listingEconomics.map((row) => (
                    <tr key={row.listingId}>
                      <td className="px-3 py-2 font-mono">{row.listingId}</td>
                      <td className="px-3 py-2">{row.guestMessages}</td>
                      <td className="px-3 py-2">{row.aiReplies}</td>
                      <td className="px-3 py-2">{formatMoneyUsd(row.aiCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[rgba(255,255,255,0.55)] px-3 py-2 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
          Hostify key: {maskedKey ?? "Not set"}
        </div>

        <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
          <p>Last settings update: {formatDate(tenant.updated_at)}</p>
          <p className="mt-2">
            Jenny can guide you further from here, so this page can stay focused on the current state.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="inline-flex rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
          >
            Open onboarding
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
          >
            Back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.48)] p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
