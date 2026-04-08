"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-cyan-500 px-4 py-3 text-sm text-white"
      : role === "system"
        ? "mx-auto max-w-[92%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        : "mr-auto max-w-[88%] rounded-2xl rounded-bl-md border border-black/10 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100";
  return <div className={className}>{children}</div>;
}

function QuickRepliesCard({
  title,
  replies,
}: Extract<AssistantCard, { type: "quick_replies" }>) {
  const { sendMessage, busy } = useAssistant();
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-zinc-50 p-3 dark:border-white/15 dark:bg-zinc-900">
      {title ? <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</p> : null}
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <button
            key={reply.id}
            type="button"
            disabled={busy}
            onClick={() => void sendMessage(reply.message)}
            className="rounded-full border border-black/15 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
      ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
      : decision === "waitlist"
        ? "border-amber-300/40 bg-amber-50/80 text-amber-950 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100"
        : "border-zinc-300/50 bg-zinc-50/80 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
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
    <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-zinc-50 p-3 dark:border-white/15 dark:bg-zinc-900">
      {title ? <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</p> : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => router.push(action.route)}
            className="rounded-full border border-black/15 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
    <div className="mt-3 rounded-xl border border-black/10 bg-zinc-50 p-4 dark:border-white/15 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title ?? "Continue with account access"}</p>
      {description ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${mode === "signin" ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/15 text-zinc-700 dark:border-white/20 dark:text-zinc-300"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${mode === "signup" ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/15 text-zinc-700 dark:border-white/20 dark:text-zinc-300"}`}
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
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-950"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
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
    <div className="mt-3 rounded-xl border border-black/10 bg-zinc-50 p-4 dark:border-white/15 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title ?? "Account setup"}</p>
      {description ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          value={hostifyApiKey}
          onChange={(event) => setHostifyApiKey(event.target.value)}
          placeholder="Paste your Hostify API key"
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-950"
        />
        <input
          type="text"
          value={telegramChatId}
          onChange={(event) => setTelegramChatId(event.target.value)}
          placeholder="-1001234567890"
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-950"
        />
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value === "autopilot" ? "autopilot" : "draft")}
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-950"
        >
          <option value="draft">Draft</option>
          <option value="autopilot">Autopilot</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
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

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!standalone && !open) {
    return (
      <button
        type="button"
        onClick={openAssistant}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-2xl dark:bg-white dark:text-black"
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
          ? "flex h-[100dvh] flex-col bg-zinc-50 dark:bg-black"
          : "flex h-full flex-col rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/15 dark:bg-black"
      }
    >
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Jenny</p>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Cohost AI guide</h2>
        </div>
        <div className="flex items-center gap-2">
          {!standalone ? (
            <button
              type="button"
              onClick={closeAssistant}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/20 dark:text-zinc-300"
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearConversation}
            className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/20 dark:text-zinc-300"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
      </div>

      <form onSubmit={handleSubmit} className="border-t border-black/10 p-4 dark:border-white/10">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Write to Jenny..."
            className="min-h-20 flex-1 rounded-xl border border-black/15 bg-zinc-50 px-3 py-3 text-sm outline-none focus:border-black dark:border-white/20 dark:bg-zinc-950 dark:focus:border-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
