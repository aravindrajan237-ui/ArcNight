"use client";

/**
 * Voice-first listing (D) — client side.
 *
 * Thin wrapper over the browser Web Speech API (SpeechRecognition) supporting
 * en-IN / hi-IN / ta-IN. Captures a transcript, then `parseListingSpeech` POSTs
 * it to /api/voice-parse where Gemini extracts { crop, quantity_kg,
 * harvest_in_days } to pre-fill the create-listing form.
 *
 * Everything degrades gracefully: unsupported browsers, denied mic permission,
 * and parse failures all resolve to a clear result instead of throwing.
 */

export type VoiceLang = "en-IN" | "hi-IN" | "ta-IN";

export const VOICE_LANGS: { code: VoiceLang; label: string }[] = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ta-IN", label: "தமிழ்" },
];

export interface ParsedListing {
  crop: string | null;
  quantity_kg: number | null;
  harvest_in_days: number | null;
}

// The Web Speech API isn't in the TS DOM lib in a stable form; declare the
// minimal surface we use.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** True if this browser supports SpeechRecognition. */
export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/**
 * Record one utterance and resolve with the transcript. Rejects only with a
 * friendly Error the caller can surface; never throws synchronously.
 */
export function listenOnce(lang: VoiceLang): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Voice input isn't supported in this browser. Please type instead."));
      return;
    }

    const recog = new Ctor();
    recog.lang = lang;
    recog.continuous = false;
    recog.interimResults = false;

    let settled = false;

    recog.onresult = (e: any) => {
      settled = true;
      const transcript = e?.results?.[0]?.[0]?.transcript ?? "";
      resolve(String(transcript).trim());
    };
    recog.onerror = (e: any) => {
      if (settled) return;
      settled = true;
      const code = e?.error ?? "unknown";
      reject(
        new Error(
          code === "not-allowed" || code === "service-not-allowed"
            ? "Microphone permission was denied."
            : "Couldn't capture audio. Please try again.",
        ),
      );
    };
    recog.onend = () => {
      if (!settled) {
        settled = true;
        resolve(""); // ended with no speech detected
      }
    };

    try {
      recog.start();
    } catch {
      reject(new Error("Couldn't start voice input. Please try again."));
    }
  });
}

/**
 * Send a transcript to the server parser (Gemini), then fill any gaps with a
 * local keyword parser. The local fallback means the crop + quantity are still
 * recognised even when Gemini is unavailable (e.g. no API key in this env).
 */
export async function parseListingSpeech(
  transcript: string,
  lang: VoiceLang,
): Promise<ParsedListing> {
  const empty: ParsedListing = {
    crop: null,
    quantity_kg: null,
    harvest_in_days: null,
  };
  if (!transcript.trim()) return empty;

  const local = localParseListing(transcript);

  let server: ParsedListing = empty;
  try {
    const res = await fetch("/api/voice-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, lang }),
    });
    if (res.ok) server = ((await res.json())?.data as ParsedListing) ?? empty;
  } catch {
    /* fall back to local parse only */
  }

  // Prefer the server (Gemini) result, fall back to the local parse field-by-field.
  return {
    crop: server.crop ?? local.crop,
    quantity_kg: server.quantity_kg ?? local.quantity_kg,
    harvest_in_days: server.harvest_in_days ?? local.harvest_in_days,
  };
}

/** Crop keyword table (English + Hindi + Tamil + common romanisations). */
const CROP_WORDS: { key: string; words: string[] }[] = [
  { key: "tomato", words: ["tomato", "tamatar", "tamaatar", "टमाटर", "தக்காளி", "thakkali", "takkali"] },
  { key: "onion", words: ["onion", "pyaaz", "pyaz", "kanda", "प्याज", "வெங்காயம்", "vengayam"] },
  { key: "potato", words: ["potato", "aloo", "alu", "आलू", "உருளைக்கிழங்கு", "urulaikizhangu", "urulai"] },
  { key: "chilli", words: ["chilli", "chili", "chillies", "mirch", "mirchi", "मिर्च", "மிளகாய்", "milagai"] },
  { key: "banana", words: ["banana", "kela", "केला", "வாழைப்பழம்", "vazhaipazham", "vazhai"] },
  { key: "mango", words: ["mango", "aam", "आम", "மாம்பழம்", "mambazham"] },
  { key: "rice", words: ["rice", "paddy", "chawal", "चावल", "அரிசி", "arisi", "nellu"] },
  { key: "wheat", words: ["wheat", "gehu", "gehun", "गेहूं", "கோதுமை", "gothumai"] },
  { key: "corn", words: ["corn", "maize", "makka", "मक्का", "சோளம்", "cholam"] },
  { key: "carrot", words: ["carrot", "gajar", "गाजर", "கேரட்"] },
  { key: "grape", words: ["grape", "grapes", "angoor", "अंगूर", "திராட்சை"] },
  { key: "apple", words: ["apple", "seb", "सेब", "ஆப்பிள்"] },
];

/**
 * Best-effort offline parse of a spoken listing sentence. Matches a crop by
 * keyword and a quantity by digits + unit (kg / quintal / ton). Returns nulls
 * for anything it can't find.
 */
export function localParseListing(transcript: string): ParsedListing {
  const text = transcript.toLowerCase();

  let crop: string | null = null;
  for (const { key, words } of CROP_WORDS) {
    if (words.some((w) => text.includes(w.toLowerCase()))) {
      crop = key;
      break;
    }
  }

  let quantity_kg: number | null = null;
  const m = text.match(
    /(\d+(?:\.\d+)?)\s*(quintal|क्विंटल|tonnes?|tons?|टन|kgs?|kilograms?|kilos?|kilo|किलो|கிலோ)?/i,
  );
  if (m) {
    let q = parseFloat(m[1]);
    const unit = (m[2] ?? "").toLowerCase();
    if (unit.includes("quintal") || unit.includes("क्विंटल")) q *= 100;
    else if (unit.includes("ton") || unit.includes("टन")) q *= 1000;
    if (Number.isFinite(q) && q > 0) quantity_kg = Math.round(q * 100) / 100;
  }

  return { crop, quantity_kg, harvest_in_days: null };
}
