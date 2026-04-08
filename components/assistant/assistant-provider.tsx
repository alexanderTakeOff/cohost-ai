"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import type {
  AssistantCard,
  AssistantConversationContext,
} from "@/lib/ai/types";

export type AssistantChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  cards?: AssistantCard[];
};

type AssistantStore = {
  open: boolean;
  busy: boolean;
  messages: AssistantChatMessage[];
  context: AssistantConversationContext | null;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  bootstrap: () => Promise<void>;
  clearConversation: () => void;
  markAccountSetupSaved: (summary: string) => Promise<void>;
};

const STORAGE_KEY = "cohost-ai-assistant-state-v1";

const AssistantContext = createContext<AssistantStore | null>(null);

function createMessage(
  role: AssistantChatMessage["role"],
  text: string,
  cards?: AssistantCard[],
): AssistantChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    cards,
  };
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [context, setContext] = useState<AssistantConversationContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        messages?: AssistantChatMessage[];
        context?: AssistantConversationContext | null;
      };
      setMessages(parsed.messages ?? []);
      setContext(parsed.context ?? null);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        context,
      }),
    );
  }, [messages, context]);

  useEffect(() => {
    if (pathname === "/chat") {
      setOpen(false);
    }
  }, [pathname]);

  const requestAssistant = useCallback(async (message: string, nextContext?: AssistantConversationContext | null) => {
    setBusy(true);
    try {
      const response = await fetch("/api/assistant/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          context: nextContext ?? context,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        assistantText?: string;
        cards?: AssistantCard[];
        context?: AssistantConversationContext;
        openRoute?: string | null;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Assistant request failed.");
      }

      setContext(payload.context ?? null);
      setMessages((current) => [
        ...current,
        createMessage("assistant", payload.assistantText ?? "", payload.cards ?? []),
      ]);

      if (payload.openRoute) {
        window.location.href = payload.openRoute;
      }
    } finally {
      setBusy(false);
    }
  }, [context]);

  const sendMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) {
      return;
    }
    setMessages((current) => [...current, createMessage("user", trimmed)]);
    await requestAssistant(trimmed);
  }, [busy, requestAssistant]);

  const bootstrap = useCallback(async () => {
    if (busy || messages.length > 0) {
      return;
    }
    await requestAssistant("");
  }, [busy, messages.length, requestAssistant]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setContext(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const markAccountSetupSaved = useCallback(async (summary: string) => {
    const nextContext = context
      ? {
          ...context,
          onboardingAccountSaved: true,
        }
      : null;
    if (summary) {
      setMessages((current) => [...current, createMessage("system", summary)]);
    }
    setContext(nextContext);
    await requestAssistant("My account settings are saved. Continue.", nextContext);
  }, [context, requestAssistant]);

  const value = useMemo<AssistantStore>(
    () => ({
      open,
      busy,
      messages,
      context,
      openAssistant: () => setOpen(true),
      closeAssistant: () => setOpen(false),
      sendMessage,
      bootstrap,
      clearConversation,
      markAccountSetupSaved,
    }),
    [open, busy, messages, context, sendMessage, bootstrap, clearConversation, markAccountSetupSaved],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider.");
  }
  return context;
}
