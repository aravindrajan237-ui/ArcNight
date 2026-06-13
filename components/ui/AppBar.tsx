import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

/** HarvestLink wordmark lockup. */
export function Logo({
  size = "md",
  withText = true,
}: {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}) {
  const dim = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" }[size];
  const text = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-primary text-white",
          dim,
        )}
      >
        <Leaf className="h-[55%] w-[55%]" fill="currentColor" />
      </span>
      {withText && (
        <span className={cn("font-extrabold tracking-tight text-ink", text)}>
          Harvest<span className="text-primary">Link</span>
        </span>
      )}
    </span>
  );
}

/**
 * Top app bar. `title` + optional back link on the left, actions on the right.
 * When no title is given, shows the logo (home headers).
 */
export function AppBar({
  title,
  subtitle,
  back,
  leading,
  actions,
  sticky = true,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "z-30 border-b border-mist bg-surface/85 backdrop-blur-md",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {back && (
            <Link
              href={back}
              aria-label="Back"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-mist"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
          {leading}
          {title ? (
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink">{title}</h1>
              {subtitle && (
                <p className="truncate text-xs text-slate">{subtitle}</p>
              )}
            </div>
          ) : (
            <Logo />
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
