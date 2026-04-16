import { hasN8nEnv } from "@/lib/n8n/env";
import type { HostAccountListingRecord, TenantRecord } from "@/lib/tenant/types";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";

export function OnboardingPanel({
  tenant,
  listings,
  maskedKey,
}: {
  tenant: TenantRecord | null;
  listings: HostAccountListingRecord[];
  maskedKey: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">Setup flow</p>
        <p className="mt-1 text-xs">
          Save account settings, refresh listings, then switch to autopilot only after monitoring looks healthy.
        </p>
      </div>

      {maskedKey ? (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Existing Hostify key: {maskedKey}
        </p>
      ) : null}

      <OnboardingForm tenant={tenant} listings={listings} />

      {!hasN8nEnv() ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          N8N_WEBHOOK_URL / N8N_WEBHOOK_SECRET are not set yet. Data can be saved, but n8n sync is disabled.
        </p>
      ) : null}
    </div>
  );
}
