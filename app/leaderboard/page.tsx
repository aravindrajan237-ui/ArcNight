"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Tractor, ShoppingBasket, Wheat } from "lucide-react";
import {
  Logo,
  Card,
  Avatar,
  Badge,
  SegmentedToggle,
  TextSkeleton,
  EmptyState,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

interface Person {
  id: string;
  name: string;
  photo_url: string | null;
  trust_score: number;
  deals: number;
  total_value: number;
}
interface Crop {
  crop: string;
  quantity_kg: number;
  deals: number;
}
type Tab = "farmers" | "buyers" | "crops";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("farmers");
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<Person[]>([]);
  const [buyers, setBuyers] = useState<Person[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setFarmers(j.data.top_farmers ?? []);
          setBuyers(j.data.top_buyers ?? []);
          setCrops(j.data.top_crops ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const people = tab === "farmers" ? farmers : buyers;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-50 text-3xl">
            <Trophy className="h-8 w-8 text-warning" />
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-ink">{t("lb.title")}</h1>
          <p className="text-slate">{t("lb.sub")}</p>
        </div>

        <SegmentedToggle
          value={tab}
          onChange={setTab}
          size="lg"
          options={[
            { value: "farmers", label: t("lb.farmers"), icon: <Tractor className="h-4 w-4" /> },
            { value: "buyers", label: t("lb.buyers"), icon: <ShoppingBasket className="h-4 w-4" /> },
            { value: "crops", label: t("lb.crops"), icon: <Wheat className="h-4 w-4" /> },
          ]}
        />

        <div className="mt-5">
          {loading ? (
            <Card inset>
              <TextSkeleton lines={6} />
            </Card>
          ) : tab === "crops" ? (
            crops.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2.5">
                {crops.map((c, i) => (
                  <Card key={c.crop} inset className="flex items-center gap-4">
                    <Rank i={i} />
                    <div className="flex-1">
                      <p className="font-bold capitalize text-ink">{c.crop}</p>
                      <p className="text-sm text-slate">{c.deals} {t("lb.deals")}</p>
                    </div>
                    <Badge tone="primary">{c.quantity_kg.toLocaleString("en-IN")} kg</Badge>
                  </Card>
                ))}
              </div>
            )
          ) : people.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2.5">
              {people.map((p, i) => (
                <Link key={p.id} href={`/u/${p.id}`}>
                  <Card interactive inset className="flex items-center gap-4">
                    <Rank i={i} />
                    <Avatar
                      name={p.name}
                      src={p.photo_url}
                      size="md"
                      trustScore={p.deals > 0 ? p.trust_score / 20 : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{p.name}</p>
                      <p className="text-sm text-slate">{p.deals} {t("lb.deals")}</p>
                    </div>
                    <span className="text-right text-sm font-extrabold text-primary">
                      ₹{p.total_value.toLocaleString("en-IN")}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Rank({ i }: { i: number }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold",
        i < 3 ? "bg-warning-50" : "bg-mist text-slate",
      )}
    >
      {i < 3 ? MEDAL[i] : i + 1}
    </span>
  );
}

function Empty() {
  return (
    <EmptyState
      icon={<Trophy className="h-7 w-7" />}
      title="No rankings yet"
      description="Complete some deals to climb the board."
    />
  );
}
