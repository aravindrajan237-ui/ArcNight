import Link from "next/link";
import { Receipt, BadgeIndianRupee, Repeat, ExternalLink, Star } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Avatar, Card, Button, AwardBadge } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocationEditor } from "@/components/LocationEditor";
import { getT } from "@/lib/i18n/server";
import type { Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

const LANG_LABEL: Record<string, string> = { en: "English", hi: "हिन्दी", ta: "தமிழ்" };

export default async function BuyerProfile() {
  const t = getT();
  const { supabase, user, profile } = await getMe();

  const { data: dealRows } = await supabase
    .from("deals")
    .select("total_amount, status")
    .eq("buyer_id", user.id);
  const deals = (dealRows ?? []) as Pick<Deal, "total_amount" | "status">[];
  const paid = deals.filter((d) => d.status !== "awaiting_advance" && d.status !== "cancelled");
  const spent = paid.reduce((s, d) => s + Number(d.total_amount), 0);
  const stars = (profile?.trust_score ?? 0) / 20;

  return (
    <div>
      <AppBar title={t("profile.title")} />
      <main className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-8">
        <div className="flex flex-col items-center text-center">
          <Avatar name={profile?.full_name} src={profile?.photo_url} size="xl" />
          <h1 className="mt-4 text-2xl font-extrabold text-ink">
            {profile?.full_name ?? "Buyer"}
          </h1>
          <p className="flex items-center gap-1 text-slate">
            {paid.length > 0 ? (
              <>
                <Star className="h-4 w-4 text-warning" fill="currentColor" />
                {stars.toFixed(1)} · {paid.length} orders
              </>
            ) : (
              "New buyer"
            )}
          </p>
          {paid.length >= 3 && (
            <div className="mt-3">
              <AwardBadge award="frequent-buyer" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Orders" value={paid.length} />
          <Stat
            icon={<BadgeIndianRupee className="h-5 w-5" />}
            label="Spent ₹"
            value={spent.toLocaleString("en-IN")}
          />
        </div>

        <Card inset className="space-y-3">
          <Row label={t("profile.language")} value={LANG_LABEL[profile?.language ?? "en"]} />
          <Row label={t("profile.phone")} value={profile?.phone ?? "—"} />
        </Card>

        <LocationEditor
          initialLat={profile?.lat ?? null}
          initialLng={profile?.lng ?? null}
          initialLabel={profile?.location_label ?? null}
        />

        <div className="flex items-center justify-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="space-y-3">
          <Link href="/buyer/orders">
            <Button variant="outline" fullWidth leftIcon={<Receipt className="h-5 w-5" />}>
              Order history
            </Button>
          </Link>
          <Link href="/buyer">
            <Button variant="ghost" fullWidth leftIcon={<Repeat className="h-5 w-5" />}>
              Reorder / browse again
            </Button>
          </Link>
          <Link href={`/u/${user.id}`}>
            <Button variant="ghost" fullWidth rightIcon={<ExternalLink className="h-4 w-4" />}>
              View public profile
            </Button>
          </Link>
        </div>

        <SignOutButton />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
