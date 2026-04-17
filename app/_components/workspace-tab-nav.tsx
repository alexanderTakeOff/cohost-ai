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
    return "rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(129,140,248,0.35)] transition duration-200";
  }

  return "rounded-xl px-4 py-2 text-sm text-violet-900/80 transition duration-200 hover:bg-white/55 hover:text-violet-950";
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
    <nav className="glass-surface inline-flex flex-wrap gap-1 p-1">
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
