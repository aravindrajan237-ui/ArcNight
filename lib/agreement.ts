import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAgreementPdf } from "@/lib/pdf";
import type { Database } from "@/lib/types";

/**
 * Shared agreement-PDF pipeline used by /api/deals (on creation) and
 * /api/payments/verify (fallback if the PDF is somehow missing).
 *
 * Builds the one-page agreement for a deal, uploads it to the public
 * `agreements` Storage bucket, writes the URL onto deals.agreement_pdf_url, and
 * returns the URL. Returns null on any failure so callers never crash.
 *
 * Pass a SERVICE-ROLE (admin) client — it both bypasses RLS and is allowed to
 * write to Storage.
 */

const BUCKET = "agreements";

type Admin = SupabaseClient<Database>;

/** Create the public bucket if it doesn't exist (no-op if it already does). */
export async function ensureAgreementsBucket(admin: Admin): Promise<void> {
  try {
    await admin.storage.createBucket(BUCKET, { public: true });
  } catch {
    // already-exists (or insufficient perms) — fine, upload will surface real errors
  }
}

export async function buildAndUploadAgreement(
  admin: Admin,
  dealId: string,
): Promise<string | null> {
  try {
    const { data: deal } = await admin
      .from("deals")
      .select(
        "id, listing_id, farmer_id, buyer_id, final_price, final_qty_kg, total_amount, advance_amount, created_at",
      )
      .eq("id", dealId)
      .single();
    if (!deal) return null;

    const { data: listing } = await admin
      .from("harvest_listings")
      .select("crop, expected_harvest_date")
      .eq("id", deal.listing_id)
      .single();

    const { data: parties } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", [deal.farmer_id, deal.buyer_id]);
    const nameOf = (id: string) =>
      parties?.find((p) => p.id === id)?.full_name ?? "Unknown";

    const total = Number(deal.total_amount);
    const advance = Number(deal.advance_amount);
    const balance = +(total - advance).toFixed(2);

    const pdfBytes = await generateAgreementPdf({
      dealId: deal.id,
      agreementDate: String(deal.created_at).slice(0, 10),
      farmerName: nameOf(deal.farmer_id),
      buyerName: nameOf(deal.buyer_id),
      crop: listing?.crop ?? "crop",
      quantityKg: Number(deal.final_qty_kg),
      pricePerKg: Number(deal.final_price),
      totalAmount: total,
      advanceAmount: advance,
      balanceAmount: balance,
      harvestDate: listing?.expected_harvest_date ?? "to be confirmed",
      esignTimestamp: new Date(deal.created_at).toISOString(),
    });

    await ensureAgreementsBucket(admin);

    const path = `${deal.id}/agreement.pdf`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      console.error("[agreement] upload failed:", upErr.message);
      return null;
    }

    const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    await admin
      .from("deals")
      .update({ agreement_pdf_url: url })
      .eq("id", deal.id);

    return url;
  } catch (err) {
    console.error("[agreement] generation failed (non-fatal):", err);
    return null;
  }
}
