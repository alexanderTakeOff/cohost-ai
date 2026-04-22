"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WorkspaceTab = "overview" | "onboarding" | "monitoring";

const TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "onboarding", label: "Onboarding" },
  { key: "monitoring", label: "Monitoring" },
];

function tabButtonClass(active: boolean) {
  if (active) {
    return "rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition duration-200";
  }

  return "rounded-xl border border-slate-500/35 bg-slate-100/80 px-4 py-2 text-sm text-slate-700 transition duration-200 hover:bg-slate-100 hover:text-slate-900";
}

export function WorkspaceTabNav({ activeTab }: { activeTab: WorkspaceTab }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<WorkspaceTab | null>(null);
  const uiActiveTab = isPending ? (pendingTab ?? activeTab) : activeTab;

  function onSelect(tab: WorkspaceTab) {
    if (tab === uiActiveTab) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    setPendingTab(tab);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <nav className="glass-surface inline-flex flex-wrap gap-1 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          disabled={isPending}
          onMouseEnter={() => router.prefetch(`${pathname}?tab=${tab.key}`)}
          className={`${tabButtonClass(uiActiveTab === tab.key)} disabled:cursor-wait disabled:opacity-95`}
          aria-busy={isPending && pendingTab === tab.key}
        >
          <span className="inline-flex items-center gap-2">
            {tab.label}
            {isPending && pendingTab === tab.key ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            ) : null}
          </span>
        </button>
      ))}
    </nav>
  );
}
