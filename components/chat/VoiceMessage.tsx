"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/cn";

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Voice-message bubble player: play/pause, progress bar, duration. `dark` is
 * used inside the green "me" bubble so controls read on a dark background.
 */
export function VoiceMessage({
  url,
  duration,
  dark = false,
}: {
  url: string;
  duration: number | null;
  dark?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [current, setCurrent] = useState(0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  }

  const track = dark ? "bg-white/30" : "bg-mist";
  const fill = dark ? "bg-white" : "bg-primary";
  const btn = dark ? "bg-white/20 text-white" : "bg-primary text-white";
  const text = dark ? "text-white/80" : "text-slate";

  return (
    <div className="flex min-w-[190px] items-center gap-2.5">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", btn)}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="flex-1">
        <div className={cn("h-1.5 overflow-hidden rounded-pill", track)}>
          <div className={cn("h-full rounded-pill transition-[width]", fill)} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className={cn("w-9 text-right text-xs font-medium tabular-nums", text)}>
        {fmt(playing || current ? current : (duration ?? 0))}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrent(a.currentTime);
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
      />
    </div>
  );
}
