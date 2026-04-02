"use client";

import { useActionState, useState } from "react";

import { saveOnboarding } from "@/app/actions";
import type { TenantRecord } from "@/lib/tenant/types";

type FormState = {
  error: string | null;
  success: string | null;
};

const initialState: FormState = {
  error: null,
  success: null,
};

export function OnboardingForm({ tenant }: { tenant: TenantRecord | null }) {
  const [state, action, isPending] = useActionState(saveOnboarding, initialState);
  const [isEditing, setIsEditing] = useState(tenant === null);
  const hostifyRequired = !tenant?.hostify_api_key_encrypted;

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
          </div>
        </div>
      ) : null}

      {tenant && !isEditing ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
        >
          Edit settings
        </button>
      ) : null}

      {isEditing ? (
        <form action={action} className="space-y-6">
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
              placeholder="e.g. 123456789"
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

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isPending ? "Saving..." : "Save settings"}
            </button>
            {tenant ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
              >
                Cancel
              </button>
            ) : null}
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
