import Anthropic from "@anthropic-ai/sdk";

import { BillSchema } from "@/lib/bill";
import { GasBillSchema } from "@/lib/gas";
import { LpgBillSchema } from "@/lib/lpg";

export const runtime = "nodejs";
export const maxDuration = 60;

// The brief explicitly chooses Haiku for bill OCR. Swap to "claude-sonnet-4-6"
// (or "claude-opus-4-7") here if parsing accuracy proves insufficient.
const MODEL = "claude-haiku-4-5";
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

const IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

const INSTRUCTIONS = `You are a precise parser for Australian residential electricity bills. Read the attached bill (PDF or photo) and extract the fields listed below.

Return ONLY a single JSON object — no prose, no explanation, no markdown, no code fences. If a field is not present on the bill, use null (the one exception is tariff_type, which must always be one of the allowed values; use "flat" if unclear). For the boolean *_present fields, use false (not null) when the feature is absent.

All monetary values must be in CENTS:
- total_amount_cents: total amount payable on THIS bill, in cents (e.g. $284.50 -> 28450).
- supply_charge_per_day_cents: daily supply charge in cents (e.g. $1.15/day -> 115, 110.4c/day -> 110.4). Keep decimals.
- usage_rate_cents_flat / _peak / _shoulder / _offpeak: usage rates in cents per kWh (e.g. 28.4c/kWh -> 28.4, $0.284/kWh -> 28.4). Keep decimals.

Core fields:
- kwh_used: total electricity used over the billing period, in kWh (a number).
- billing_period_start / billing_period_end: ISO dates formatted "YYYY-MM-DD".
- postcode: the 4-digit postcode of the supply address, as a string.
- distributor: the electricity network/distributor if shown. For NSW this is one of "Ausgrid", "Endeavour", or "Essential Energy". Otherwise null.
- account_number: the customer's account or reference number exactly as printed (may contain digits and letters). Null if not visible.
- customer_name / service_address: as printed, or null.

Structural-value features (these often make a plan worth KEEPING — detect them carefully):
- EV tariff: look for line items containing "EV", "Electric Vehicle", "vehicle charging", or any usage rate below 15c/kWh outside the standard overnight window. Set ev_tariff_present true and fill ev_tariff_kwh, ev_tariff_rate_cents, ev_tariff_window_description.
- Super off-peak / solar soak: a line item at $0.00 or below 5c/kWh, typically a midday window (e.g. 10am-3pm). Also called "solar soak", "super off peak", "free power", "demand response". Set super_off_peak_present and fill super_off_peak_kwh, super_off_peak_rate_cents, super_off_peak_window_description.
- Controlled load: a separate controlled-load/off-peak circuit (e.g. hot water). Set controlled_load_present and fill controlled_load_kwh, controlled_load_rate_cents.
- Solar export / feed-in: credits labelled "Solar FiT", "Feed-in tariff", "Solar export". Set solar_export_present and fill solar_export_kwh, solar_fit_cents_per_kwh.

Tariff classification:
- tariff_type: "flat" for a single usage rate; "time_of_use" for peak/shoulder/off-peak rates; "controlled_load" if a controlled-load circuit is the primary tariff; "complex_multi_tariff" if the bill has MORE THAN THREE distinct rate categories.

For a flat tariff, put the single rate in usage_rate_cents_flat and leave peak/shoulder/offpeak null. For time-of-use, fill peak/shoulder/offpeak (any not shown -> null) and leave flat null.

The JSON object must have exactly these keys:
{"retailer_name","plan_name","account_number","customer_name","service_address","billing_period_start","billing_period_end","total_amount_cents","kwh_used","supply_charge_per_day_cents","usage_rate_cents_flat","usage_rate_cents_peak","usage_rate_cents_shoulder","usage_rate_cents_offpeak","ev_tariff_present","ev_tariff_kwh","ev_tariff_rate_cents","ev_tariff_window_description","super_off_peak_present","super_off_peak_kwh","super_off_peak_rate_cents","super_off_peak_window_description","controlled_load_present","controlled_load_kwh","controlled_load_rate_cents","solar_export_present","solar_export_kwh","solar_fit_cents_per_kwh","postcode","distributor","tariff_type"}`;

const LPG_INSTRUCTIONS = `You are a precise parser for Australian bottled LPG gas bills and delivery receipts. These vary widely — printed invoices, handwritten dockets, or photos of either. Read the attached file and extract the fields listed below.

Return ONLY a single JSON object — no prose, no explanation, no markdown, no code fences. If a field is not present, use null. Be conservative: prefer null over a guess.

Monetary values must be in CENTS (e.g. $147.00 -> 14700):
- price_per_bottle_cents: the price of ONE refilled/exchanged bottle. If only a total and a bottle count are shown, divide the total by the count.
- total_amount_cents, rental_fee_cents, delivery_fee_cents: likewise in cents.

Other fields:
- supplier_name: e.g. "Origin LPG", "Elgas", "Supagas", or a local supplier's name.
- account_number: the customer/account reference exactly as printed, or null.
- customer_name, service_address: as printed, or null.
- postcode: the 4-digit supply-address postcode as a string, or null.
- bottle_size_kg: the cylinder size in kg as a number (commonly 45 or 9), or null.
- number_of_bottles: how many bottles were delivered or refilled, or null.
- delivery_date: "YYYY-MM-DD", or null.
- is_exchange: true for a swap-and-go cylinder exchange, false for a refill.

The JSON object must have exactly these keys:
{"supplier_name","account_number","customer_name","service_address","postcode","bottle_size_kg","number_of_bottles","price_per_bottle_cents","total_amount_cents","rental_fee_cents","delivery_fee_cents","delivery_date","is_exchange"}`;

const MAINS_GAS_INSTRUCTIONS = `You are a precise parser for Australian MAINS gas bills (reticulated/piped gas through a meter — NOT bottled LPG). Read the attached bill and extract the fields below.

Return ONLY a single JSON object — no prose, no markdown, no code fences. If a field is not present, use null.

Gas usage is measured in MJ (megajoules), not kWh — do not confuse the two.

All monetary values must be in CENTS:
- total_amount_cents: total payable on THIS bill (e.g. $210.40 -> 21040).
- gas_supply_charge_cents_per_day: daily supply/service charge in cents (e.g. 68.5c/day -> 68.5, $0.68/day -> 68). Keep decimals.
- block1_rate_cents_per_mj / block2_rate_cents_per_mj: usage rates in cents per MJ (e.g. 4.566c/MJ -> 4.566, $0.03133/MJ -> 3.133). Keep decimals.

Other fields:
- mj_used: total gas used over the billing period, in MJ (a number).
- block1_threshold_mj: if usage is tiered (e.g. "first 1,000 MJ at rate A, then rate B"), the MJ allowance of the FIRST block for this billing period. If the plan is a single flat rate, leave block1_threshold_mj and block2_rate_cents_per_mj null and put the rate in block1_rate_cents_per_mj.
- billing_period_start / billing_period_end: ISO "YYYY-MM-DD".
- postcode: 4-digit supply-address postcode as a string.
- gas_distributor: the gas network if shown (NSW: "Jemena Gas Networks", "Australian Gas Networks"). Else null.
- account_number, customer_name, service_address: as printed, or null.

If this is clearly a BOTTLED LPG receipt (cylinders delivered by a driver, "45kg"/"9kg" bottles, swap-and-go), set retailer_name to null and mj_used to null — it is not a mains gas bill.

The JSON object must have exactly these keys:
{"retailer_name","plan_name","account_number","customer_name","service_address","billing_period_start","billing_period_end","total_amount_cents","mj_used","gas_supply_charge_cents_per_day","block1_rate_cents_per_mj","block1_threshold_mj","block2_rate_cents_per_mj","postcode","gas_distributor"}`;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** Pull the model's text output and strip any stray code fences. */
function extractJsonText(message: Anthropic.Message): string {
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, error: "Could not read the upload." }, 400);
  }

  const fuelType = (form.get("fuel_type") as string) || "electricity";
  const isLpg = fuelType === "bottled_lpg";
  const isMainsGas = fuelType === "reticulated_gas";

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ ok: false, error: "No file was provided." }, 400);
  }
  if (file.size === 0) {
    return json({ ok: false, error: "That file looks empty." }, 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return json({ ok: false, error: "That file is too big (15MB max)." }, 413);
  }

  const isPdf = file.type === "application/pdf";
  const isImage = (IMAGE_MEDIA_TYPES as readonly string[]).includes(file.type);
  if (!isPdf && !isImage) {
    return json(
      { ok: false, error: "Upload a PDF or a photo (JPG, PNG, WebP)." },
      415,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: "Bill parsing isn't configured." }, 500);
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: file.type as ImageMediaType, data },
      };

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      // Static instructions cached for cross-request reuse. Note: Haiku's
      // cache floor is ~4096 tokens, so this short prompt won't actually cache
      // on Haiku — it would on Sonnet/Opus if we move parsing there.
      system: [
        {
          type: "text",
          text: isLpg ? LPG_INSTRUCTIONS : isMainsGas ? MAINS_GAS_INSTRUCTIONS : INSTRUCTIONS,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: isLpg
                ? "Parse this Australian bottled LPG gas bill or receipt."
                : isMainsGas
                  ? "Parse this Australian mains (piped) gas bill."
                  : "Parse this Australian electricity bill.",
            },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[parse-bill] Anthropic ${err.status}:`, err.message);
    } else {
      console.error("[parse-bill] unexpected error:", err);
    }
    // Signal the client to offer manual entry rather than dead-ending.
    return json(
      { ok: false, fallback: "manual", error: "We couldn't read that bill." },
      502,
    );
  }

  const raw = extractJsonText(message);
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    console.error("[parse-bill] model did not return JSON:", raw.slice(0, 200));
    return json(
      { ok: false, fallback: "manual", error: "We couldn't read that bill." },
      422,
    );
  }

  if (isLpg) {
    const lpgResult = LpgBillSchema.safeParse(candidate);
    if (!lpgResult.success) {
      console.error("[parse-bill] LPG schema validation failed:", lpgResult.error.issues);
      return json(
        { ok: false, fallback: "manual", error: "Some details didn't look right." },
        422,
      );
    }
    return json({ ok: true, lpgBill: lpgResult.data });
  }

  if (isMainsGas) {
    const gasResult = GasBillSchema.safeParse(candidate);
    if (!gasResult.success) {
      console.error("[parse-bill] gas schema validation failed:", gasResult.error.issues);
      return json(
        { ok: false, fallback: "manual", error: "Some details didn't look right." },
        422,
      );
    }
    return json({ ok: true, gasBill: gasResult.data });
  }

  const result = BillSchema.safeParse(candidate);
  if (!result.success) {
    console.error("[parse-bill] schema validation failed:", result.error.issues);
    return json(
      { ok: false, fallback: "manual", error: "Some details didn't look right." },
      422,
    );
  }

  return json({ ok: true, bill: result.data });
}
