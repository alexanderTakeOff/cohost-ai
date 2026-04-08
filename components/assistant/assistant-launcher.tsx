"use client";

import { useAssistant } from "./assistant-provider";

export function AssistantLauncher({ label = "Chat with Jenny" }: { label?: string }) {
  const { openAssistant } = useAssistant();

  return (
    <button
      type="button"
      onClick={openAssistant}
      className="fixed bottom-5 right-5 z-30 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-cyan-400"
    >
      {label}
    </button>
  );
}
