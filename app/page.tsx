import Link from "next/link";

import { signOut } from "./actions";
import { DashboardPanel } from "./_components/dashboard-panel";
import { GlassCard } from "./_components/glass-card";
import { OnboardingPanel } from "./_components/onboarding-panel";
import { type WorkspaceTab, WorkspaceTabNav } from "./_components/workspace-tab-nav";
import { CLOSED_BETA_LABEL, formatClosedBetaSummary, PRODUCT_NAME } from "@/lib/product/beta";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveListingCountForCurrentUser,
  getHostAccountListingsForCurrentUser,
  getListingEconomicsForCurrentUser,
  getMaskedHostifyKey,
  getTenantEconomicsMetrics,
  getTenantForCurrentUser,
  getTenantMetrics,
} from "@/lib/tenant/server";
import type {
  HostAccountListingRecord,
  ListingEconomicsRow,
  TenantEconomicsMetrics,
  TenantMetrics,
  TenantRecord,
} from "@/lib/tenant/types";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseTab(value: string | string[] | undefined): WorkspaceTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "onboarding" || raw === "monitoring") {
    return raw;
  }
  return "overview";
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const activeTab = parseTab(params.tab);
  const isSupabaseConfigured = hasSupabaseEnv();
  let userEmail: string | null = null;
  let isEmailConfirmed = false;
  let tenant: TenantRecord | null = null;
  let listings: HostAccountListingRecord[] = [];
  let activeListingCount = 0;
  let listingEconomics: ListingEconomicsRow[] = [];
  let metrics: TenantMetrics | null = null;
  let economics: TenantEconomicsMetrics | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
    isEmailConfirmed = Boolean(data.user?.email_confirmed_at);
  }

  if (userEmail) {
    tenant = await getTenantForCurrentUser();
    if (activeTab === "onboarding") {
      listings = await getHostAccountListingsForCurrentUser();
    }
    if (activeTab === "monitoring" && tenant) {
      activeListingCount = await getActiveListingCountForCurrentUser();
      metrics = await getTenantMetrics(tenant.id);
      economics = await getTenantEconomicsMetrics(tenant.id);
      listingEconomics = await getListingEconomicsForCurrentUser();
    }
  }

  const maskedKey = getMaskedHostifyKey(tenant);

  return (
    <main className="flex flex-1 justify-center px-3 py-7 sm:px-4 sm:py-10">
      <section className="w-full max-w-3xl space-y-5">
        <header className="glass-surface-strong fade-in-up space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {PRODUCT_NAME} Workspace
              </h1>
              <p className="text-sm text-slate-700">
                Modern control plane for onboarding and runtime monitoring in one place.
              </p>
            </div>
            <div className="ml-auto flex w-full justify-end sm:w-auto">
              <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <span className="inline-flex h-9 items-center rounded-full border border-violet-400/45 bg-violet-500/10 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  {CLOSED_BETA_LABEL}
                </span>
                <details className="relative">
                  <summary className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-500/35 bg-slate-100/85 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                    i
                  </summary>
                  <div className="absolute right-0 top-8 z-10 w-64 rounded-xl border border-slate-500/35 bg-slate-100/95 p-3 text-xs text-slate-800 shadow-[0_12px_30px_rgba(30,41,59,0.18)]">
                    <p className="font-medium">{formatClosedBetaSummary()}</p>
                    <p className="mt-1 text-slate-600">
                      Draft mode is recommended first. Expand to autopilot after controlled validation.
                    </p>
                  </div>
                </details>
                {userEmail ? (
                  <span className="inline-flex h-9 max-w-[60vw] items-center truncate rounded-full border border-slate-500/35 bg-slate-100/80 px-4 text-xs text-slate-700 sm:max-w-[260px]">
                    {userEmail}
                  </span>
                ) : null}
                {userEmail ? (
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center rounded-full border border-slate-500/40 bg-slate-100/75 px-4 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Log out
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {!isSupabaseConfigured ? (
          <div className="glass-surface rounded-xl bg-amber-50/80 p-4 text-sm text-amber-900">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables to
            enable authentication.
          </div>
        ) : userEmail ? (
          <div className="space-y-5 fade-in-up">
            <WorkspaceTabNav activeTab={activeTab} />

            {activeTab === "overview" ? (
              <div className="grid gap-4">
                <GlassCard title="How to connect Jenny">
                  <p className="text-xs text-slate-700">
                    Connect in minutes:
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
                    <li>Open Hostify -&gt; Settings.</li>
                    <li>Copy your API key.</li>
                    <li>
                      Paste it in{" "}
                      <Link
                        href="/?tab=onboarding"
                        className="font-medium text-violet-700 underline decoration-violet-400 underline-offset-2 hover:text-violet-600"
                      >
                        Onboarding page
                      </Link>{" "}
                      and click Save.
                    </li>
                  </ol>
                  <p className="mt-2 text-xs text-slate-700">
                    Done. Jenny, your new assistant, starts replying to guests automatically.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Telegram chat ID is optional. If not configured, internal alerts can be routed to your fallback
                    Telegram channel in n8n.
                  </p>
                  <Link
                    href="/beta-guide"
                    className="mt-3 inline text-xs font-medium text-violet-700 underline decoration-violet-400 underline-offset-2 transition hover:text-violet-600"
                  >
                    Learn more about Jenny assistant
                  </Link>
                  {!isEmailConfirmed ? (
                    <p className="mt-3 text-xs text-amber-800">
                      Email confirmation may still be required in Supabase Auth settings.
                    </p>
                  ) : null}
                </GlassCard>
              </div>
            ) : null}

            {activeTab === "onboarding" ? (
              <OnboardingPanel tenant={tenant} listings={listings} />
            ) : null}

            {activeTab === "monitoring" ? (
              tenant && metrics && economics ? (
                <DashboardPanel
                  tenant={tenant}
                  metrics={metrics}
                  economics={economics}
                  activeListingCount={activeListingCount}
                  listingEconomics={listingEconomics}
                  maskedKey={maskedKey}
                />
              ) : (
                <GlassCard title="Monitoring" subtitle="Runtime counters appear after onboarding is saved.">
                  Complete onboarding setup first, then monitoring counters will appear here.
                </GlassCard>
              )
            ) : null}
          </div>
        ) : (
          <GlassCard className="fade-in-up" title="Sign in required">
            <p className="text-sm text-slate-700">
              Sign in to continue onboarding and monitor runtime health in the workspace tabs.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition hover:scale-[1.02]"
            >
              Open login
            </Link>
          </GlassCard>
        )}
      </section>
    </main>
  );
}
