"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";

/**
 * Hero preview player.
 *
 * Plays a real video file — the one the admin uploaded for the featured course
 * (`videoFiles`), or the academy's own preview film when none has been uploaded
 * yet. The poster stays visible until the first frame arrives, and the play/pause
 * control is always available for people whose browser blocks autoplay.
 */
export function AcademyHeroPreview({
  src,
  poster,
  children,
  className,
}: {
  src: string;
  poster: string;
  children: ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    /* Browsers only autoplay muted video; if that is blocked we simply keep the poster. */
    video.play().catch(() => setPlaying(false));
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;
      setMuted(false);
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  return (
    <div className={cn("group/preview relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-elevated", className)}>
      {failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover brightness-75" />
      ) : (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover brightness-[0.78]"
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          onError={() => setFailed(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c1018]/95 via-[#0c1018]/30 to-transparent" />

      {/* Play / pause */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? (fa ? "توقف پیش‌نمایش" : "Pause preview") : fa ? "پخش پیش‌نمایش" : "Play preview"}
        className="absolute inset-0 z-10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/25",
            playing && "opacity-0 group-hover/preview:opacity-100",
          )}
        >
          {playing ? <Pause className="h-6 w-6 fill-white text-white" /> : <Play className="ms-1 h-7 w-7 fill-white text-white" />}
        </span>
      </button>

      {/* Mute */}
      {!failed && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? (fa ? "پخش صدا" : "Unmute") : fa ? "بی‌صدا" : "Mute"}
          className="absolute end-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <div className="relative z-20 mt-auto p-7">{children}</div>
    </div>
  );
}
