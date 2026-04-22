import { hasN8nEnv } from "@/lib/n8n/env";
import type { HostAccountListingRecord, TenantRecord } from "@/lib/tenant/types";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { GlassCard } from "./glass-card";

export function OnboardingPanel({
  tenant,
  listings,
}: {
  tenant: TenantRecord | null;
  listings: HostAccountListingRecord[];
}) {
  return (
    <div className="fade-in-up space-y-5">
      <GlassCard
        title="Setup flow"
        subtitle="Save account settings, refresh listings, then switch to autopilot only after monitoring looks healthy."
      >
        <ol className="list-decimal space-y-1 pl-5 text-xs text-theme-muted">
          <li>Add Hostify key (Telegram chat ID is optional).</li>
          <li>Refresh listings and enable only what you will test.</li>
          <li>Review monitoring counters before wider rollout.</li>
        </ol>
      </GlassCard>

      <OnboardingForm tenant={tenant} listings={listings} />

      {!hasN8nEnv() ? (
        <p className="surface-subtle rounded-xl px-3 py-2 text-xs">
          N8N_WEBHOOK_URL / N8N_WEBHOOK_SECRET are not set yet. Data can be saved, but n8n sync is disabled.
        </p>
      ) : null}
    </div>
  );
}
