"use client";

/**
 * WebinarBroadcast — Admin-side live broadcast room.
 *
 * Architecture (SFU-lite over HTTP polling):
 *   1. Admin clicks "شروع پخش" → getUserMedia → createOffer → POST offer
 *   2. Every 2 s: GET ?role=broadcaster → process viewer answers → addIceCandidate
 *   3. ICE candidates gathered locally → POST ice-broadcaster
 *   4. Chat / Q&A displayed + admin can mark Q&A as answered
 *   5. Admin clicks "پایان پخش" → POST end
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  MicOff,
  MonitorPlay,
  PhoneOff,
  Radio,
  Send,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { WebinarAttendeesPanel } from "@/components/admin/WebinarAttendeesPanel";

/* ─── types ─────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  viewerId: string;
  name: string;
  text: string;
  ts: number;
}

interface QAQuestion {
  id: string;
  viewerId: string;
  name: string;
  question: string;
  answered: boolean;
  ts: number;
}

type BroadcastStatus = "idle" | "starting" | "live" | "ended" | "error";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* ─── Component ─────────────────────────────────────────────────── */

export default function WebinarBroadcast({ slug }: { slug: string }) {
  const [status, setStatus] = useState<BroadcastStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [qa, setQa] = useState<QAQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "qa">("chat");
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Map viewerId → RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which viewer answers we've already processed
  const processedAnswersRef = useRef<Set<string>>(new Set());

  const signalUrl = `/api/webinar/${slug}/signal`;

  /* ── helpers ─────────────────────────────────────────────────── */

  async function postSignal(body: Record<string, unknown>) {
    const res = await fetch(signalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`signal ${res.status}`);
    return res.json();
  }

  const createPcForViewer = useCallback(
    (viewerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          pc.addTrack(track, streamRef.current);
        }
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          postSignal({
            type: "ice-broadcaster",
            viewerId,
            candidate: {
              candidate: ev.candidate.candidate,
              sdpMid: ev.candidate.sdpMid,
              sdpMLineIndex: ev.candidate.sdpMLineIndex,
            },
          }).catch(console.error);
        }
      };

      pcsRef.current.set(viewerId, pc);
      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── poll broadcaster endpoint ───────────────────────────────── */

  const pollBroadcaster = useCallback(async () => {
    try {
      const res = await fetch(`${signalUrl}?role=broadcaster`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as {
        viewers: { viewerId: string; answer: RTCSessionDescriptionInit | null; newIce: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }[] }[];
        status: string;
        chat: ChatMessage[];
        qa: QAQuestion[];
      };

      if (data.status === "ended") {
        setStatus("ended");
        return;
      }

      setViewerCount(data.viewers.length);
      setChat(data.chat ?? []);
      setQa(data.qa ?? []);

      for (const v of data.viewers) {
        let pc = pcsRef.current.get(v.viewerId);

        // New viewer joined — create PC + offer
        if (!pc) {
          pc = createPcForViewer(v.viewerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal({ type: "offer", sdp: pc.localDescription, viewerId: v.viewerId });
        }

        // Process their answer (once)
        if (v.answer && !processedAnswersRef.current.has(v.viewerId) && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(v.answer));
          processedAnswersRef.current.add(v.viewerId);
        }

        // Add new ICE from viewer
        for (const ice of v.newIce ?? []) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(ice));
          } catch { /* ignore stale candidates */ }
        }
      }
    } catch (e) {
      console.error("[broadcast poll]", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPcForViewer, slug]);

  /* ── start broadcast ─────────────────────────────────────────── */

  const startBroadcast = useCallback(async () => {
    setStatus("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Signal room as live
      await postSignal({ type: "start" });

      setStatus("live");

      // Start polling every 2 seconds
      pollTimerRef.current = setInterval(pollBroadcaster, 2000);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "خطا در دسترسی به دوربین/میکروفون");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollBroadcaster]);

  /* ── end broadcast ───────────────────────────────────────────── */

  const endBroadcast = useCallback(async () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    try {
      await postSignal({ type: "end" });
    } catch { /* best-effort */ }

    // Close all peer connections
    for (const pc of pcsRef.current.values()) pc.close();
    pcsRef.current.clear();

    // Stop media tracks
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("ended");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* ── audio / video toggle ────────────────────────────────────── */

  const toggleAudio = useCallback(() => {
    if (!streamRef.current) return;
    for (const t of streamRef.current.getAudioTracks()) {
      t.enabled = !t.enabled;
    }
    setAudioOn((v) => !v);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!streamRef.current) return;
    for (const t of streamRef.current.getVideoTracks()) {
      t.enabled = !t.enabled;
    }
    setVideoOn((v) => !v);
  }, []);

  /* ── cleanup on unmount ──────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      for (const pc of pcsRef.current.values()) pc.close();
      if (streamRef.current) for (const t of streamRef.current.getTracks()) t.stop();
    };
  }, []);

  /* ── answer Q&A ──────────────────────────────────────────────── */

  const markAnswered = async (id: string) => {
    // Optimistic update
    setQa((prev) => prev.map((q) => q.id === id ? { ...q, answered: true } : q));
    // Note: real "mark answered" would need a dedicated endpoint; skipped for simplicity
  };

  /* ─── render ─────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <MonitorPlay className="w-5 h-5 text-rose-400" />
          <span className="font-bold text-base">کنترل پخش زنده</span>
          {status === "live" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-red-600 text-white px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <button
            onClick={() => setAttendeesOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{viewerCount} بیننده</span>
            <span className="text-zinc-600">·</span>
            <span className="text-accent">مشاهده لیست</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Video preview ── */}
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 bg-black flex items-center justify-center">
            {status === "idle" || status === "starting" ? (
              <div className="text-center space-y-4">
                {status === "idle" ? (
                  <>
                    <Radio className="w-16 h-16 mx-auto text-zinc-600" />
                    <p className="text-zinc-400">برای شروع پخش کلیک کنید</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-zinc-400">در حال آماده‌سازی دوربین…</p>
                  </>
                )}
              </div>
            ) : status === "ended" ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
                <p className="text-zinc-300 font-semibold">پخش پایان یافت</p>
              </div>
            ) : status === "error" ? (
              <div className="text-center space-y-3 px-6">
                <AlertCircle className="w-14 h-14 mx-auto text-red-500" />
                <p className="text-red-400">{error}</p>
                <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setError(null); }}>
                  تلاش مجدد
                </Button>
              </div>
            ) : null}

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity",
                status === "live" ? "opacity-100" : "opacity-0"
              )}
            />

            {/* Camera/mic indicator overlay */}
            {status === "live" && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
                  audioOn ? "bg-zinc-800/80 text-zinc-200" : "bg-red-900/80 text-red-300")}>
                  {audioOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </span>
                <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
                  videoOn ? "bg-zinc-800/80 text-zinc-200" : "bg-red-900/80 text-red-300")}>
                  {videoOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                </span>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex items-center justify-center gap-4">
            {status === "idle" || status === "error" ? (
              <Button
                onClick={startBroadcast}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base font-semibold rounded-xl"
              >
                <Radio className="w-5 h-5 ml-2" />
                شروع پخش زنده
              </Button>
            ) : status === "starting" ? (
              <Button disabled className="px-8 py-3 text-base">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2 inline-block" />
                در حال اتصال…
              </Button>
            ) : status === "live" ? (
              <>
                <button
                  onClick={toggleAudio}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    audioOn ? "bg-zinc-700 hover:bg-zinc-600" : "bg-red-700 hover:bg-red-600"
                  )}
                  title="میکروفون"
                >
                  {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    videoOn ? "bg-zinc-700 hover:bg-zinc-600" : "bg-red-700 hover:bg-red-600"
                  )}
                  title="دوربین"
                >
                  {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={endBroadcast}
                  className="w-12 h-12 rounded-full bg-red-700 hover:bg-red-600 flex items-center justify-center"
                  title="پایان پخش"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* ── Side panel (chat + Q&A) ── */}
        {status === "live" && (
          <div className="w-80 flex flex-col bg-zinc-900 border-r border-zinc-800">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {(["chat", "qa"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-3 text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "text-white border-b-2 border-rose-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab === "chat" ? "چت" : `سؤالات (${qa.filter(q => !q.answered).length})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {activeTab === "chat" ? (
                chat.length === 0 ? (
                  <p className="text-zinc-500 text-center mt-8">هنوز پیامی نیست</p>
                ) : (
                  chat.map((m) => (
                    <div key={m.id} className="space-y-0.5">
                      <span className="text-rose-400 font-medium text-xs">{m.name}</span>
                      <p className="text-zinc-200 bg-zinc-800 rounded-lg px-3 py-1.5">{m.text}</p>
                    </div>
                  ))
                )
              ) : (
                qa.length === 0 ? (
                  <p className="text-zinc-500 text-center mt-8">سؤالی ارسال نشده</p>
                ) : (
                  qa.map((q) => (
                    <div key={q.id} className={cn("rounded-lg p-3 space-y-2", q.answered ? "bg-zinc-800/40 opacity-60" : "bg-zinc-800")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs text-rose-400 font-medium">{q.name}</span>
                          <p className="text-zinc-200 mt-0.5">{q.question}</p>
                        </div>
                        {!q.answered && (
                          <button
                            onClick={() => markAnswered(q.id)}
                            className="shrink-0 text-emerald-400 hover:text-emerald-300"
                            title="علامت‌گذاری به عنوان پاسخ داده شده"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {q.answered && (
                        <span className="text-xs text-emerald-500 font-medium">✓ پاسخ داده شد</span>
                      )}
                    </div>
                  ))
                )
              )}
            </div>

            {/* Read-only footer note */}
            <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-600 text-center">
              چت و سؤالات از بینندگان دریافت می‌شود
            </div>
          </div>
        )}
      </div>
      {/* Attendees panel modal */}
      {attendeesOpen && (
        <WebinarAttendeesPanel
          slug={slug}
          modal
          onClose={() => setAttendeesOpen(false)}
        />
      )}
    </div>
  );
}
