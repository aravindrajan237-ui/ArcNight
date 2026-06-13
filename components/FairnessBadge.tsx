import { BadgePercent, Scale } from "lucide-react";

/**
 * Visible fairness UI — the core differentiator.
 *  - Always shows "0% commission".
 *  - Optionally shows the fair_deal_score (0–100) for a listing/offer.
 */
export function FairnessBadge({ score }: { score?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-harvest-50 px-2.5 py-1 text-xs font-semibold text-harvest-600">
        <BadgePercent className="h-3.5 w-3.5" /> 0% commission
      </span>
      {typeof score === "number" && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${scoreColor(
            score,
          )}`}
          title="How close this price is to the AI market estimate"
        >
          <Scale className="h-3.5 w-3.5" /> Fair-deal {score}/100
        </span>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}
