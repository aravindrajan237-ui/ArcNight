import Link from "next/link";
import { Leaf } from "lucide-react";

/** Shell for the buyer area. Access is gated by middleware (role = buyer). */
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/buyer" className="flex items-center gap-2 text-harvest-600">
            <Leaf className="h-5 w-5" />
            <span className="font-bold">HarvestLink</span>
            <span className="rounded bg-harvest-50 px-1.5 py-0.5 text-xs font-semibold text-harvest-600">
              Buyer
            </span>
          </Link>
          <div className="flex gap-4 text-sm font-medium text-zinc-600">
            <Link href="/buyer" className="hover:text-harvest-600">
              Browse harvests
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
