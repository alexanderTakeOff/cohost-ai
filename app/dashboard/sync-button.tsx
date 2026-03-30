"use client";

import { useActionState } from "react";

import { syncTenantToN8n } from "@/app/actions";

type FormState = {
  error: string | null;
  success: string | null;
};

const initialState: FormState = {
  error: null,
  success: null,
};

export function SyncButton() {
  const [state, action, isPending] = useActionState(syncTenantToN8n, initialState);

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25"
      >
        {isPending ? "Syncing..." : "Sync config to n8n"}
      </button>
      {state.error ? <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.success ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{state.success}</p>
      ) : null}
    </form>
  );
}
