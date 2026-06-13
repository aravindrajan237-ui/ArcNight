import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, CheckCircle2, Clock, Quote } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Logo,
  Card,
  Avatar,
  StarRating,
  AwardBadge,
  EmptyState,
  Button,
  type AwardKey,
} from "@/components/ui";
import { ToastProvider } from "@/components/ui/Toast";
import { ReportButton } from "@/components/ReportButton";
import type { Profile, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TrustProfile({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!profile) notFound();
  const p = profile as Profile;

  const { data: reviewRows } = await admin
    .from("reviews")
    .select("*")
    .eq("reviewee_id", params.id)
    .order("created_at", { ascending: false });
  const reviews = (reviewRows ?? []) as Review[];

  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await admin.from("profiles").select("id, full_name, photo_url").in("id", reviewerIds)
    : { data: [] as Partial<Profile>[] };
  const reviewerOf = (id: string) => reviewers?.find((x) => x.id === id);

  const deals = p.completed_deals ?? 0;
  const trust = p.trust_score ?? 0;
  const onTime = p.on_time_rate ?? 0;
  const avg = reviews.length
    ? +(reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : trust / 20;

  const awards: AwardKey[] = [];
  if (deals >= 10) awards.push("best-seller");
  if (p.role === "farmer" && trust >= 80) awards.push("trusted-farmer");
  if (onTime >= 90 && deals > 0) awards.push("fast-delivery");
  if (p.role === "buyer" && deals >= 3) awards.push("frequent-buyer");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/leaderboard">
            <Button size="sm" variant="ghost">Leaderboard</Button>
          </Link>
          <ToastProvider>
            <ReportButton reportedUserId={p.id} variant="outline" />
          </ToastProvider>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-12 sm:px-6">
        {/* Identity */}
        <div className="flex flex-col items-center pt-2 text-center">
          <Avatar name={p.full_name} src={p.photo_url} size="xl" trustScore={deals > 0 ? avg : undefined} />
          <h1 className="mt-4 text-2xl font-extrabold text-ink">{p.full_name ?? "User"}</h1>
          <p className="text-sm font-medium capitalize text-slate">{p.role ?? "member"}</p>
          {deals > 0 && (
            <div className="mt-2">
              <StarRating value={avg} showValue size={20} />
            </div>
          )}
        </div>

        {/* Awards */}
        {awards.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {awards.map((a) => (
              <AwardBadge key={a} award={a} />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Deals" value={deals} />
          <Stat icon={<Star className="h-5 w-5" />} label="Trust" value={(trust / 20).toFixed(1)} />
          <Stat icon={<Clock className="h-5 w-5" />} label="On-time" value={`${Math.round(onTime)}%`} />
        </div>

        {/* Reviews */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">
            Reviews {reviews.length > 0 && <span className="text-slate">({reviews.length})</span>}
          </h2>
          {reviews.length === 0 ? (
            <EmptyState
              icon={<Quote className="h-7 w-7" />}
              title="No reviews yet"
              description="Reviews appear here after fulfilled deals."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => {
                const rv = reviewerOf(r.reviewer_id);
                return (
                  <Card key={r.id} inset>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={rv?.full_name} src={rv?.photo_url} size="sm" />
                        <span className="font-semibold text-ink">
                          {rv?.full_name ?? "Anonymous"}
                        </span>
                      </div>
                      <StarRating value={Number(r.rating)} size={15} />
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-slate">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center p-4 text-center">
      <span className="mb-1 text-primary">{icon}</span>
      <span className="text-xl font-extrabold text-ink">{value}</span>
      <span className="text-xs text-slate">{label}</span>
    </Card>
  );
}
