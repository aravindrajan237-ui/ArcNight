/**
 * Username + password auth (no email is ever sent). Supabase needs an email,
 * so we deterministically synthesize one from the username. Accounts are
 * created server-side via the admin API (email pre-confirmed), and sign-in uses
 * signInWithPassword — neither sends any email.
 */

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const SYNTH_DOMAIN = "harvestlink.app";

/** Map a username to its stable synthetic login email. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTH_DOMAIN}`;
}

/** True if the username is the right shape (3–20 letters/digits/underscore). */
export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username.trim());
}
