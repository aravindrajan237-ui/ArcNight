"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RoleSelect } from "@/components/RoleSelect";
import { LocationCapture, type LatLng } from "@/components/LocationCapture";
import { onboardingSchema } from "@/lib/validation";
import type { Role } from "@/lib/types";

/**
 * First-login onboarding. Forces a role choice (Farmer / Buyer) and captures
 * name + location, then writes them to the user's profile row. Middleware sends
 * users here until profiles.role is set.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Redirect away if not authenticated.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router, supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = onboardingSchema.safeParse({
      role,
      full_name: fullName,
      phone: phone || undefined,
      lat: loc?.lat,
      lng: loc?.lng,
    });
    if (!parsed.success) {
      setError("Please pick a role, enter your name, and set your location.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: parsed.data.role,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        location_label: parsed.data.location_label ?? null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(parsed.data.role === "farmer" ? "/farmer" : "/buyer");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold">Welcome to HarvestLink</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Tell us who you are. You can only choose once, so pick carefully.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold">I am a…</label>
          <RoleSelect value={role} onChange={setRole} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Lakshmi Devi"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Phone (optional)
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210 — used for WhatsApp receipts"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Location</label>
          <LocationCapture value={loc} onChange={setLoc} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-harvest-500 px-4 py-3 font-semibold text-white hover:bg-harvest-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
