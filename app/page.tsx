import Link from "next/link";

import { signOut } from "./actions";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <section className="w-full max-w-xl space-y-6 rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-black">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {CLOSED_BETA_LABEL}
          </p>
          <h1 className="text-2xl font-semibold">{PRODUCT_NAME}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Runtime-first guest messaging for service tenants running Hostify, n8n, and Telegram.
          </p>
        </header>

        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
          <p className="font-medium">{formatClosedBetaSummary()}</p>
          <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
            Draft mode is recommended first. Expanded plans for growing operators are planned after beta.
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
            <div className="rounded-md border border-black/10 p-4 text-sm text-zinc-700 dark:border-white/15 dark:text-zinc-300">
              <p className="font-medium">Recommended next steps</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>Open onboarding and save your Hostify key, Telegram chat, and draft mode.</li>
                <li>Refresh listings and confirm the webhook listing IDs you expect to use.</li>
                <li>Open the dashboard to verify event flow and runtime health counters.</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/chat"
                className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white dark:bg-emerald-500 dark:text-black"
              >
                Chat with Jenny
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Onboarding
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
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
              Sign in to continue onboarding, verify listings, and monitor runtime health.
            </p>
            <Link
              href="/chat"
              className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Open Jenny
            </Link>
          </div>
        )}
      </section>
      <AssistantLauncher />
    </main>
  );
}
