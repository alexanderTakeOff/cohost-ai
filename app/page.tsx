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
    <main className="flex flex-1 justify-center px-4 py-8 sm:py-10">
      <section className="w-full max-w-5xl space-y-5">
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
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-300/80 bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-violet-800">
                {CLOSED_BETA_LABEL}
              </span>
              {userEmail ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-xl border border-white/70 bg-white/40 px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-white/65"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs text-violet-900/80">
            Signed in as: <span className="font-medium">{userEmail ?? "Guest"}</span>
          </div>
        </header>

        <div className="glass-surface fade-in-up rounded-xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">🎉 {formatClosedBetaSummary()}</p>
        </div>

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

                <GlassCard title="Quick access">
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/?tab=onboarding"
                      className="inline-flex rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-3 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition hover:scale-[1.02]"
                    >
                      Open onboarding
                    </Link>
                    <Link
                      href="/?tab=monitoring"
                      className="inline-flex rounded-xl border border-violet-200/80 bg-white/60 px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-white/80"
                    >
                      Open monitoring
                    </Link>
                  </div>
                  {!isEmailConfirmed ? (
                    <p className="mt-3 text-xs text-amber-700">
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
                  listingEconomics={listingEconomics}
                  maskedKey={maskedKey}
                  userEmail={userEmail}
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
