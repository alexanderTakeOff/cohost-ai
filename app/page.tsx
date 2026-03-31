import Link from "next/link";

import { signOut } from "./actions";
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
          <h1 className="text-2xl font-semibold">Supabase Auth Demo</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Simple session handling with Next.js App Router.
          </p>
        </header>

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
            <div className="flex flex-wrap gap-2">
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
              You are not logged in.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Go to login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
