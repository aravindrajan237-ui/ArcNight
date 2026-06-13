"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * AUTH METHOD — which one is active:
 *
 *   ✅ ACTIVE: Email magic-link (OTP). Works on Supabase's free tier with no
 *      paid SMS provider. The user enters their email, gets a 6-digit code /
 *      magic link, and is signed in.
 *
 *   💤 OPTIONAL: Phone OTP. Requires a paid SMS provider configured in Supabase
 *      (Auth > Providers > Phone). Code is included below but commented out.
 *      To switch: enable Phone auth in Supabase, then swap `sendEmailOtp` for
 *      `sendPhoneOtp` and render the phone input.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/onboarding";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendEmailOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  /*
  // 💤 PHONE OTP (requires paid SMS provider in Supabase) — example:
  async function sendPhoneOtp(phone: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    // then verify with: supabase.auth.verifyOtp({ phone, token, type: "sms" })
  }
  */

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2 text-harvest-600">
        <Leaf className="h-7 w-7" />
        <span className="text-2xl font-bold">HarvestLink</span>
      </div>

      {sent ? (
        <div className="rounded-xl border border-harvest-200 bg-harvest-50 p-6">
          <h1 className="text-lg font-semibold">Check your email</h1>
          <p className="mt-1 text-sm text-zinc-600">
            We sent a magic sign-in link to <strong>{email}</strong>. Open it on
            this device to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={sendEmailOtp} className="space-y-4">
          <h1 className="text-2xl font-bold">Sign in to HarvestLink</h1>
          <p className="text-sm text-zinc-600">
            We&apos;ll email you a secure sign-in link. No password needed.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-harvest-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-harvest-500 px-4 py-3 font-semibold text-white hover:bg-harvest-600 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
    </main>
  );
}
