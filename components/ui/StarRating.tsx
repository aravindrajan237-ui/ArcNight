"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Star rating. Read-only by default; pass `onChange` to make it interactive
 * (used in the review composer). Supports half-star display when read-only.
 */
export function StarRating({
  value,
  onChange,
  size = 18,
  showValue = false,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = typeof onChange === "function";
  const shown = hover ?? value;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const fillPct = Math.max(0, Math.min(1, shown - (i - 1))) * 100;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onChange?.(i)}
              onMouseEnter={() => interactive && setHover(i)}
              onMouseLeave={() => interactive && setHover(null)}
              className={cn(
                "relative",
                interactive && "cursor-pointer transition-transform hover:scale-110",
              )}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
            >
              {/* empty base */}
              <Star
                style={{ width: size, height: size }}
                className="text-mist"
                fill="currentColor"
              />
              {/* filled overlay (clipped for half stars) */}
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                <Star
                  style={{ width: size, height: size }}
                  className="text-warning"
                  fill="currentColor"
                />
              </span>
            </button>
          );
        })}
      </span>
      {showValue && (
        <span className="ml-1 text-sm font-bold text-ink tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
