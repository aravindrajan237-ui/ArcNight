import { Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "me" | "them" | "ai";

/**
 * Chat bubble with three distinct styles:
 *  - me:   right-aligned, primary green (the current user)
 *  - them: left-aligned, white card (the counterparty)
 *  - ai:   centred, accent-tinted "AI Fair Mediator" card (is_ai messages)
 */
export function ChatBubble({
  variant,
  children,
  time,
  recommendedPrice,
  authorName,
}: {
  variant: Variant;
  children: React.ReactNode;
  time?: string;
  recommendedPrice?: number;
  authorName?: string;
}) {
  if (variant === "ai") {
    return (
      <div className="my-2 flex justify-center">
        <div className="w-full max-w-[85%] rounded-2xl border border-accent-100 bg-accent-50/70 p-3.5 shadow-soft">
          <div className="mb-1.5 flex items-center gap-1.5 text-accent-700">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide">
              AI Fair Mediator
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-ink">{children}</p>
          {typeof recommendedPrice === "number" && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-accent-700 shadow-soft">
              <Scale className="h-4 w-4" />
              Suggested fair price: ₹{recommendedPrice}/kg
            </div>
          )}
          {time && (
            <span className="mt-1.5 block text-right text-[11px] text-slate">
              {time}
            </span>
          )}
        </div>
      </div>
    );
  }

  const mine = variant === "me";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        {authorName && !mine && (
          <span className="mb-1 ml-1 block text-xs font-semibold text-slate">
            {authorName}
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-soft",
            mine
              ? "rounded-br-md bg-primary text-white"
              : "rounded-bl-md border border-mist bg-white text-ink",
          )}
        >
          {children}
        </div>
        {time && (
          <span
            className={cn(
              "mt-1 block text-[11px] text-slate",
              mine ? "text-right" : "ml-1",
            )}
          >
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
