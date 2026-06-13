import { cn } from "@/lib/cn";

/**
 * Fair-deal score gauge (0–100). A semicircular SVG arc with the score, a
 * verdict, and the market difference. Higher = closer to the AI fair price.
 */
export function FairDealGauge({
  score,
  marketDiffPct,
  size = 200,
}: {
  score: number;
  marketDiffPct?: number; // signed % difference vs market
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r; // semicircle length
  const dash = (clamped / 100) * circ;

  const color =
    clamped >= 80 ? "#2E9E5B" : clamped >= 50 ? "#E0A92F" : "#D24A3D";
  const verdict =
    clamped >= 80 ? "Great deal" : clamped >= 50 ? "Fair deal" : "Below market fairness";
  const risk = clamped >= 80 ? "Low" : clamped >= 50 ? "Medium" : "High";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        {/* track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#EDF1EC"
          strokeWidth={size * 0.09}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.09}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          className="font-sans"
          style={{ fontSize: size * 0.2, fontWeight: 800, fill: "#1A1D1A" }}
        >
          {clamped}
        </text>
        <text
          x={cx}
          y={cy + size * 0.02}
          textAnchor="middle"
          style={{ fontSize: size * 0.06, fontWeight: 600, fill: "#5B635C" }}
        >
          / 100
        </text>
      </svg>

      <p className="mt-1 text-lg font-extrabold" style={{ color }}>
        {verdict}
      </p>
      <div className="mt-1 flex items-center gap-3 text-sm text-slate">
        {typeof marketDiffPct === "number" && (
          <span>
            Market difference{" "}
            <span
              className={cn(
                "font-bold",
                marketDiffPct > 0 ? "text-danger" : "text-success",
              )}
            >
              {marketDiffPct > 0 ? "+" : ""}
              {marketDiffPct}%
            </span>
          </span>
        )}
        <span>
          Risk: <span className="font-bold text-ink">{risk}</span>
        </span>
      </div>
    </div>
  );
}
