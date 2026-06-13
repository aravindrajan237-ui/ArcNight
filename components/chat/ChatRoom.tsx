"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Check, Loader2, Mic, Square, Trash2 } from "lucide-react";
import {
  ChatBubble,
  Button,
  PriceChip,
  useToast,
} from "@/components/ui";
import {
  subscribeToListingMessages,
  sendListingMessage,
} from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { VoiceMessage } from "./VoiceMessage";
import { ChatText } from "./ChatText";
import { useT } from "@/lib/i18n/client";
import type { Message } from "@/lib/types";

function fmtSecs(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface ChatRoomProps {
  listingId: string;
  meId: string;
  counterpartyId: string;
  counterpartyName: string;
  crop: string;
  region: string;
  role: "farmer" | "buyer";
  initialMessages: Message[];
  /** Latest pending offer in the thread (price ₹/kg + qty), if any. */
  latestOffer: { id: string; price: number; qty: number } | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatRoom({
  listingId,
  meId,
  counterpartyId,
  counterpartyName,
  crop,
  region,
  role,
  initialMessages,
  latestOffer,
}: ChatRoomProps) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [askingAi, setAskingAi] = useState(false);
  const [acting, setActing] = useState(false);
  // buyer counter composer
  const [counterPrice, setCounterPrice] = useState(latestOffer?.price ?? 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // voice recording
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; secs: number } | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef(0);

  function pickMime() {
    const types = ["audio/webm", "audio/mp4", "audio/ogg"];
    return (
      (typeof MediaRecorder !== "undefined" &&
        types.find((t) => MediaRecorder.isTypeSupported(t))) ||
      ""
    );
  }

  async function startRecording() {
    // getUserMedia only exists in a secure context (https or localhost). On an
    // insecure origin (network IP / tunnel over http) it's undefined, so the
    // browser never prompts — surface that clearly instead of a vague error.
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t("voice.failed"), t("voice.insecure"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const secs = Math.round((Date.now() - recStartRef.current) / 1000);
        setPreview({ blob, url: URL.createObjectURL(blob), secs });
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      recStartRef.current = Date.now();
      rec.start();
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") toast.error(t("voice.denied"));
      else if (name === "NotFoundError") toast.error(t("voice.noMic"));
      else toast.error(t("voice.failed"));
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  }

  function discardVoice() {
    if (recording) stopRecording();
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function sendVoice() {
    if (!preview) return;
    const { blob, secs } = preview;
    setUploadingVoice(true);
    try {
      const supabase = createClient();
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const path = `${meId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice-messages")
        .upload(path, blob, { contentType: blob.type, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from("voice-messages").getPublicUrl(path).data.publicUrl;

      const temp: Message = {
        id: `temp-${Date.now()}`,
        listing_id: listingId,
        deal_id: null,
        sender_id: meId,
        receiver_id: counterpartyId,
        body: "",
        is_ai: false,
        audio_url: url,
        audio_duration_sec: secs,
        created_at: new Date().toISOString(),
      };
      setMessages((p) => [...p, temp]);
      discardVoice();
      await sendListingMessage({
        listing_id: listingId,
        receiver_id: counterpartyId,
        audio_url: url,
        audio_duration_sec: secs,
      });
    } catch (e) {
      toast.error("Couldn't send voice", e instanceof Error ? e.message : undefined);
    } finally {
      setUploadingVoice(false);
    }
  }

  // Realtime subscription (human + AI messages on this listing).
  useEffect(() => {
    const unsub = subscribeToListingMessages(listingId, (m) => {
      setMessages((prev) => {
        // Already have this exact row → ignore (avoids realtime double-fire).
        if (prev.some((x) => x.id === m.id)) return prev;
        // Reconcile our own optimistic "temp-" message: drop the matching temp
        // (same sender + same text/audio) so the sender doesn't see it twice.
        const deduped = prev.filter(
          (x) =>
            !(
              x.id.startsWith("temp-") &&
              x.sender_id === m.sender_id &&
              x.body === m.body &&
              x.audio_url === m.audio_url
            ),
        );
        return [...deduped, m];
      });
    });
    return unsub;
  }, [listingId]);

  // Auto-scroll to newest.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    setSending(true);
    // optimistic
    const temp: Message = {
      id: `temp-${Date.now()}`,
      listing_id: listingId,
      deal_id: null,
      sender_id: meId,
      receiver_id: counterpartyId,
      body,
      is_ai: false,
      audio_url: null,
      audio_duration_sec: null,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, temp]);
    try {
      await sendListingMessage({
        listing_id: listingId,
        receiver_id: counterpartyId,
        body,
      });
    } catch (e) {
      setMessages((p) => p.filter((m) => m.id !== temp.id));
      toast.error("Message failed", e instanceof Error ? e.message : undefined);
    } finally {
      setSending(false);
    }
  }

  async function askAi() {
    setAskingAi(true);
    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          counterparty_id: counterpartyId,
          crop,
          region,
          current_offer: latestOffer?.price ?? 0,
          chat_history: messages.slice(-12).map((m) => ({
            role: m.is_ai ? "ai" : m.sender_id === meId ? role : other(role),
            text: m.body,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI unavailable");
      // The AI reply is inserted server-side and arrives via realtime.
      toast.success("AI mediator replied", `Fair price ₹${json.data.recommended_price}/kg`);
    } catch (e) {
      toast.error("AI failed", e instanceof Error ? e.message : undefined);
    } finally {
      setAskingAi(false);
    }
  }

  // Farmer: accept the latest pending offer (+ create & sign the deal).
  async function acceptOffer() {
    if (!latestOffer) return;
    setActing(true);
    try {
      const r1 = await fetch(`/api/offers/${latestOffer.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!r1.ok) throw new Error((await r1.json()).error ?? "Accept failed");
      const r2 = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: latestOffer.id, esign: true }),
      });
      if (!r2.ok) throw new Error((await r2.json()).error ?? "Deal failed");
      toast.success("Accepted & signed", "Waiting for the buyer's advance.");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't accept", e instanceof Error ? e.message : undefined);
    } finally {
      setActing(false);
    }
  }

  // Buyer: send a counter (new offer).
  async function sendCounter() {
    if (counterPrice <= 0) return;
    setActing(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          proposed_price: counterPrice,
          proposed_qty_kg: latestOffer?.qty ?? 1,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Offer failed");
      toast.success("Counter sent", `₹${counterPrice}/kg`);
      router.refresh();
    } catch (e) {
      toast.error("Couldn't send", e instanceof Error ? e.message : undefined);
    } finally {
      setActing(false);
    }
  }

  return (
    // Leave room for the app bar (64px) + the mobile bottom nav (64px) so the
    // composer never sits behind the nav. On desktop the nav is a sidebar.
    <div className="flex h-[calc(100dvh-128px)] flex-col md:h-[calc(100dvh-64px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate">{t("chat.start")}</p>
        )}
        {messages.map((m) => {
          if (m.is_ai) {
            return (
              <ChatBubble key={m.id} variant="ai" time={fmtTime(m.created_at)}>
                <ChatText text={m.body} />
              </ChatBubble>
            );
          }
          const mine = m.sender_id === meId;
          return (
            <ChatBubble
              key={m.id}
              variant={mine ? "me" : "them"}
              authorName={mine ? undefined : counterpartyName}
              time={fmtTime(m.created_at)}
            >
              {m.audio_url ? (
                <VoiceMessage url={m.audio_url} duration={m.audio_duration_sec} dark={mine} />
              ) : mine ? (
                m.body
              ) : (
                <ChatText text={m.body} />
              )}
            </ChatBubble>
          );
        })}
      </div>

      {/* Offer / action bar */}
      {latestOffer && (
        <div className="border-t border-mist bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate">
                {t("chat.currentOffer")}
              </span>
              <PriceChip amount={latestOffer.price} />
              <span className="text-sm text-slate">· {latestOffer.qty} kg</span>
            </div>
            {role === "farmer" ? (
              <Button
                size="sm"
                onClick={acceptOffer}
                loading={acting}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Accept
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  className="h-10 w-24 rounded-xl border border-mist px-3 text-sm font-semibold"
                />
                <Button size="sm" variant="accent" onClick={sendCounter} loading={acting}>
                  Counter
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-mist bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {recording ? (
            <>
              <span className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-danger-50 px-3 font-semibold text-danger">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                Recording… {fmtSecs(recSecs)}
              </span>
              <button
                onClick={discardVoice}
                aria-label="Cancel"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-slate"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger text-white active:scale-95"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            </>
          ) : preview ? (
            <>
              <div className="flex h-11 flex-1 items-center rounded-xl bg-mist px-3">
                <VoiceMessage url={preview.url} duration={preview.secs} />
              </div>
              <button
                onClick={discardVoice}
                aria-label="Discard"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-slate"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={sendVoice}
                disabled={uploadingVoice}
                aria-label="Send voice"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white active:scale-95 disabled:opacity-50"
              >
                {uploadingVoice ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={askAi}
                disabled={askingAi}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent-50 px-3 text-sm font-bold text-accent-700 transition hover:bg-accent-100 disabled:opacity-60"
              >
                {askingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="hidden sm:inline">{t("chat.askAi")}</span>
              </button>
              <button
                onClick={startRecording}
                aria-label="Record voice message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist text-primary transition hover:bg-primary-50 active:scale-95"
              >
                <Mic className="h-5 w-5" />
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("chat.message")}
                className="h-11 flex-1 rounded-xl border border-mist px-4 text-[15px] focus:border-primary-300 focus:outline-none"
              />
              <button
                onClick={send}
                disabled={sending || !text.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function other(role: "farmer" | "buyer") {
  return role === "farmer" ? "buyer" : "farmer";
}
