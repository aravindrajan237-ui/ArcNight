"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/** Signs out via Supabase and returns to /login. */
export function SignOutButton() {
  const router = useRouter();
  const t = useT();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }
  return (
    <Button variant="outline" fullWidth onClick={signOut} leftIcon={<LogOut className="h-5 w-5" />}>
      {t("profile.signOut")}
    </Button>
  );
}
