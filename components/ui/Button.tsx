import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";
type Variant = "primary" | "accent" | "ghost" | "outline" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
  // min tap target ≥ 44–56px for field use
  sm: "h-10 px-4 text-sm gap-1.5 rounded-xl",
  md: "h-12 px-5 text-[15px] gap-2 rounded-xl",
  lg: "h-14 px-6 text-base gap-2.5 rounded-2xl",
  xl: "h-16 px-8 text-lg gap-3 rounded-2xl",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-soft hover:bg-primary-600 active:bg-primary-700",
  accent:
    "bg-accent text-white shadow-soft hover:bg-accent-600 active:bg-accent-700",
  ghost: "bg-transparent text-primary hover:bg-primary-50 active:bg-primary-100",
  outline:
    "bg-white text-ink border border-mist hover:border-primary-200 hover:bg-primary-50/40",
  danger: "bg-danger text-white shadow-soft hover:brightness-95",
};

/** Primary / accent / ghost / outline / danger button with loading + icons. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center font-semibold transition-all duration-150",
          "focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-55",
          "active:scale-[0.98]",
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-[1.1em] w-[1.1em] animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
Button.displayName = "Button";

/** Convenience wrappers matching the design brief's names. */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />,
);
PrimaryButton.displayName = "PrimaryButton";

export const GhostButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />,
);
GhostButton.displayName = "GhostButton";

/** Square icon-only button (used in app bars, steppers, composer). */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: "sm" | "md" | "lg";
  }
>(({ variant = "ghost", size = "md", className, children, ...props }, ref) => {
  const s = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[size];
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-all active:scale-95",
        "focus-visible:shadow-focus",
        variantClasses[variant],
        s,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
IconButton.displayName = "IconButton";
