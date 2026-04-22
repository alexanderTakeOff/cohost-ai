"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  CLOSED_BETA_LABEL,
  CLOSED_BETA_MAX_ACTIVE_LISTINGS,
  CLOSED_BETA_MAX_TENANTS,
  PRODUCT_NAME,
} from "@/lib/product/beta";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "success" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn() {
    if (!email || !password) {
      setMessageType("error");
      setMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function signUp() {
    if (!email || !password) {
      setMessageType("error");
      setMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage(
      data.user?.identities?.length
        ? "Access request created. If email confirmation is enabled, confirm via email and then sign in."
        : "This email already exists. If you were invited earlier, sign in instead of creating a new account.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nativeEvent = event.nativeEvent;
    const submitter =
      "submitter" in nativeEvent
        ? (nativeEvent.submitter as HTMLButtonElement | null)
        : null;
    const intent = submitter?.value;

    if (intent === "signup") {
      await signUp();
      return;
    }

    await signIn();
  }

  return (
    <div className="glass-surface-strong w-full max-w-md space-y-6 rounded-2xl p-6 text-theme">
      <div className="space-y-1">
        <p className="text-theme-soft text-xs font-medium uppercase tracking-[0.2em]">
          {CLOSED_BETA_LABEL}
        </p>
        <h1 className="text-2xl font-semibold">{PRODUCT_NAME}</h1>
        <p className="text-theme-muted text-sm">
          Sign in with email/password or request access for a new beta account.
        </p>
      </div>

      <div className="surface-subtle rounded-xl p-4 text-xs">
        <p className="font-medium">Closed beta scope</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Up to {CLOSED_BETA_MAX_TENANTS} client accounts during beta.</li>
          <li>Up to {CLOSED_BETA_MAX_ACTIVE_LISTINGS} active listings per client.</li>
          <li>Free during beta while onboarding, routing, and operator UX are refined.</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="field-surface w-full rounded-xl px-3 py-2 text-sm outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            required
            className="field-surface w-full rounded-xl px-3 py-2 text-sm outline-none"
            placeholder="••••••••"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            value="signin"
            className="accent-pill rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign in"}
          </button>
          <button
            type="submit"
            value="signup"
            className="control-neutral rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign up"}
          </button>
        </div>

        {message ? (
          <p
            className={
              messageType === "error"
                ? "text-sm text-red-700"
                : "text-sm text-emerald-700"
            }
          >
            {message}
          </p>
        ) : null}

        <p className="text-theme-soft text-xs">
          Recommended flow: sign in if you already have access, then complete onboarding in draft mode first.
        </p>
      </form>
    </div>
  );
}
