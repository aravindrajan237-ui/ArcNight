"use client";

import { useState } from "react";
import { Flag, X, ShieldAlert } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ReportReason } from "@/lib/types";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "fraud_scam", label: "Fraud / Scam" },
  { value: "fake_listing", label: "Fake product listing" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "abusive", label: "Abusive behaviour" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

/**
 * "Report user" button + modal (#3). Drop it on profiles, chat, and
 * transaction pages. Pass whatever context is available.
 */
export function ReportButton({
  reportedUserId,
  listingId,
  dealId,
  variant = "ghost",
  label = "Report",
}: {
  reportedUserId?: string;
  listingId?: string;
  dealId?: string;
  variant?: "ghost" | "outline";
  label?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason) {
      toast.info("Please pick a reason");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          listing_id: listingId,
          deal_id: dealId,
          reason,
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not submit report");
      toast.success("Report submitted", "Thanks — our team will review it.");
      setOpen(false);
      setReason(null);
      setDescription("");
    } catch (e) {
      toast.error("Couldn't report", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        leftIcon={<Flag className="h-4 w-4" />}
      >
        {label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lifted animate-slide-up sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                <ShieldAlert className="h-5 w-5 text-danger" /> Report
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate hover:bg-mist">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-sm text-slate">Why are you reporting this?</p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left font-semibold transition",
                    reason === r.value
                      ? "border-danger bg-danger-50 text-danger"
                      : "border-mist text-ink hover:border-danger/40",
                  )}
                >
                  {r.label}
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      reason === r.value ? "border-danger bg-danger" : "border-mist",
                    )}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              className="mt-3 min-h-[80px] w-full rounded-2xl border border-mist p-3 text-[15px] outline-none focus:border-primary-300"
            />

            <Button
              variant="danger"
              fullWidth
              className="mt-4"
              loading={busy}
              onClick={submit}
            >
              Submit report
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
