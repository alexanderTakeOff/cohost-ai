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
              <h1 className="text-2xl font-semibold tracking-tight text-violet-950 sm:text-3xl">
                {PRODUCT_NAME} Workspace
              </h1>
              <p className="text-sm text-violet-900/75">
                Modern control plane for onboarding and runtime monitoring in one place.
              </p>
            </div>
            <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-black/30 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-violet-800">
                  {CLOSED_BETA_LABEL}
                </span>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-full border border-black/30 bg-white/75 px-2 py-0.5 text-xs font-semibold text-violet-900 transition hover:bg-white">
                    i
                  </summary>
                  <div className="absolute right-0 top-8 z-10 w-64 rounded-xl border border-black/30 bg-white/92 p-3 text-xs text-violet-900 shadow-[0_12px_30px_rgba(30,27,75,0.16)]">
                    <p className="font-medium">{formatClosedBetaSummary()}</p>
                    <p className="mt-1 text-violet-900/75">
                      Draft mode is recommended first. Expand to autopilot after controlled validation.
                    </p>
                  </div>
                </details>
              </div>
              {userEmail ? (
                <div className="flex max-w-full items-center gap-2 text-xs text-violet-900/85">
                  <span className="max-w-[52vw] truncate sm:max-w-[260px]">{userEmail}</span>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="rounded-xl border border-black/35 bg-white/55 px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-white/78"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              ) : null}
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
              <div className="grid gap-4 md:grid-cols-2">
                <GlassCard title="Suggested flow">
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-violet-900/85">
                    <li>Complete Account and Listings in Onboarding.</li>
                    <li>Keep Draft mode while testing message flow.</li>
                    <li>Review Monitoring counters before enabling Autopilot.</li>
                  </ol>
                </GlassCard>

                <GlassCard title="Workspace notes">
                  <p className="text-xs text-violet-900/80">
                    Use the tabs above to move between onboarding and monitoring. This avoids duplicated
                    navigation controls and keeps the workspace compact.
                  </p>
                  {!isEmailConfirmed ? (
                    <p className="mt-3 text-xs text-amber-800">
                      Email confirmation may still be required in Supabase Auth settings.
                    </p>
                  ) : null}
                </GlassCard>
              </div>
            ) : null}

            {activeTab === "onboarding" ? (
              <OnboardingPanel tenant={tenant} listings={listings} maskedKey={maskedKey} />
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
            <p className="text-sm text-violet-900/80">
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
