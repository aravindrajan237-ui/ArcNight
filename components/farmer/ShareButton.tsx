"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { IconButton } from "@/components/ui";

/** Shares (or copies) the public contract link /c/[id]. */
export function ShareButton({ listingId }: { listingId: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/c/${listingId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "HarvestLink contract", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled share — ignore */
    }
  }

  return (
    <IconButton aria-label="Share" onClick={share} variant="outline">
      {copied ? <Check className="h-5 w-5 text-success" /> : <Share2 className="h-5 w-5" />}
    </IconButton>
  );
}
