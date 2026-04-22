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
    <div className="surface-subtle rounded-xl p-4 shadow-[0_8px_20px_rgba(7,10,19,0.35)]">
      <p className="text-theme-soft text-xs">{title}</p>
      <p className="text-theme mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function DashboardPanel({
  tenant,
  metrics,
  economics,
  activeListingCount,
  listingEconomics,
  maskedKey,
}: {
  tenant: TenantRecord;
  metrics: TenantMetrics;
  economics: TenantEconomicsMetrics;
  activeListingCount: number;
  listingEconomics: ListingEconomicsRow[];
  maskedKey: string | null;
}) {
  const runtimeHealthy = metrics.runtimeResolution.unresolved === 0;
  const runtimeSummary = runtimeHealthy ? "Runtime routing is healthy." : "Runtime routing needs attention.";

  return (
    <div className="fade-in-up space-y-6">
      <div
        className={`glass-surface-strong rounded-xl p-4 text-sm ${
          runtimeHealthy
            ? "bg-emerald-900/20 text-emerald-300"
            : "bg-amber-900/28 text-amber-200"
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
          <summary className="text-theme cursor-pointer text-sm font-medium">
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
          <summary className="text-theme cursor-pointer text-sm font-medium">Listing economics</summary>
          {listingEconomics.length === 0 ? (
            <p className="text-theme-soft mt-3 text-sm">No listing-level economics data yet.</p>
          ) : (
            <div className="surface-subtle mt-3 overflow-x-auto rounded-xl">
              <table className="text-theme min-w-full divide-y divide-slate-500/30 text-xs">
                <thead className="bg-slate-500/18">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Listing ID</th>
                    <th className="px-3 py-2 text-left font-medium">Guest messages</th>
                    <th className="px-3 py-2 text-left font-medium">AI replies</th>
                    <th className="px-3 py-2 text-left font-medium">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/24">
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

      <div className="glass-surface text-theme-muted rounded-xl px-3 py-2 text-xs">
        Hostify key: {maskedKey ?? "Not set"}
      </div>
    </div>
  );
}
