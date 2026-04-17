import { CLOSED_BETA_MAX_ACTIVE_LISTINGS } from "@/lib/product/beta";
import type {
  ListingEconomicsRow,
  TenantEconomicsMetrics,
  TenantMetrics,
  TenantRecord,
} from "@/lib/tenant/types";
import { GlassCard } from "./glass-card";

function formatDate(value: string | null) {
  if (!value) {
    return "No events yet";
  }

  return new Date(value).toLocaleString();
}

function formatMoneyUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/55 bg-white/55 p-4 shadow-[0_8px_20px_rgba(129,140,248,0.12)]">
      <p className="text-xs text-violet-900/70">{title}</p>
      <p className="mt-1 text-lg font-semibold text-violet-950">{value}</p>
    </div>
  );
}

export function DashboardPanel({
  tenant,
  metrics,
  economics,
  listingEconomics,
  maskedKey,
  userEmail,
}: {
  tenant: TenantRecord;
  metrics: TenantMetrics;
  economics: TenantEconomicsMetrics;
  listingEconomics: ListingEconomicsRow[];
  maskedKey: string | null;
  userEmail: string | null;
}) {
  const activeListingCount = listingEconomics.length;
  const runtimeHealthy = metrics.runtimeResolution.unresolved === 0;
  const runtimeSummary = runtimeHealthy ? "Runtime routing is healthy." : "Runtime routing needs attention.";

  return (
    <div className="fade-in-up space-y-6">
      <div
        className={`glass-surface-strong rounded-xl p-4 text-sm ${
          runtimeHealthy
            ? "bg-emerald-50/70 text-emerald-900"
            : "bg-amber-50/80 text-amber-900"
        }`}
      >
        <p className="font-medium">{runtimeSummary}</p>
        <p className="mt-1 text-xs opacity-90">
          Last runtime issue: {formatDate(metrics.lastRuntimeIssueAt)}. Active listings:{" "}
          {activeListingCount} / {CLOSED_BETA_MAX_ACTIVE_LISTINGS}.
        </p>
      </div>

      <GlassCard title="Operations snapshot">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Assistant status" value={tenant.is_active ? "On" : "Off"} />
          <Stat title="Mode" value={tenant.mode === "autopilot" ? "Autopilot" : "Draft"} />
          <Stat title="Total events" value={String(metrics.totalEvents)} />
          <Stat title="Last event" value={formatDate(metrics.lastEventAt)} />
        </div>
      </GlassCard>

      <GlassCard title="Message flow">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Guest messages" value={String(metrics.guestMessages)} />
          <Stat title="AI replies" value={String(metrics.aiReplies)} />
          <Stat title="Resolution unresolved" value={String(metrics.runtimeResolution.unresolved)} />
          <Stat title="Backfills" value={String(metrics.runtimeBackfills)} />
        </div>
      </GlassCard>

      <GlassCard title="Economics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Assistant cost" value={formatMoneyUsd(economics.aiCostUsd)} />
          <Stat title="Labor saved (est.)" value={formatMoneyUsd(economics.estimatedLaborSavedUsd)} />
          <Stat title="Net value (est.)" value={formatMoneyUsd(economics.netValueUsd)} />
          <Stat title="Hours saved (est.)" value={economics.estimatedHoursSaved.toFixed(2)} />
        </div>
      </GlassCard>

      <GlassCard className="p-0">
        <details className="rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-violet-950">
            Resolution path details
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat title="Direct mapping" value={String(metrics.runtimeResolution.directMapping)} />
            <Stat title="Alias mapping" value={String(metrics.runtimeResolution.aliasMapping)} />
            <Stat title="Details fallback" value={String(metrics.runtimeResolution.detailsFallback)} />
            <Stat title="Unresolved" value={String(metrics.runtimeResolution.unresolved)} />
          </div>
        </details>
      </GlassCard>

      <GlassCard className="p-0">
        <details className="rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-violet-950">Listing economics</summary>
          {listingEconomics.length === 0 ? (
            <p className="mt-3 text-sm text-violet-900/75">No listing-level economics data yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/60 bg-white/55">
              <table className="min-w-full divide-y divide-white/70 text-xs text-violet-950">
                <thead className="bg-indigo-100/55">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Listing ID</th>
                    <th className="px-3 py-2 text-left font-medium">Guest messages</th>
                    <th className="px-3 py-2 text-left font-medium">AI replies</th>
                    <th className="px-3 py-2 text-left font-medium">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/65">
                  {listingEconomics.map((row) => (
                    <tr key={row.listingId}>
                      <td className="px-3 py-2 font-mono">{row.listingId}</td>
                      <td className="px-3 py-2">{row.guestMessages}</td>
                      <td className="px-3 py-2">{row.aiReplies}</td>
                      <td className="px-3 py-2">{formatMoneyUsd(row.aiCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </GlassCard>

      <div className="glass-surface rounded-xl px-3 py-2 text-xs text-violet-900/80">
        Signed in as: {userEmail ?? "Unknown user"} · Hostify key: {maskedKey ?? "Not set"}
      </div>
    </div>
  );
}
