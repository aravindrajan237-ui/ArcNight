"use client";

import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Segmented control with a sliding active pill. Used for "Negotiable: Yes/No"
 * and other binary/short choices. Large tap targets, fully keyboard-operable.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "md" | "lg";
  className?: string;
}) {
  const pad = size === "lg" ? "h-14 text-base" : "h-12 text-[15px]";
  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-grid w-full gap-1 rounded-2xl bg-mist p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "z-10 flex items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-all duration-200",
              pad,
              active
                ? "bg-white text-primary shadow-soft"
                : "text-slate hover:text-ink",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
