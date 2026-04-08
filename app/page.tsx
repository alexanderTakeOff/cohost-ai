import Link from "next/link";

import { signOut } from "./actions";
import { CLOSED_BETA_LABEL, formatClosedBetaSummary, PRODUCT_NAME } from "@/lib/product/beta";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const isSupabaseConfigured = hasSupabaseEnv();
  let userEmail: string | null = null;
  let isEmailConfirmed = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
    isEmailConfirmed = Boolean(data.user?.email_confirmed_at);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent p-6">
      <section className="w-full max-w-xl space-y-5 rounded-[28px] border border-black/8 bg-white/80 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold">{PRODUCT_NAME}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Calm AI guidance for Hostify operators, onboarding, and runtime visibility.
          </p>
        </header>

        <div className="rounded-2xl border border-[rgba(200,182,226,0.45)] bg-[rgba(242,228,216,0.45)] p-4 text-sm text-slate-800 shadow-[0_12px_32px_rgba(168,133,208,0.08)] dark:border-[rgba(200,182,226,0.25)] dark:bg-[rgba(200,182,226,0.08)] dark:text-slate-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Jenny can guide setup in chat and keep the next step clear.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-md border border-amber-400/40 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            your environment variables to enable authentication.
          </div>
        ) : userEmail ? (
          <div className="space-y-4">
            <p className="text-sm">
              Logged in as <span className="font-medium">{userEmail}</span>
            </p>
            <div className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.55)] p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
              <p className="font-medium">Jenny can take you through setup or open the right page for you.</p>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                You can stay in chat, open onboarding directly, or jump to the dashboard when you want the numbers.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/chat"
                className="inline-flex rounded-full bg-[rgba(191,220,210,0.95)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-[rgba(191,220,210,1)] dark:bg-[rgba(191,220,210,0.9)] dark:text-slate-950"
              >
                Chat with Jenny
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 dark:border-white/10 dark:bg-white/8 dark:text-slate-100"
              >
                Onboarding
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/12 dark:text-slate-200"
              >
                Dashboard
              </Link>
            </div>
            {!isEmailConfirmed ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Your email may need confirmation in Supabase Auth settings before full access.
              </p>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Start with Jenny and let her guide you into the right setup path.
            </p>
            <Link
              href="/chat"
              className="inline-flex rounded-full bg-[rgba(191,220,210,0.95)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-[rgba(191,220,210,1)] dark:bg-[rgba(191,220,210,0.9)] dark:text-slate-950"
            >
              Open Jenny
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
