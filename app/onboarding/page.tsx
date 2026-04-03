import { redirect } from "next/navigation";

import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getHostAccountListingsForCurrentUser,
  getMaskedHostifyKey,
  getTenantForCurrentUser,
} from "@/lib/tenant/server";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
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
  const listings = await getHostAccountListingsForCurrentUser();

  const maskedKey = getMaskedHostifyKey(tenant);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <section className="w-full max-w-5xl space-y-6 rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-black">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Configure account, listings, assistant behavior, and economics in separate tabs.
          </p>
        </header>

        <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Signed in as: {user.email ?? "Unknown user"}
        </div>

        {maskedKey ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Existing Hostify key: {maskedKey}
          </p>
        ) : null}

        <OnboardingForm tenant={tenant} listings={listings} />

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
