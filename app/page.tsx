import Link from "next/link";

import { signOut } from "./actions";
import { DashboardPanel } from "./_components/dashboard-panel";
import { OnboardingPanel } from "./_components/onboarding-panel";
import { type WorkspaceTab, WorkspaceTabNav } from "./_components/workspace-tab-nav";
import { CLOSED_BETA_LABEL, formatClosedBetaSummary, PRODUCT_NAME } from "@/lib/product/beta";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
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
      metrics = await getTenantMetrics(tenant.id);
      economics = await getTenantEconomicsMetrics(tenant.id);
      listingEconomics = await getListingEconomicsForCurrentUser();
    }
  }

  const maskedKey = getMaskedHostifyKey(tenant);

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-4 sm:p-6 dark:bg-black">
      <section className="w-full max-w-6xl space-y-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-8 dark:border-white/15 dark:bg-black">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{PRODUCT_NAME} Workspace</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Configure onboarding and monitor runtime health from one clean workspace.
          </p>
        </header>

        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables to
            enable authentication.
          </div>
        ) : userEmail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <p>
                Signed in as <span className="font-medium">{userEmail}</span>
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/25"
                >
                  Sign out
                </button>
              </form>
            </div>

            <WorkspaceTabNav activeTab={activeTab} />

            {activeTab === "overview" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Suggested flow</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>Complete Account and Listings in Onboarding.</li>
                    <li>Keep Draft mode while testing message flow.</li>
                    <li>Review Monitoring counters before enabling Autopilot.</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Quick access</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/?tab=onboarding"
                      className="inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Open onboarding
                    </Link>
                    <Link
                      href="/?tab=monitoring"
                      className="inline-flex rounded-lg border border-black/20 px-3 py-2 text-sm font-medium dark:border-white/25"
                    >
                      Open monitoring
                    </Link>
                  </div>
                  {!isEmailConfirmed ? (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                      Email confirmation may still be required in Supabase Auth settings.
                    </p>
                  ) : null}
                </div>
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
                  listingEconomics={listingEconomics}
                  maskedKey={maskedKey}
                  userEmail={userEmail}
                />
              ) : (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  Complete onboarding setup first, then monitoring counters will appear here.
                </div>
              )
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to continue onboarding and monitor runtime health in the workspace tabs.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Open login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
