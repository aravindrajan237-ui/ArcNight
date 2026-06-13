import Link from "next/link";
import {
  BadgePercent,
  ShieldCheck,
  FileSignature,
  Mic,
  Sparkles,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { Logo, Button, Badge } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const t = getT();
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />
          <Link href="/leaderboard">
            <Button size="sm" variant="ghost">{t("common.leaderboard")}</Button>
          </Link>
          <Link href="/login">
            <Button size="sm">{t("common.signIn")}</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-map-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />
        <div className="mx-auto max-w-3xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pt-20">
          <div className="mb-5 inline-flex">
            <Badge tone="primary" icon={<BadgePercent className="h-4 w-4" />}>
              {t("landing.badge")}
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            {t("landing.title1")}
            <br />
            <span className="text-primary">{t("landing.title2")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate">
            {t("landing.subtitle")}
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login?mode=signup" className="w-full sm:w-auto">
              <Button size="lg" fullWidth rightIcon={<ArrowRight className="h-5 w-5" />}>
                {t("landing.signUp")}
              </Button>
            </Link>
            <Link href="/login?mode=signin" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" fullWidth>
                {t("landing.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <Feature
            icon={<Mic className="h-5 w-5" />}
            title="Voice-first listing"
            body="Farmers list a harvest by speaking — in English, हिन्दी or தமிழ். AI fills the form."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="AI fair-deal score"
            body="Every price is scored against a live market estimate, so both sides see what's fair."
          />
          <Feature
            icon={<FileSignature className="h-5 w-5" />}
            title="E-signed agreement"
            body="Each deal generates a digital, e-signed PDF contract both parties can download."
          />
          <Feature
            icon={<BadgePercent className="h-5 w-5" />}
            title="0% commission"
            body="We never take a cut. The price you agree is the price that moves."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Verified & trusted"
            body="AI-graded crop photos and a public trust score on every farmer and buyer."
          />
          <Feature
            icon={<Trophy className="h-5 w-5" />}
            title="Reputation that pays"
            body="Climb the leaderboard, earn award badges, and win more deals."
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-center text-white">
          <div className="bg-map-grid pointer-events-none absolute inset-0 opacity-10" />
          <h2 className="relative text-3xl font-extrabold tracking-tight">
            {t("landing.ctaTitle")}
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-primary-100">
            {t("landing.ctaSub")}
          </p>
          <Link href="/login?mode=signup" className="relative mt-6 inline-block">
            <Button size="lg" variant="accent" rightIcon={<ArrowRight className="h-5 w-5" />}>
              {t("common.getStarted")}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-mist py-8 text-center text-sm text-slate">
        <Logo size="sm" />
        <p className="mt-2">Fair, commission-free farm-to-buyer trade.</p>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-card border border-mist bg-white p-5 shadow-soft">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
        {icon}
      </div>
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate">{body}</p>
    </div>
  );
}
