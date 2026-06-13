/** Capitalize the first letter. "tomato" → "Tomato". */
export function capitalize(s?: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Title-case each word. "nashik red" → "Nashik Red". */
export function titleCase(s?: string | null): string {
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
