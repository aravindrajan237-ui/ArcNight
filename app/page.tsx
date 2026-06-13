import Link from "next/link";
import { Leaf, ShieldCheck, BadgePercent, FileSignature } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-harvest-600">
          <Leaf className="h-6 w-6" />
          <span className="text-xl font-bold">HarvestLink</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-harvest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-harvest-600"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-start justify-center gap-6 py-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-harvest-50 px-3 py-1 text-sm font-semibold text-harvest-600">
          <BadgePercent className="h-4 w-4" /> 0% platform commission. Always.
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Fair harvest contracts,
          <br />
          <span className="text-harvest-500">direct farmer to buyer.</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          List your harvest, negotiate a fair price backed by an AI market
          estimate, sign a digital agreement, and lock it in with a 15% advance.
          No middlemen. No cut taken.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login?role=farmer"
            className="rounded-lg bg-harvest-500 px-5 py-3 font-semibold text-white hover:bg-harvest-600"
          >
            I&apos;m a Farmer
          </Link>
          <Link
            href="/login?role=buyer"
            className="rounded-lg border border-harvest-500 px-5 py-3 font-semibold text-harvest-600 hover:bg-harvest-50"
          >
            I&apos;m a Buyer
          </Link>
        </div>
      </section>

      <section className="grid gap-6 py-12 sm:grid-cols-3">
        <Feature
          icon={<BadgePercent className="h-5 w-5" />}
          title="0% commission"
          body="We never take a cut of your deal. The price you agree is the price that moves."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Fair-deal score"
          body="Every offer is scored against an AI market estimate so both sides see a fair price."
        />
        <Feature
          icon={<FileSignature className="h-5 w-5" />}
          title="Digital agreement"
          body="Each deal generates an e-signed PDF contract stored securely for both parties."
        />
      </section>
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
    <div className="rounded-xl border border-zinc-200 p-5">
      <div className="mb-3 inline-flex rounded-lg bg-harvest-50 p-2 text-harvest-600">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
