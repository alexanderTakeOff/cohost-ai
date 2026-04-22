import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-lg border border-amber-400/40 bg-amber-50/82 p-6 text-sm text-amber-900">
          <p className="font-semibold">Supabase is not configured.</p>
          <p className="mt-2">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            your environment variables to use login.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
