"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Tractor, ShoppingBasket, FlaskConical, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const ROLE_COOKIE = "hl_demo_role";

function setRoleCookie(role: "farmer" | "buyer") {
  document.cookie = `${ROLE_COOKIE}=${role};path=/;max-age=31536000;samesite=lax`;
}

function readRole(): "farmer" | "buyer" {
  if (typeof document === "undefined") return "farmer";
  const m = document.cookie.match(/hl_demo_role=(\w+)/);
  return m && m[1] === "buyer" ? "buyer" : "farmer";
}

/** Landing / login entry buttons. In demo: set role cookie + go straight in. */
export function RoleEntry() {
  const router = useRouter();
  const t = useT();

  function enter(role: "farmer" | "buyer") {
    const dest = role === "farmer" ? "/farmer" : "/buyer";
    if (DEMO) {
      setRoleCookie(role);
      router.push(dest);
    } else {
      router.push(`/login?next=${encodeURIComponent(dest)}`);
    }
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
      <Button
        size="lg"
        fullWidth
        className="sm:w-auto"
        onClick={() => enter("farmer")}
        leftIcon={<Tractor className="h-5 w-5" />}
        rightIcon={<ArrowRight className="h-5 w-5" />}
      >
        {t("landing.imFarmer")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        fullWidth
        className="sm:w-auto"
        onClick={() => enter("buyer")}
        leftIcon={<ShoppingBasket className="h-5 w-5" />}
      >
        {t("landing.imBuyer")}
      </Button>
    </div>
  );
}

/** Thin banner shown inside the app in demo mode, with a role switcher. */
export function DemoBar() {
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  useEffect(() => setRole(readRole()), []);
  if (!DEMO) return null;

  const other = role === "farmer" ? "buyer" : "farmer";
  function switchTo(r: "farmer" | "buyer") {
    setRoleCookie(r);
    window.location.href = r === "farmer" ? "/farmer" : "/buyer";
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning px-4 py-1.5 text-center text-xs font-bold text-ink">
      <span className="inline-flex items-center gap-1.5">
        <FlaskConical className="h-3.5 w-3.5" /> Demo mode — acting as {role}
      </span>
      <button
        onClick={() => switchTo(other)}
        className="inline-flex items-center gap-1 rounded-pill bg-ink/10 px-2 py-0.5"
      >
        <ArrowLeftRight className="h-3 w-3" /> Switch to {other}
      </button>
      <a href="/" className="underline">
        Home
      </a>
    </div>
  );
}
