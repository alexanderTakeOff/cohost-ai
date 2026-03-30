"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

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

    const { error } = await supabase.auth.signUp({
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
      "Sign-up request sent. If email confirmation is enabled in Supabase, confirm via email, then sign in.",
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
    <div className="w-full max-w-md space-y-6 rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-black">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in with email/password or create a new account.
        </p>
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
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
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
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/25 dark:focus:border-white"
            placeholder="••••••••"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            value="signin"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign in"}
          </button>
          <button
            type="submit"
            value="signup"
            className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign up"}
          </button>
        </div>

        {message ? (
          <p
            className={
              messageType === "error"
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-emerald-700 dark:text-emerald-300"
            }
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
