import Link from "next/link";
import { Trophy } from "lucide-react";
import { getMe, firstName } from "@/lib/session";
import { Avatar, Badge } from "@/components/ui";
import { BuyerExplore } from "@/components/buyer/BuyerExplore";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function greetKey() {
  const h = new Date().getHours();
  return h < 12 ? "greet.morning" : h < 17 ? "greet.afternoon" : "greet.evening";
}

export default async function BuyerDashboard() {
  const t = getT();
  const { profile } = await getMe();

  return (
    <div>
      {/* Greeting header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <div>
          <p className="text-sm font-medium text-slate">{t(greetKey())},</p>
          <h1 className="text-2xl font-extrabold text-ink">
            {firstName(profile)} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leaderboard">
            <Badge tone="warning" icon={<Trophy className="h-3.5 w-3.5" />}>
              {t("common.leaderboard")}
            </Badge>
          </Link>
          <Link href="/buyer/profile">
            <Avatar name={profile?.full_name} src={profile?.photo_url} size="md" />
          </Link>
        </div>
      </header>

      <p className="mx-auto mt-1 max-w-5xl px-4 text-slate sm:px-6">
        {t("buyer.browseSub")}{" "}
        <span className="font-semibold text-primary">0% commission.</span>
      </p>

      <div className="mt-4">
        <BuyerExplore meLat={profile?.lat ?? null} meLng={profile?.lng ?? null} />
      </div>
    </div>
  );
}
