import { cookies } from "next/headers";
import type { Role } from "@/lib/types";

/**
 * ⚠️ TEMPORARY demo auth (NEXT_PUBLIC_DEMO_MODE=true). Lets the app be used
 * without login by acting as a real demo farmer or buyer (real DB rows, so
 * everything actually saves). The active role is held in the `hl_demo_role`
 * cookie and switchable in-app. Delete this file + the demo branches to restore
 * real auth.
 */

export const DEMO_ROLE_COOKIE = "hl_demo_role";

export function isDemo(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** Active demo role from the cookie (defaults to farmer). Server-only. */
export function demoRole(): Role {
  const v = cookies().get(DEMO_ROLE_COOKIE)?.value;
  return v === "buyer" ? "buyer" : "farmer";
}

/** The real auth.users id for the active (or given) demo role. */
export function demoUserId(role: Role = demoRole()): string {
  return (
    (role === "buyer"
      ? process.env.DEMO_BUYER_ID
      : process.env.DEMO_FARMER_ID) ?? ""
  );
}
