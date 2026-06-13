import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Celebratory success screen — used after advance payment ("Advance received
 * ₹300 🎉"). Animated check medallion, headline, optional summary + actions.
 */
export function SuccessState({
  title,
  amount,
  subtitle,
  children,
  actions,
  className,
}: {
  title: string;
  amount?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center animate-slide-up",
        className,
      )}
    >
      <div className="relative mb-6">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
        <span className="relative flex h-24 w-24 animate-scale-in items-center justify-center rounded-full bg-success text-white shadow-lifted">
          <Check className="h-12 w-12" strokeWidth={3} />
        </span>
      </div>

      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {amount && (
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-accent">
          {amount} <span aria-hidden>🎉</span>
        </p>
      )}
      {subtitle && <p className="mt-2 max-w-sm text-slate">{subtitle}</p>}

      {children && <div className="mt-6 w-full max-w-sm">{children}</div>}
      {actions && (
        <div className="mt-7 flex w-full max-w-sm flex-col gap-3">{actions}</div>
      )}
    </div>
  );
}
