import * as React from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const fieldShell =
  "w-full rounded-2xl border bg-white px-4 text-ink placeholder:text-slate-muted transition-colors " +
  "focus:outline-none focus:border-primary-300 focus-visible:shadow-focus";

function Wrapper({
  label,
  hint,
  error,
  children,
}: FieldProps & { children: React.ReactNode }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm font-medium text-danger">
          {error}
        </span>
      ) : (
        hint && (
          <span className="mt-1.5 block text-sm text-slate">{hint}</span>
        )
      )}
    </label>
  );
}

/** Text input with label, hint/error, optional left icon + right slot. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps
>(({ label, hint, error, leftIcon, rightSlot, className, ...props }, ref) => (
  <Wrapper label={label} hint={hint} error={error}>
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          fieldShell,
          "h-14 text-base",
          leftIcon ? "pl-11" : null,
          rightSlot ? "pr-12" : null,
          error ? "border-danger/60" : "border-mist",
          className,
        )}
        {...props}
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightSlot}
        </span>
      )}
    </div>
  </Wrapper>
));
Input.displayName = "Input";

/** Multiline input matching Input's styling. */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ label, hint, error, className, ...props }, ref) => (
  <Wrapper label={label} hint={hint} error={error}>
    <textarea
      ref={ref}
      className={cn(
        fieldShell,
        "min-h-[96px] resize-y py-3 text-base leading-relaxed",
        error ? "border-danger/60" : "border-mist",
        className,
      )}
      {...props}
    />
  </Wrapper>
));
Textarea.displayName = "Textarea";

/**
 * Big +/- stepper for quantities (kg) — large tap targets for field use, and
 * the value is directly editable so any amount can be entered (no fixed steps).
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10_000_000,
  suffix = "kg",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-stretch gap-3">
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(clamp(value - step))}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-mist bg-white text-3xl font-bold text-primary transition active:scale-95 hover:bg-primary-50"
      >
        −
      </button>
      <div className="relative flex h-16 flex-1 items-center justify-center rounded-2xl bg-mist">
        <input
          type="number"
          inputMode="numeric"
          aria-label="quantity"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(Math.floor(Number(e.target.value) || 0)))}
          className="h-full w-full rounded-2xl bg-transparent pr-10 text-center text-2xl font-bold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute right-4 text-base font-semibold text-slate">
          {suffix}
        </span>
      </div>
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(clamp(value + step))}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-mist bg-white text-3xl font-bold text-primary transition active:scale-95 hover:bg-primary-50"
      >
        +
      </button>
    </div>
  );
}
