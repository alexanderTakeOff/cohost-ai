import Link from "next/link";
import { redirect } from "next/navigation";

import { hasN8nEnv } from "@/lib/n8n/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  getCurrentUserId,
  getMaskedHostifyKey,
  getTenantForCurrentUser,
  getTenantMetrics,
} from "@/lib/tenant/server";

import { SyncButton } from "./sync-button";

function formatDate(value: string | null) {
  if (!value) {
    return "No events yet";
  }

  return new Date(value).toLocaleString();
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

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const tenant = await getTenantForCurrentUser();

  if (!tenant) {
    redirect("/onboarding");
  }

  const metrics = await getTenantMetrics(tenant.id);
  const maskedKey = getMaskedHostifyKey(tenant);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <section className="w-full max-w-2xl space-y-6 rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-black">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Minimal control panel for tenant status and integration health.
          </p>
        </header>

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

        <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Hostify key: {maskedKey ?? "Not set"}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/onboarding"
            className="inline-flex rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
          >
            Edit onboarding
          </Link>
          {hasN8nEnv() ? (
            <SyncButton />
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              n8n sync is disabled: set N8N_WEBHOOK_URL and N8N_WEBHOOK_SECRET.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
