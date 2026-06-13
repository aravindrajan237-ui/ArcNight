"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, PriceChip, Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { capitalize } from "@/lib/format";

export interface OfferRow {
  id: string;
  listingId: string;
  buyerName: string;
  crop: string;
  qty: number;
  price: number;
}

/** New-offers list that shows the first 4 and expands to reveal the rest. */
export function OffersList({ offers }: { offers: OfferRow[] }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? offers : offers.slice(0, 4);
  const more = offers.length - 4;

  return (
    <div className="space-y-3">
      {shown.map((o) => (
        <Link key={o.id} href={`/farmer/listings/${o.listingId}`}>
          <Card interactive inset className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{o.buyerName}</p>
              <p className="truncate text-sm text-slate">
                {t("farmer.wants", { qty: o.qty, crop: capitalize(o.crop) })}
              </p>
            </div>
            <PriceChip amount={o.price} />
          </Card>
        </Link>
      ))}

      {more > 0 && (
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setExpanded((e) => !e)}
          rightIcon={
            expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        >
          {expanded ? t("common.showLess") : `${t("common.viewMore")} (${more})`}
        </Button>
      )}
    </div>
  );
}
