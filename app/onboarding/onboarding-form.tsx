"use client";

import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { refreshListings, saveOnboarding, toggleListingActive } from "@/app/actions";
import type { HostAccountListingRecord, TenantRecord } from "@/lib/tenant/types";

type FormState = {
  error: string | null;
  success: string | null;
};

const initialState: FormState = {
  error: null,
  success: null,
};

type OnboardingTab = "account" | "listings" | "assistant";

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
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {children}
    </button>
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
  const [activeTab, setActiveTab] = useState<OnboardingTab>(tenant ? "listings" : "account");
  const hostifyRequired = !tenant?.hostify_api_key_encrypted;

  useEffect(() => {
    if (state.success || refreshState.success || toggleState.success) {
      router.refresh();
    }
  }, [router, state.success, refreshState.success, toggleState.success]);

  return (
    <div className="space-y-6">
      {tenant ? (
        <div className="rounded-md border border-black/10 p-4 text-sm dark:border-white/15">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Current settings
          </p>
          <div className="mt-3 space-y-2 text-zinc-700 dark:text-zinc-300">
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
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-md border border-black/10 p-1 dark:border-white/15">
        <TabButton active={activeTab === "account"} onClick={() => setActiveTab("account")}>
          Account
        </TabButton>
        <TabButton active={activeTab === "listings"} onClick={() => setActiveTab("listings")}>
          Listings
        </TabButton>
        <TabButton active={activeTab === "assistant"} onClick={() => setActiveTab("assistant")}>
          Assistant
        </TabButton>
      </div>

      {activeTab === "account" ? (
        <form action={action} className="space-y-6 rounded-md border border-black/10 p-4 dark:border-white/15">
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
              className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hostifyRequired
                ? "Required for first setup."
                : "Optional: leave empty to keep existing key."}
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
              className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Numeric chat id from Telegram (can include leading minus).
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
              className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
            >
              <option value="draft">Draft (manual approve)</option>
              <option value="autopilot">Autopilot (auto send)</option>
            </select>
          </div>

          <input
            type="hidden"
            name="globalInstructions"
            value={tenant?.global_instructions ?? ""}
          />
          <input type="hidden" name="saveScope" value="account" />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isPending ? "Saving..." : "Save account settings"}
            </button>
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{state.success}</p>
          ) : null}
        </form>
      ) : null}

      {activeTab === "listings" && tenant ? (
        <div className="space-y-4 rounded-md border border-black/10 p-4 text-sm dark:border-white/15">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Listings
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Pulled from Hostify by your API key. Route matching uses listing ID from webhook.
              </p>
            </div>
            <form action={refreshAction}>
              <button
                type="submit"
                disabled={isRefreshing}
                className="rounded-md border border-black/20 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25"
              >
                {isRefreshing ? "Refreshing..." : "Refresh listings"}
              </button>
            </form>
          </div>

          {listings.length === 0 ? (
            <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              No listings synced yet. Save onboarding or press refresh.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
              <table className="min-w-full divide-y divide-black/10 text-xs dark:divide-white/15">
                <thead className="bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Listing</th>
                    <th className="px-3 py-2 text-left font-medium">Channel ID (UI)</th>
                    <th className="px-3 py-2 text-left font-medium">Listing ID (Webhook)</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/15">
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-3 py-2">
                        <span
                          className={
                            listing.active
                              ? "rounded bg-emerald-100 px-2 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "rounded bg-zinc-200 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
                            className="rounded-md border border-black/20 px-2 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25"
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
            <p className="text-sm text-red-600 dark:text-red-400">{refreshState.error}</p>
          ) : null}
          {refreshState.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{refreshState.success}</p>
          ) : null}
          {toggleState.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{toggleState.error}</p>
          ) : null}
          {toggleState.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{toggleState.success}</p>
          ) : null}
        </div>
      ) : null}

      {activeTab === "assistant" ? (
        <form action={action} className="space-y-6 rounded-md border border-black/10 p-4 dark:border-white/15">
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
              className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isPending ? "Saving..." : "Save assistant settings"}
            </button>
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{state.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
