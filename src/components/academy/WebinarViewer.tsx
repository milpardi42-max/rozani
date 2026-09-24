"use client";

/**
 * WebinarViewer — Public-facing live-watch room.
 *
 * Flow:
 *   0. Show WebinarJoinGate — user enters name + email (or it's pre-filled from session)
 *   1. On join → POST register → transition to watching room
 *   2. Poll GET ?role=viewer&viewerId=xxx every 2 s
 *   3. When offer arrives → createAnswer → POST answer
 *   4. Exchange ICE candidates
 *   5. Remote stream appears in <video>
 *   6. Chat + Q&A via POST chat / POST qa
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Radio,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { WebinarJoinGate, type JoinIdentity } from "./WebinarJoinGate";

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

type ViewerStatus = "waiting" | "connecting" | "watching" | "ended" | "error";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* ─── Component ─────────────────────────────────────────────────── */

export default function WebinarViewer({
  slug,
  title,
  image = "",
  hostName,
  startsAt,
  durationMin,
  capacity,
  registeredCount,
  eventStatus = "live",
  chatEnabled = true,
  qaEnabled = true,
  prefillName = "",
  prefillEmail = "",
  externalUrl,
  locale = "fa",
}: {
  slug: string;
  title?: string;
  image?: string;
  hostName?: string;
  startsAt?: string;
  durationMin?: number;
  capacity?: number;
  registeredCount?: number;
  eventStatus?: "scheduled" | "live" | "ended" | "cancelled";
  chatEnabled?: boolean;
  qaEnabled?: boolean;
  prefillName?: string;
  prefillEmail?: string;
  externalUrl?: string;
  locale?: "fa" | "en";
}) {
  const isFA = locale === "fa";

  /* ── Phase: "gate" → user hasn't joined yet; "room" → watching ── */
  const [phase, setPhase] = useState<"gate" | "room">("gate");
  const [identity, setIdentity] = useState<JoinIdentity | null>(null);

  const [status, setStatus] = useState<ViewerStatus>("waiting");
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [qa, setQa] = useState<QAQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "qa">("chat");
  const [chatInput, setChatInput] = useState("");
  const [qaInput, setQaInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef = useRef(false);
  const iceAppliedCountRef = useRef(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const signalUrl = `/api/webinar/${slug}/signal`;

  /* ── handle join from gate ───────────────────────────────────── */

  const handleJoin = (id: JoinIdentity) => {
    if (externalUrl) {
      window.location.assign(externalUrl);
      return;
    }
    setIdentity(id);
    setPhase("room");
  };

  /* ── signal helpers ──────────────────────────────────────────── */

  const postSignal = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(signalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, viewerId: identity?.viewerId }),
    });
    if (!res.ok) throw new Error(`signal ${res.status}`);
    return res.json() as Promise<unknown>;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalUrl, identity?.viewerId]);

  /* ── initial join signal once in room ───────────────────────── */

  useEffect(() => {
    if (phase !== "room" || !identity) return;
    void postSignal({ type: "join", name: identity.name }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, identity?.viewerId]);

  /* ── poll viewer endpoint ────────────────────────────────────── */

  const pollViewer = useCallback(async () => {
    if (!identity) return;
    try {
      const res = await fetch(`${signalUrl}?role=viewer&viewerId=${identity.viewerId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json() as {
        status: string;
        offer: RTCSessionDescriptionInit | null;
        broadcasterIce: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }[];
        chat: ChatMessage[];
        qa: QAQuestion[];
      };

      if (data.status === "ended") {
        setStatus("ended");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        return;
      }

      setChat(data.chat ?? []);
      setQa(data.qa ?? []);

      // Process offer (once)
      if (data.offer && !hasAnsweredRef.current) {
        hasAnsweredRef.current = true;
        setStatus("connecting");

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            postSignal({
              type: "ice-viewer",
              candidate: {
                candidate: ev.candidate.candidate,
                sdpMid: ev.candidate.sdpMid,
                sdpMLineIndex: ev.candidate.sdpMLineIndex,
              },
            }).catch(console.error);
          }
        };

        pc.ontrack = (ev) => {
          if (videoRef.current && ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
            setStatus("watching");
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setStatus("error");
            setError(isFA ? "اتصال قطع شد. لطفاً صفحه را بارگذاری مجدد کنید." : "Connection lost. Please reload.");
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postSignal({ type: "answer", sdp: pc.localDescription });
      }

      // Apply new broadcaster ICE candidates
      const allIce = data.broadcasterIce ?? [];
      const newIce = allIce.slice(iceAppliedCountRef.current);
      if (newIce.length > 0 && pcRef.current) {
        for (const ice of newIce) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(ice));
          } catch { /* ignore stale */ }
        }
        iceAppliedCountRef.current += newIce.length;
      }
    } catch (e) {
      console.error("[viewer poll]", e);
    }
  }, [signalUrl, identity, postSignal, isFA]);

  /* ── lifecycle (start polling when in room) ──────────────────── */

  useEffect(() => {
    if (phase !== "room") return;
    pollTimerRef.current = setInterval(pollViewer, 2000);
    pollViewer();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (pcRef.current) pcRef.current.close();
    };
  }, [phase, pollViewer]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  /* ── send chat ───────────────────────────────────────────────── */

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try {
      await postSignal({ type: "chat", name: identity?.name ?? "بیننده", text });
    } catch { /* best-effort */ }
  };

  /* ── send Q&A ────────────────────────────────────────────────── */

  const sendQA = async () => {
    const question = qaInput.trim();
    if (!question) return;
    setQaInput("");
    try {
      await postSignal({ type: "qa", name: identity?.name ?? "بیننده", question });
    } catch { /* best-effort */ }
  };

  const viewerId = identity?.viewerId ?? "";

  /* ─── GATE phase ─────────────────────────────────────────────── */

  if (phase === "gate") {
    return (
      <WebinarJoinGate
        slug={slug}
        title={title ?? "وبینار زنده"}
        image={image}
        hostName={hostName}
        startsAt={startsAt}
        durationMin={durationMin}
        capacity={capacity}
        registeredCount={registeredCount}
        status={eventStatus}
        prefillName={prefillName}
        prefillEmail={prefillEmail}
        onJoin={handleJoin}
        locale={locale}
      />
    );
  }

  /* ─── ROOM phase ─────────────────────────────────────────────── */

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden" dir={isFA ? "rtl" : "ltr"}>
      {/* ── Main video area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Radio className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-sm truncate">{title ?? (isFA ? "وبینار زنده" : "Live Webinar")}</span>
            {status === "watching" && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Viewer name chip */}
            {identity && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {identity.name}
              </span>
            )}
            <button
              onClick={() => setMuted((v) => !v)}
              className="text-zinc-400 hover:text-white transition-colors"
              title={muted ? (isFA ? "صدا را باز کن" : "Unmute") : (isFA ? "بی‌صدا" : "Mute")}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {(chatEnabled || qaEnabled) && (
              <button
                onClick={() => setSideOpen((v) => !v)}
                className="text-zinc-400 hover:text-white transition-colors"
                title={isFA ? "باز/بستن پنل چت" : "Toggle chat"}
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Video */}
        <div className="relative flex-1 bg-black flex items-center justify-center">
          {status === "waiting" && (
            <div className="text-center space-y-4 px-6">
              <Radio className="w-14 h-14 mx-auto text-zinc-600 animate-pulse" />
              <p className="text-zinc-400 text-lg font-medium">
                {isFA ? "منتظر شروع پخش…" : "Waiting for broadcast…"}
              </p>
              <p className="text-zinc-600 text-sm">
                {isFA
                  ? "به محض شروع پخش توسط مدرس، ویدیو نمایش داده می‌شود"
                  : "The video will appear as soon as the host starts broadcasting"}
              </p>
            </div>
          )}

          {status === "connecting" && (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-400">{isFA ? "در حال اتصال…" : "Connecting…"}</p>
            </div>
          )}

          {status === "ended" && (
            <div className="text-center space-y-4 px-6">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
              <p className="text-zinc-200 text-lg font-semibold">
                {isFA ? "پخش پایان یافت" : "Broadcast ended"}
              </p>
              <p className="text-zinc-500 text-sm">
                {isFA ? "از حضور شما در این وبینار متشکریم" : "Thank you for joining this webinar"}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4 px-6">
              <AlertCircle className="w-14 h-14 mx-auto text-red-500" />
              <p className="text-red-400">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                {isFA ? "بارگذاری مجدد" : "Reload"}
              </Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={cn(
              "absolute inset-0 w-full h-full object-contain transition-opacity",
              status === "watching" ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>

      {/* ── Side panel ── */}
      {(chatEnabled || qaEnabled) && sideOpen && (
        <div className="w-72 xl:w-80 flex flex-col bg-zinc-900 border-s border-zinc-800 shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 shrink-0">
            {chatEnabled && (
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  activeTab === "chat"
                    ? "text-white border-b-2 border-rose-500"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {isFA ? "چت" : "Chat"}
              </button>
            )}
            {qaEnabled && (
              <button
                onClick={() => setActiveTab("qa")}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  activeTab === "qa"
                    ? "text-white border-b-2 border-rose-500"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {isFA ? "سؤال" : "Q&A"}
                {qa.filter((q) => q.answered).length > 0 && (
                  <span className="text-xs bg-emerald-700 text-emerald-100 px-1 rounded">
                    {qa.filter((q) => q.answered).length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {activeTab === "chat" ? (
              chat.length === 0 ? (
                <p className="text-zinc-600 text-center mt-10 text-xs">
                  {isFA ? "اولین پیام را بفرستید!" : "Send the first message!"}
                </p>
              ) : (
                <>
                  {chat.map((m) => (
                    <div key={m.id} className={cn("space-y-0.5", m.viewerId === viewerId && "text-left ltr")}>
                      <span className={cn(
                        "text-xs font-medium",
                        m.viewerId === viewerId ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {m.viewerId === viewerId ? (isFA ? "شما" : "You") : m.name}
                      </span>
                      <p className={cn(
                        "rounded-xl px-3 py-2 text-zinc-100 max-w-[90%]",
                        m.viewerId === viewerId
                          ? "bg-emerald-900/40 mr-auto"
                          : "bg-zinc-800"
                      )}>
                        {m.text}
                      </p>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </>
              )
            ) : (
              qa.length === 0 ? (
                <p className="text-zinc-600 text-center mt-10 text-xs">
                  {isFA ? "سؤال خود را بپرسید" : "Ask your question"}
                </p>
              ) : (
                qa.map((q) => (
                  <div key={q.id} className={cn(
                    "rounded-lg p-3 space-y-1.5 border text-sm",
                    q.answered
                      ? "bg-emerald-950/30 border-emerald-800/40"
                      : "bg-zinc-800 border-zinc-700"
                  )}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-400">
                        {q.viewerId === viewerId ? (isFA ? "شما" : "You") : q.name}
                      </span>
                      {q.answered && (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5 ms-auto">
                          <CheckCircle2 className="w-3 h-3" />
                          {isFA ? "پاسخ داده شد" : "Answered"}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-200">{q.question}</p>
                  </div>
                ))
              )
            )}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 p-3 shrink-0">
            {activeTab === "chat" ? (
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={isFA ? "پیام بفرستید…" : "Send a message…"}
                  disabled={status !== "watching"}
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-zinc-500 placeholder-zinc-600 disabled:opacity-40"
                  dir={isFA ? "rtl" : "ltr"}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || status !== "watching"}
                  className="w-9 h-9 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendQA()}
                  placeholder={isFA ? "سؤال بپرسید…" : "Ask a question…"}
                  disabled={status !== "watching"}
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-zinc-500 placeholder-zinc-600 disabled:opacity-40"
                  dir={isFA ? "rtl" : "ltr"}
                />
                <button
                  onClick={sendQA}
                  disabled={!qaInput.trim() || status !== "watching"}
                  className="w-9 h-9 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
