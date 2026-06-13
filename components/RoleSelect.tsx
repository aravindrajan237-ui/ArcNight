"use client";

import { Tractor, ShoppingBasket } from "lucide-react";
import type { Role } from "@/lib/types";

/** Farmer / Buyer picker used during onboarding. */
export function RoleSelect({
  value,
  onChange,
}: {
  value: Role | null;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <RoleCard
        active={value === "farmer"}
        onClick={() => onChange("farmer")}
        icon={<Tractor className="h-7 w-7" />}
        title="Farmer"
        body="List harvests, receive offers, sign contracts."
      />
      <RoleCard
        active={value === "buyer"}
        onClick={() => onChange("buyer")}
        icon={<ShoppingBasket className="h-7 w-7" />}
        title="Buyer"
        body="Find harvests nearby, make fair offers, lock deals."
      />
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition ${
        active
          ? "border-harvest-500 bg-harvest-50 ring-2 ring-harvest-500"
          : "border-zinc-200 hover:border-harvest-300"
      }`}
    >
      <span className="text-harvest-600">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-zinc-600">{body}</span>
    </button>
  );
}
