"use client";

import { usePathname } from "next/navigation";

import { AssistantPanel } from "./assistant-panel";

export function AssistantShell() {
  const pathname = usePathname();

  if (pathname === "/chat") {
    return null;
  }

  return <AssistantPanel />;
}
