"use client";

import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  refreshListings,
  saveEconomicAssumptions,
  saveOnboarding,
  toggleListingActive,
} from "@/app/actions";
import { CLOSED_BETA_MAX_ACTIVE_LISTINGS } from "@/lib/product/beta";
import type { HostAccountListingRecord, TenantRecord } from "@/lib/tenant/types";

type FormState = {
  error: string | null;
  success: string | null;
};

const initialState: FormState = {
  error: null,
  success: null,
};

type OnboardingTab = "account" | "listings" | "assistant" | "economics";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ${
        active
          ? "border border-black/25 bg-gradient-to-r from-violet-400 to-indigo-400 text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)]"
          : "border border-black/25 bg-white/60 text-violet-900/85 hover:bg-white/78 hover:text-violet-950"
      }`}
    >
      {children}
    </button>
  );
}

function FormNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-black/25 bg-white/60 px-3 py-2 text-xs text-violet-900/80">
      {children}
    </div>
  );
}

export function OnboardingForm({
  tenant,
  listings,
}: {
  tenant: TenantRecord | null;
  listings: HostAccountListingRecord[];
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(saveOnboarding, initialState);
  const [refreshState, refreshAction, isRefreshing] = useActionState(refreshListings, initialState);
  const [toggleState, toggleAction, isToggling] = useActionState(toggleListingActive, initialState);
  const [economicsState, economicsAction, isEconomicsPending] = useActionState(
    saveEconomicAssumptions,
    initialState,
  );
  const [activeTab, setActiveTab] = useState<OnboardingTab>(tenant ? "listings" : "account");
  const [isAccountEditorOpen, setIsAccountEditorOpen] = useState(false);
  const hostifyRequired = !tenant?.hostify_api_key_encrypted;
  const activeListingsCount = listings.filter((listing) => listing.active).length;

  useEffect(() => {
    if (state.success || refreshState.success || toggleState.success || economicsState.success) {
      router.refresh();
    }
  }, [router, state.success, refreshState.success, toggleState.success, economicsState.success]);

  return (
    <div className="space-y-5 fade-in-up">
      {tenant ? (
        <div className="glass-surface rounded-2xl p-4 text-sm">
          <p className="text-xs text-violet-900/70">Current settings</p>
          <div className="mt-3 space-y-2 text-violet-900/85">
            <p>
              Hostify customer id:{" "}
              <span className="font-medium">{tenant.hostify_customer_id ?? "Not connected yet"}</span>
            </p>
            <p>
              Hostify customer name:{" "}
              <span className="font-medium">{tenant.hostify_customer_name ?? "Not available yet"}</span>
            </p>
            <p>
              Telegram chat id: <span className="font-medium">{tenant.telegram_chat_id ?? "Not set"}</span>
            </p>
            <p>
              Mode:{" "}
              <span className="font-medium">
                {tenant.mode === "autopilot" ? "Autopilot" : "Draft"}
              </span>
            </p>
            <p>
              Global instructions:{" "}
              <span className="font-medium">
                {tenant.global_instructions?.trim() ? "Configured" : "Not set"}
              </span>
            </p>
            <p>
              Hostify key:{" "}
              <span className="font-medium">
                {tenant.hostify_api_key_encrypted ? "Configured" : "Not set"}
              </span>
            </p>
            <p>
              Closed beta active listings:{" "}
              <span className="font-medium">
                {activeListingsCount} / {CLOSED_BETA_MAX_ACTIVE_LISTINGS}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="glass-surface flex flex-wrap gap-2 rounded-2xl p-1">
        <TabButton active={activeTab === "account"} onClick={() => setActiveTab("account")}>
          Account
        </TabButton>
        <TabButton active={activeTab === "listings"} onClick={() => setActiveTab("listings")}>
          Listings
        </TabButton>
        <TabButton active={activeTab === "assistant"} onClick={() => setActiveTab("assistant")}>
          Assistant
        </TabButton>
        <TabButton active={activeTab === "economics"} onClick={() => setActiveTab("economics")}>
          Economics
        </TabButton>
      </div>

      {activeTab === "account" ? (
        <div className="glass-surface space-y-4 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FormNotice>
              Account settings are collapsed by default to avoid accidental edits.
            </FormNotice>
            {!isAccountEditorOpen ? (
              <button
                type="button"
                onClick={() => setIsAccountEditorOpen(true)}
                className="rounded-full border border-black/35 bg-white/72 px-4 py-2 text-sm font-medium text-violet-900 transition hover:bg-white"
              >
                Edit account settings
              </button>
            ) : null}
          </div>

          {isAccountEditorOpen ? (
            <form action={action} className="space-y-6">
              {tenant?.hostify_customer_id ? (
                <div className="rounded-xl border border-black/25 bg-white/60 p-3 text-xs text-violet-900/80">
                  This tenant is currently linked to Hostify account{" "}
                  <span className="font-mono">{tenant.hostify_customer_id}</span>
                  {tenant.hostify_customer_name ? (
                    <>
                      {" "}
                      (<span className="font-medium">{tenant.hostify_customer_name}</span>)
                    </>
                  ) : null}
                  . If you need a different Hostify account, create a separate tenant instead of replacing this
                  binding.
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="hostifyApiKey" className="block text-sm font-medium">
                  Hostify API key
                </label>
                <input
                  id="hostifyApiKey"
                  name="hostifyApiKey"
                  type="password"
                  required={hostifyRequired}
                  minLength={12}
                  placeholder="Paste your Hostify API key"
                  className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
                <p className="text-xs text-violet-900/70">
                  {hostifyRequired
                    ? "Required for first setup."
                    : "Optional: leave empty to keep the existing key and save other changes only."}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="telegramChatId" className="block text-sm font-medium">
                  Telegram chat id
                </label>
                <input
                  id="telegramChatId"
                  name="telegramChatId"
                  type="text"
                  required
                  inputMode="numeric"
                  defaultValue={tenant?.telegram_chat_id ?? ""}
                  placeholder="e.g. -1001234567890"
                  className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
                <p className="text-xs text-violet-900/70">
                  Numeric chat id from Telegram (can include a leading minus). This is where operator-visible alerts and
                  assistant outputs are routed for this client.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="mode" className="block text-sm font-medium">
                  Mode
                </label>
                <select
                  id="mode"
                  name="mode"
                  defaultValue={tenant?.mode ?? "draft"}
                  className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                >
                  <option value="draft">Draft (manual approve)</option>
                  <option value="autopilot">Autopilot (auto send)</option>
                </select>
                <p className="text-xs text-violet-900/70">
                  Start in draft mode for beta. Switch to autopilot only after checking monitoring activity and listing
                  coverage.
                </p>
              </div>

              <input
                type="hidden"
                name="globalInstructions"
                value={tenant?.global_instructions ?? ""}
                readOnly
              />
              <input type="hidden" name="saveScope" value="account" />

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  onClick={() => {
                    setIsAccountEditorOpen(false);
                  }}
                  className="rounded-full bg-gradient-to-r from-violet-400 to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save account settings"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAccountEditorOpen(false)}
                  className="rounded-full border border-black/35 bg-white/72 px-4 py-2 text-sm font-medium text-violet-900 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>

              {state.error ? (
                <p className="text-sm text-red-700">{state.error}</p>
              ) : null}
              {state.success ? (
                <p className="text-sm text-emerald-700">{state.success}</p>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {activeTab === "listings" && tenant ? (
        <div className="glass-surface space-y-4 rounded-2xl p-4 text-sm">
          <FormNotice>
            Closed beta currently allows up to {CLOSED_BETA_MAX_ACTIVE_LISTINGS} active listings per client. Disabled
            listings stay visible here for control-plane review, but should not be used for beta traffic.
          </FormNotice>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-violet-900/60">
                Listings
              </p>
              <p className="mt-1 text-xs text-violet-900/75">
                Pulled from Hostify by your API key. Route matching uses the webhook listing ID, while this table is
                your operator control surface for enable or disable decisions.
              </p>
            </div>
            <form action={refreshAction}>
              <button
                type="submit"
                disabled={isRefreshing}
                className="rounded-xl border border-black/30 bg-white/70 px-3 py-2 text-xs font-medium text-violet-900 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshing ? "Refreshing..." : "Refresh listings"}
              </button>
            </form>
          </div>

          {listings.length === 0 ? (
            <p className="rounded-xl border border-black/25 bg-white/60 px-3 py-2 text-xs text-violet-900/80">
              No listings synced yet. Save account settings first, then refresh listings to confirm what will be
              available for beta testing.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-black/25 bg-white/60">
              <table className="min-w-full divide-y divide-white/65 text-xs text-violet-950">
                <thead className="bg-indigo-100/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Listing</th>
                    <th className="px-3 py-2 text-left font-medium">Channel ID (UI)</th>
                    <th className="px-3 py-2 text-left font-medium">Listing ID (Webhook)</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/65">
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-3 py-2">
                        <span
                          className={
                            listing.active
                              ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-800"
                              : "rounded-full bg-zinc-200 px-2 py-1 text-zinc-700"
                          }
                        >
                          {listing.active ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{listing.listing_name ?? "Unnamed listing"}</td>
                      <td className="px-3 py-2 font-mono">{listing.channel_listing_id ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{listing.listing_id}</td>
                      <td className="px-3 py-2">
                        <form action={toggleAction}>
                          <input type="hidden" name="listingId" value={listing.listing_id} />
                          <input
                            type="hidden"
                            name="active"
                            value={listing.active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            disabled={isToggling}
                            className="rounded-lg border border-black/30 bg-white/70 px-2 py-1 font-medium text-violet-900 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {listing.active ? "Disable" : "Enable"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {refreshState.error ? (
            <p className="text-sm text-red-700">{refreshState.error}</p>
          ) : null}
          {refreshState.success ? (
            <p className="text-sm text-emerald-700">{refreshState.success}</p>
          ) : null}
          {toggleState.error ? (
            <p className="text-sm text-red-700">{toggleState.error}</p>
          ) : null}
          {toggleState.success ? (
            <p className="text-sm text-emerald-700">{toggleState.success}</p>
          ) : null}
        </div>
      ) : activeTab === "listings" ? (
        <div className="rounded-xl border border-black/25 bg-amber-50/80 p-4 text-sm text-amber-900">
          Save the Account tab first so Hostify access is stored, then return here to sync and review listings.
        </div>
      ) : null}

      {activeTab === "assistant" ? (
        <form action={action} className="glass-surface space-y-6 rounded-2xl p-4">
          <FormNotice>
            Use this space for tenant-wide guidance. Keep listing-specific operational details in Hostify so runtime and
            operators stay aligned.
          </FormNotice>
          <div className="space-y-2">
            <label htmlFor="globalInstructions" className="block text-sm font-medium">
              Global instructions (tenant-level)
            </label>
            <textarea
              id="globalInstructions"
              name="globalInstructions"
              rows={8}
              maxLength={6000}
              defaultValue={tenant?.global_instructions ?? ""}
              placeholder="Add global behavior notes for the assistant for this tenant."
              className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <p className="text-xs text-violet-900/70">
              Applies across all listings for this tenant. Listing-specific notes should remain in Hostify.
            </p>
          </div>

          <input type="hidden" name="telegramChatId" value={tenant?.telegram_chat_id ?? ""} />
          <input type="hidden" name="mode" value={tenant?.mode ?? "draft"} />
          <input type="hidden" name="hostifyApiKey" value="" />
          <input type="hidden" name="saveScope" value="assistant" />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save assistant settings"}
            </button>
          </div>

          {state.error ? (
            <p className="text-sm text-red-700">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700">{state.success}</p>
          ) : null}
        </form>
      ) : null}

      {activeTab === "economics" ? (
        <form
          action={economicsAction}
          className="glass-surface space-y-6 rounded-2xl p-4"
        >
          <FormNotice>
            These values are for beta ROI visibility only. They help you estimate value without affecting runtime
            routing or message delivery.
          </FormNotice>
          <div className="space-y-2">
            <label htmlFor="laborCostPerHourUsd" className="block text-sm font-medium">
              Labor cost per hour (USD)
            </label>
            <input
              id="laborCostPerHourUsd"
              name="laborCostPerHourUsd"
              type="number"
              min={0}
              step="0.01"
              defaultValue={tenant?.labor_hourly_rate_usd ?? 0}
              className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <p className="text-xs text-violet-900/70">
              Used for estimated labor savings calculation.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="avgHandleMinutesPerMessage" className="block text-sm font-medium">
              Average handling minutes per message
            </label>
            <input
              id="avgHandleMinutesPerMessage"
              name="avgHandleMinutesPerMessage"
              type="number"
              min={0}
              step="0.1"
              defaultValue={tenant?.avg_handle_minutes_per_message ?? 0}
              className="w-full rounded-xl border border-black/30 bg-white/82 px-3 py-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <p className="text-xs text-violet-900/70">
              Interpreted as manual work replaced by each AI reply.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isEconomicsPending}
              className="rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEconomicsPending ? "Saving..." : "Save economics settings"}
            </button>
          </div>

          {economicsState.error ? (
            <p className="text-sm text-red-700">{economicsState.error}</p>
          ) : null}
          {economicsState.success ? (
            <p className="text-sm text-emerald-700">{economicsState.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
