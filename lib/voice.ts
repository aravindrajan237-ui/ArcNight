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
 * Send a transcript to the server parser (Gemini). Resolves to a ParsedListing;
 * on any failure resolves to all-null so the form simply isn't pre-filled.
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

  try {
    const res = await fetch("/api/voice-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, lang }),
    });
    if (!res.ok) return empty;
    const json = await res.json();
    return (json?.data as ParsedListing) ?? empty;
  } catch {
    return empty;
  }
}
