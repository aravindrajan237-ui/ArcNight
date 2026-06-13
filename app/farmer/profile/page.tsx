import Link from "next/link";
import { Star, Sprout, BadgeIndianRupee, Clock, ExternalLink } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Avatar, Card, Button } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocationEditor } from "@/components/LocationEditor";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
};

export default async function FarmerProfile() {
  const t = getT();
  const { user, profile } = await getMe();
  const deals = profile?.completed_deals ?? 0;
  const stars = (profile?.trust_score ?? 0) / 20;
  const onTime = profile?.on_time_rate ?? 0;

  return (
    <div>
      <AppBar title={t("profile.title")} />
      <main className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-8">
        <div className="flex flex-col items-center text-center">
          <Avatar name={profile?.full_name} src={profile?.photo_url} size="xl" />
          <h1 className="mt-4 text-2xl font-extrabold text-ink">
            {profile?.full_name ?? "Farmer"}
          </h1>
          <p className="text-slate">
            {deals > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 text-warning" fill="currentColor" />
                {stars.toFixed(1)} · {deals} deals
              </span>
            ) : (
              "New farmer"
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Sprout className="h-5 w-5" />} label="Deals" value={deals} />
          <Stat icon={<BadgeIndianRupee className="h-5 w-5" />} label="Trust" value={stars.toFixed(1)} />
          <Stat icon={<Clock className="h-5 w-5" />} label="On-time" value={`${Math.round(onTime)}%`} />
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

        <Link href={`/u/${user.id}`}>
          <Button variant="ghost" fullWidth rightIcon={<ExternalLink className="h-4 w-4" />}>
            View public trust profile
          </Button>
        </Link>

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
