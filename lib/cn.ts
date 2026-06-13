/**
 * Tiny classname joiner — filters falsy values and joins with spaces.
 * Keeps component APIs clean without pulling in clsx/tailwind-merge.
 *
 *   cn("px-4", isActive && "bg-primary", disabled ? "opacity-50" : "")
 */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
