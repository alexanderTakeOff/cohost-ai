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
              <h1 className="text-theme text-2xl font-semibold tracking-tight sm:text-3xl">
                {PRODUCT_NAME} Workspace
              </h1>
              <p className="text-theme-muted text-sm">
                Modern control plane for onboarding and runtime monitoring in one place.
              </p>
            </div>
            <div className="ml-auto flex w-full justify-end sm:w-auto">
              <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <span className="accent-pill inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.16em]">
                  {CLOSED_BETA_LABEL}
                </span>
                <details className="relative">
                  <summary className="control-neutral inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-xs font-semibold transition">
                    i
                  </summary>
                  <div className="surface-subtle-strong absolute right-0 top-8 z-10 w-64 rounded-xl p-3 text-xs shadow-[0_12px_30px_rgba(7,10,19,0.4)]">
                    <p className="font-medium">{formatClosedBetaSummary()}</p>
                    <p className="text-theme-soft mt-1">
                      Draft mode is recommended first. Expand to autopilot after controlled validation.
                    </p>
                  </div>
                </details>
                {userEmail ? (
                  <span className="control-neutral inline-flex h-9 max-w-[60vw] items-center truncate rounded-full px-4 text-xs sm:max-w-[260px]">
                    {userEmail}
                  </span>
                ) : null}
                {userEmail ? (
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="control-neutral inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition"
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
          <div className="surface-subtle rounded-xl p-4 text-sm">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables to
            enable authentication.
          </div>
        ) : userEmail ? (
          <div className="space-y-5 fade-in-up">
            <WorkspaceTabNav activeTab={activeTab} />

            {activeTab === "overview" ? (
              <div className="grid gap-4">
                <GlassCard title="How to connect Jenny">
                  <p className="text-theme-muted text-xs">
                    Connect in minutes:
                  </p>
                  <ol className="text-theme-muted mt-2 list-decimal space-y-1 pl-5 text-xs">
                    <li>Open Hostify -&gt; Settings.</li>
                    <li>Copy your API key.</li>
                    <li>
                      Paste it in{" "}
                      <Link
                        href="/?tab=onboarding"
                        className="accent-link font-medium"
                      >
                        Onboarding page
                      </Link>{" "}
                      and click Save.
                    </li>
                  </ol>
                  <p className="text-theme-muted mt-2 text-xs">
                    Done. Jenny, your new assistant, starts replying to guests automatically.
                  </p>
                  <p className="text-theme-soft mt-2 text-xs">
                    Telegram chat ID is optional. If not configured, internal alerts can be routed to your fallback
                    Telegram channel in n8n.
                  </p>
                  <Link
                    href="/beta-guide"
                    className="accent-link mt-3 inline text-xs font-medium transition"
                  >
                    Learn more about Jenny assistant
                  </Link>
                  {!isEmailConfirmed ? (
                    <p className="mt-3 text-xs text-[#f8c37a]">
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
            <p className="text-theme-muted text-sm">
              Sign in to continue onboarding and monitor runtime health in the workspace tabs.
            </p>
            <Link
              href="/login"
              className="accent-pill mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-medium transition hover:brightness-[1.03]"
            >
              Open login
            </Link>
          </GlassCard>
        )}
      </section>
    </main>
  );
}
