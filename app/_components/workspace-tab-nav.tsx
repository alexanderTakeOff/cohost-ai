"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WorkspaceTab = "overview" | "onboarding" | "monitoring";

const TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "onboarding", label: "Onboarding" },
  { key: "monitoring", label: "Monitoring" },
];

function tabButtonClass(active: boolean) {
  if (active) {
    return "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";
  }

  return "rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900";
}

export function WorkspaceTabNav({ activeTab }: { activeTab: WorkspaceTab }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function onSelect(tab: WorkspaceTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <nav className="inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={tabButtonClass(activeTab === tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
