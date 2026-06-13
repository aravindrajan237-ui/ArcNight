"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Lock, Eye, EyeOff, BadgePercent, ShieldCheck, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail, isValidUsername } from "@/lib/auth-username";
import { Logo } from "@/components/ui/AppBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { useT } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleEntry } from "@/components/demo/DemoControls";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * AUTH — username + password (no email is ever sent). Sign up creates the
 * account server-side via /api/auth/signup; both flows then sign in with
 * supabase.auth.signInWithPassword using a synthetic email.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

type Mode = "signin" | "signup";

function LoginInner() {
  const t = useT();
  const params = useSearchParams();
  const next = params.get("next") ?? "/onboarding";
  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const eyeToggle = (
    <button
      type="button"
      onClick={() => setShowPwd((s) => !s)}
      aria-label={showPwd ? "Hide password" : "Show password"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate transition hover:bg-mist hover:text-ink"
    >
      {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidUsername(username)) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordHint"));
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const email = usernameToEmail(username);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not create account");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(mode === "signin" ? t("auth.invalid") : error.message);
        setLoading(false);
        return;
      }
      window.location.href = next; // full nav so middleware + server pick up the session
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Demo bypass: show the role picker instead of the auth form.
  if (DEMO) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Demo access</h1>
          <p className="mt-1.5 max-w-sm text-slate">
            Login is disabled in demo mode. Pick a role to explore the app.
          </p>
        </div>
        <div className="w-full max-w-md">
          <RoleEntry />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-white md:flex">
        <div className="bg-map-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            {t("landing.title1")}
            <br />
            {t("landing.title2")}
          </h1>
          <ul className="space-y-3 text-primary-100">
            <Perk icon={<BadgePercent className="h-5 w-5" />} text="0% platform commission. Always." />
            <Perk icon={<ShieldCheck className="h-5 w-5" />} text="AI fair-deal score on every offer." />
            <Perk icon={<Sprout className="h-5 w-5" />} text="Digital, e-signed agreements." />
          </ul>
        </div>
        <p className="relative text-sm text-primary-200">
          Trusted by farmers and buyers across India.
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <Logo size="lg" />
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <SegmentedToggle
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            size="lg"
            options={[
              { value: "signin", label: t("auth.signIn") },
              { value: "signup", label: t("auth.signUp") },
            ]}
            className="mb-6"
          />

          <h2 className="text-2xl font-extrabold text-ink">
            {mode === "signin" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. lakshmi_devi"
              label={t("auth.username")}
              leftIcon={<User className="h-5 w-5" />}
              hint={mode === "signup" ? t("auth.usernameHint") : undefined}
            />
            <Input
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              label={t("auth.password")}
              leftIcon={<Lock className="h-5 w-5" />}
              rightSlot={eyeToggle}
            />
            {mode === "signup" && (
              <Input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                label={t("auth.confirmPassword")}
                leftIcon={<Lock className="h-5 w-5" />}
                rightSlot={eyeToggle}
              />
            )}

            {error && <p className="text-sm font-medium text-danger">{error}</p>}

            <Button type="submit" size="lg" fullWidth loading={loading}>
              {mode === "signin" ? t("auth.signInBtn") : t("auth.signUpBtn")}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="mt-5 w-full text-center text-sm font-semibold text-primary"
          >
            {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
          </button>
        </div>
      </section>
    </main>
  );
}

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </span>
      <span className="font-medium">{text}</span>
    </li>
  );
}
