"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { AssistantCard } from "@/lib/ai/types";

import { useAssistant, type AssistantChatMessage } from "./assistant-provider";

function Bubble({
  role,
  children,
}: {
  role: AssistantChatMessage["role"];
  children: ReactNode;
}) {
  const className =
    role === "user"
      ? "ml-auto max-w-[85%] rounded-[24px] rounded-br-md bg-[rgba(175,200,248,0.95)] px-4 py-3 text-sm text-slate-950 shadow-[0_10px_24px_rgba(175,200,248,0.22)]"
      : role === "system"
        ? "mx-auto max-w-[92%] rounded-[22px] bg-[rgba(242,228,216,0.65)] px-4 py-3 text-sm text-slate-700 dark:bg-[rgba(255,255,255,0.08)] dark:text-slate-300"
        : "mr-auto max-w-[88%] rounded-[24px] rounded-bl-md border border-black/6 bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-slate-800 shadow-[0_12px_32px_rgba(31,41,55,0.08)] dark:border-white/8 dark:bg-[rgba(255,255,255,0.06)] dark:text-slate-100";
  return <div className={className}>{children}</div>;
}

function QuickRepliesCard({
  title,
  replies,
}: Extract<AssistantCard, { type: "quick_replies" }>) {
  const { sendMessage, busy } = useAssistant();
  return (
    <div className="mt-3 space-y-3 rounded-[22px] border border-black/6 bg-[rgba(255,255,255,0.58)] p-3 dark:border-white/8 dark:bg-[rgba(255,255,255,0.05)]">
      {title ? <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</p> : null}
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <button
            key={reply.id}
            type="button"
            disabled={busy}
            onClick={() => void sendMessage(reply.message)}
            className="rounded-full border border-black/8 bg-[rgba(255,255,255,0.65)] px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-[rgba(191,220,210,0.55)] disabled:opacity-50 dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)] dark:text-slate-100 dark:hover:bg-[rgba(191,220,210,0.14)]"
          >
            {reply.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DecisionCard({
  title,
  description,
  decision,
}: Extract<AssistantCard, { type: "decision" }>) {
  const toneClass =
    decision === "accepted"
      ? "border-[rgba(191,220,210,0.55)] bg-[rgba(191,220,210,0.34)] text-slate-900 dark:border-[rgba(191,220,210,0.24)] dark:bg-[rgba(191,220,210,0.1)] dark:text-slate-100"
      : decision === "waitlist"
        ? "border-[rgba(242,228,216,0.85)] bg-[rgba(242,228,216,0.52)] text-slate-900 dark:border-[rgba(242,228,216,0.22)] dark:bg-[rgba(242,228,216,0.08)] dark:text-slate-100"
        : "border-[rgba(200,182,226,0.45)] bg-[rgba(200,182,226,0.22)] text-slate-900 dark:border-[rgba(200,182,226,0.2)] dark:bg-[rgba(200,182,226,0.08)] dark:text-slate-100";
  return (
    <div className={`mt-3 rounded-xl border p-4 text-sm ${toneClass}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-xs opacity-90">{description}</p>
    </div>
  );
}

function NavigationCard({
  title,
  actions,
}: Extract<AssistantCard, { type: "navigation" }>) {
  const router = useRouter();
  return (
    <div className="mt-3 space-y-3 rounded-[22px] border border-black/6 bg-[rgba(255,255,255,0.58)] p-3 dark:border-white/8 dark:bg-[rgba(255,255,255,0.05)]">
      {title ? <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</p> : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => router.push(action.route)}
            className="rounded-full border border-black/8 bg-[rgba(255,255,255,0.65)] px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-[rgba(191,220,210,0.55)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)] dark:text-slate-100 dark:hover:bg-[rgba(191,220,210,0.14)]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuthCard({
  title,
  description,
}: Extract<AssistantCard, { type: "auth" }>) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { sendMessage } = useAssistant();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (!email || !password) {
      setFeedbackType("error");
      setFeedback("Email and password are required.");
      return;
    }

    setBusy(true);
    const response =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (response.error) {
      setFeedbackType("error");
      setFeedback(response.error.message);
      return;
    }

    setFeedbackType("success");
    setFeedback(mode === "signin" ? "Signed in. Jenny is continuing the flow." : "Account created. Jenny is continuing the flow.");
    router.refresh();
    await sendMessage("I have signed in and I'm ready to continue.");
  }

  return (
    <div className="mt-3 rounded-[24px] border border-black/6 bg-[rgba(255,255,255,0.64)] p-4 shadow-[0_12px_32px_rgba(31,41,55,0.06)] dark:border-white/8 dark:bg-[rgba(255,255,255,0.05)]">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title ?? "Continue with account access"}</p>
      {description ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${mode === "signin" ? "bg-[rgba(200,182,226,0.95)] text-slate-950" : "border border-black/8 text-zinc-700 dark:border-white/10 dark:text-zinc-300"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${mode === "signup" ? "bg-[rgba(200,182,226,0.95)] text-slate-950" : "border border-black/8 text-zinc-700 dark:border-white/10 dark:text-zinc-300"}`}
        >
          Sign up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)]"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[rgba(191,220,210,0.96)] px-4 py-2 text-sm font-medium text-slate-950 shadow-sm disabled:opacity-50"
        >
          {busy ? "Please wait..." : mode === "signin" ? "Continue with sign in" : "Create account and continue"}
        </button>
      </form>
      {feedback ? (
        <p className={`mt-3 text-xs ${feedbackType === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function AccountSetupCard({
  title,
  description,
  defaults,
}: Extract<AssistantCard, { type: "account_setup" }>) {
  const { markAccountSetupSaved } = useAssistant();
  const [hostifyApiKey, setHostifyApiKey] = useState("");
  const [telegramChatId, setTelegramChatId] = useState(defaults?.telegramChatId ?? "");
  const [mode, setMode] = useState<"draft" | "autopilot">(defaults?.mode ?? "draft");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/assistant/onboarding/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hostifyApiKey,
        telegramChatId,
        mode,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      tenant?: {
        hostifyCustomerId?: string;
        listingsFetched?: number;
      };
    };
    setBusy(false);

    if (!response.ok || payload.error) {
      setFeedbackType("error");
      setFeedback(payload.error ?? "Failed to save account settings.");
      return;
    }

    setFeedbackType("success");
    const summary = `Account saved. Hostify account ${payload.tenant?.hostifyCustomerId ?? "confirmed"}. Listings synced: ${payload.tenant?.listingsFetched ?? 0}.`;
    setFeedback(summary);
    await markAccountSetupSaved(summary);
  }

  return (
    <div className="mt-3 rounded-[24px] border border-black/6 bg-[rgba(255,255,255,0.64)] p-4 shadow-[0_12px_32px_rgba(31,41,55,0.06)] dark:border-white/8 dark:bg-[rgba(255,255,255,0.05)]">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title ?? "Account setup"}</p>
      {description ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          value={hostifyApiKey}
          onChange={(event) => setHostifyApiKey(event.target.value)}
          placeholder="Paste your Hostify API key"
          className="w-full rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)]"
        />
        <input
          type="text"
          value={telegramChatId}
          onChange={(event) => setTelegramChatId(event.target.value)}
          placeholder="-1001234567890"
          className="w-full rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)]"
        />
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value === "autopilot" ? "autopilot" : "draft")}
          className="w-full rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)]"
        >
          <option value="draft">Draft</option>
          <option value="autopilot">Autopilot</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[rgba(191,220,210,0.96)] px-4 py-2 text-sm font-medium text-slate-950 shadow-sm disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save account settings"}
        </button>
      </form>
      {feedback ? (
        <p className={`mt-3 text-xs ${feedbackType === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function MessageCards({ cards }: { cards?: AssistantCard[] }) {
  if (!cards?.length) {
    return null;
  }
  return (
    <>
      {cards.map((card, index) => {
        const key = `${card.type}-${index}`;
        if (card.type === "quick_replies") {
          return <QuickRepliesCard key={key} {...card} />;
        }
        if (card.type === "auth") {
          return <AuthCard key={key} {...card} />;
        }
        if (card.type === "account_setup") {
          return <AccountSetupCard key={key} {...card} />;
        }
        if (card.type === "decision") {
          return <DecisionCard key={key} {...card} />;
        }
        if (card.type === "navigation") {
          return <NavigationCard key={key} {...card} />;
        }
        return null;
      })}
    </>
  );
}

export function AssistantPanel({ standalone = false }: { standalone?: boolean }) {
  const { messages, sendMessage, busy, bootstrap, clearConversation, open, openAssistant, closeAssistant } =
    useAssistant();
  const [input, setInput] = useState("");
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
    scrollAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [messages, busy]);

  if (!standalone && !open) {
    return (
      <button
        type="button"
        onClick={openAssistant}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-[rgba(255,255,255,0.32)] bg-[rgba(200,182,226,0.82)] px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_14px_34px_rgba(112,102,160,0.24)] backdrop-blur transition hover:bg-[rgba(200,182,226,0.92)] dark:border-[rgba(255,255,255,0.12)] dark:bg-[rgba(200,182,226,0.72)] dark:text-slate-50"
      >
        Chat with Jenny
      </button>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message) {
      return;
    }
    setInput("");
    await sendMessage(message);
  }

  return (
    <div
      className={
        standalone
          ? "flex h-[100svh] flex-col bg-transparent"
          : "fixed inset-x-3 bottom-3 top-20 z-40 flex h-auto flex-col rounded-[30px] border border-black/6 bg-[rgba(244,246,243,0.82)] shadow-[0_22px_60px_rgba(28,35,56,0.16)] backdrop-blur dark:border-white/8 dark:bg-[rgba(26,31,48,0.82)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(82vh,760px)] sm:w-[430px]"
      }
    >
      <div className="flex items-center justify-between border-b border-black/6 px-4 py-3 dark:border-white/8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Jenny</p>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Your calm AI guide</h2>
        </div>
        <div className="flex items-center gap-2">
          {!standalone ? (
            <button
              type="button"
              onClick={closeAssistant}
              className="rounded-full border border-black/8 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-300"
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearConversation}
            className="rounded-full border border-black/8 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-300"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={scrollViewportRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28 scroll-smooth overscroll-contain"
      >
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <Bubble role={message.role}>{message.text}</Bubble>
            <MessageCards cards={message.cards} />
          </div>
        ))}
        {busy ? (
          <Bubble role="assistant">
            <span className="animate-pulse">Jenny is thinking…</span>
          </Bubble>
        ) : null}
        <div ref={scrollAnchorRef} className="h-1 w-full" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-black/6 bg-[rgba(244,246,243,0.82)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/8 dark:bg-[rgba(26,31,48,0.82)]"
      >
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Write to Jenny..."
            className="min-h-16 flex-1 rounded-[22px] border border-black/8 bg-[rgba(255,255,255,0.82)] px-3 py-3 text-sm outline-none focus:border-[rgba(200,182,226,0.9)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.07)] dark:focus:border-[rgba(200,182,226,0.6)]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[rgba(191,220,210,0.96)] px-4 py-3 text-sm font-medium text-slate-950 shadow-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
