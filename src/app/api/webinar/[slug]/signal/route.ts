/**
 * WebRTC Signaling endpoint — HTTP-polling based (no WebSocket needed).
 *
 * Architecture (SFU-lite over HTTP polling):
 *   Broadcaster  →  POST /api/webinar/[slug]/signal  { type:"offer"|"ice-broadcaster", ... }
 *   Viewer       →  POST /api/webinar/[slug]/signal  { type:"answer"|"ice-viewer", viewerId, ... }
 *   Viewer       →  GET  /api/webinar/[slug]/signal?role=viewer&viewerId=xxx   → gets latest offer + ice
 *   Broadcaster  →  GET  /api/webinar/[slug]/signal?role=broadcaster           → gets answers + viewer-ice
 *
 * In-process store (works on a single Node instance — Vercel / local dev).
 * For multi-instance deployments, replace `rooms` with Redis or Upstash.
 *
 * WebRTC flow:
 *   1. Admin opens /broadcast → getUserMedia → creates RTCPeerConnection → createOffer
 *   2. POST offer  → stored in room.offer
 *   3. Viewer opens /live → polls GET → receives offer → createAnswer
 *   4. Viewer POST answer with viewerId
 *   5. Broadcaster polls GET → receives answer → setRemoteDescription
 *   6. ICE candidates exchanged similarly
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent } from "@/lib/data/store";
import { createReservation, getAllReservations } from "@/lib/data/reservations";

export const dynamic = "force-dynamic";

/* ── In-memory signal store ─────────────────────────────────────── */

interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

interface ViewerState {
  answer: RTCSessionDescriptionInit | null;
  iceCandidates: IceCandidate[];
  lastSeen: number;
}

interface Room {
  /** The broadcaster's SDP offer */
  offer: RTCSessionDescriptionInit | null;
  /** ICE candidates from the broadcaster */
  broadcasterIce: IceCandidate[];
  /** Per-viewer answers + ICE */
  viewers: Map<string, ViewerState>;
  /** Broadcaster's answer-consumption cursor per viewer (index into viewer.iceCandidates) */
  broadcasterCursor: Map<string, number>;
  /** Chat messages */
  chat: ChatMessage[];
  /** Q&A questions */
  qa: QAQuestion[];
  /** Registered attendees (name + email collected at join gate) */
  attendees: Map<string, Attendee>;
  /** Room status */
  status: "scheduled" | "live" | "ended";
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  viewerId: string;
  name: string;
  text: string;
  ts: number;
}

export interface QAQuestion {
  id: string;
  viewerId: string;
  name: string;
  question: string;
  answered: boolean;
  ts: number;
}

export interface Attendee {
  viewerId: string;
  name: string;
  email: string;
  joinedAt: number;
  /** last time they sent any signal */
  lastSeen: number;
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(slug: string): Room {
  let r = rooms.get(slug);
  if (!r) {
    r = {
      offer: null,
      broadcasterIce: [],
      viewers: new Map(),
      broadcasterCursor: new Map(),
      chat: [],
      qa: [],
      attendees: new Map(),
      status: "scheduled",
      createdAt: Date.now(),
    };
    rooms.set(slug, r);
  }
  return r;
}

/** Prune rooms older than 12 hours */
function pruneRooms() {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [k, r] of rooms) {
    if (r.createdAt < cutoff) rooms.delete(k);
  }
}

/* ── GET — poll for signaling data ─────────────────────────────── */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(_req.url);
  const role = url.searchParams.get("role");
  const viewerId = url.searchParams.get("viewerId") ?? "";

  const room = rooms.get(slug);

  if (role === "viewer") {
    if (!room || room.status === "ended") {
      return NextResponse.json(
        { status: "ended", offer: null, broadcasterIce: [] },
        withNoStore()
      );
    }
    const reservationCount = (await getAllReservations()).filter(
      (reservation) => reservation.eventSlug === slug && reservation.status !== "cancelled",
    ).length;
    // Return offer + all broadcaster ICE candidates
    return NextResponse.json(
      {
        status: room.status,
        offer: room.offer,
        broadcasterIce: room.broadcasterIce,
        reservationCount,
        chat: room.chat.slice(-50),
        qa: room.qa,
      },
      withNoStore()
    );
  }

  if (role === "broadcaster") {
    if (!room) {
      return NextResponse.json({ viewers: [], attendees: [] }, withNoStore());
    }
    // Return all pending answers + uncollected viewer ICE
    const viewers: {
      viewerId: string;
      answer: RTCSessionDescriptionInit | null;
      newIce: IceCandidate[];
    }[] = [];

    for (const [vid, vs] of room.viewers) {
      const cursor = room.broadcasterCursor.get(vid) ?? 0;
      const newIce = vs.iceCandidates.slice(cursor);
      room.broadcasterCursor.set(vid, vs.iceCandidates.length);
      viewers.push({ viewerId: vid, answer: vs.answer, newIce });
    }

    // Serialize attendees map → array for JSON
    const attendees = Array.from(room.attendees.values());

    return NextResponse.json({ viewers, status: room.status, chat: room.chat.slice(-50), qa: room.qa, attendees }, withNoStore());
  }

  return NextResponse.json({ error: "missing role" }, withNoStore({ status: 400 }));
}

/* ── POST — send signaling data ─────────────────────────────────── */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  pruneRooms();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, withNoStore({ status: 400 }));
  }

  const type = body.type as string;

  /* ── Broadcaster actions (require admin session) ── */
  if (type === "offer" || type === "ice-broadcaster" || type === "end" || type === "start") {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, withNoStore({ status: 401 }));
    }

    const room = getOrCreateRoom(slug);

    if (type === "start") {
      room.status = "live";
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "end") {
      room.status = "ended";
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "offer") {
      room.offer = body.sdp as RTCSessionDescriptionInit;
      room.broadcasterIce = []; // reset ICE on new offer
      room.viewers.clear();
      room.broadcasterCursor.clear();
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "ice-broadcaster") {
      const candidate = body.candidate as IceCandidate;
      room.broadcasterIce.push(candidate);
      return NextResponse.json({ ok: true }, withNoStore());
    }
  }

  /* ── Viewer actions ── */
  if (type === "register" || type === "join" || type === "answer" || type === "ice-viewer" || type === "chat" || type === "qa") {
    const viewerId = (body.viewerId as string) || `v-${Date.now()}`;
    const room = getOrCreateRoom(slug);

    // register — called from WebinarJoinGate before entering the room
    if (type === "register") {
      const attName = ((body.name as string) || "").slice(0, 80);
      const attEmail = ((body.email as string) || "").slice(0, 200).toLowerCase();
      const content = await getContent();
      const event = content.education.find(
        (item) => item.slug === slug && (item.type === "workshop" || item.type === "webinar"),
      );
      if (!event?.liveEvent) {
        return NextResponse.json({ error: "event_not_found" }, withNoStore({ status: 404 }));
      }
      const session = await getSession();
      try {
        await createReservation({
          eventSlug: slug,
          eventType: event.type as "workshop" | "webinar",
          eventTitle: event.title,
          startsAt: event.liveEvent.startsAt,
          capacity: event.liveEvent.capacity,
          userId: session?.id,
          name: attName,
          email: attEmail,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "event_full") {
          return NextResponse.json({ error: "event_full" }, withNoStore({ status: 409 }));
        }
        throw error;
      }
      const existing = room.attendees.get(viewerId);
      if (existing) {
        existing.lastSeen = Date.now();
        existing.name = attName || existing.name;
      } else {
        room.attendees.set(viewerId, {
          viewerId,
          name: attName,
          email: attEmail,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        });
      }
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "join") {
      let vs = room.viewers.get(viewerId);
      if (!vs) {
        vs = { answer: null, iceCandidates: [], lastSeen: Date.now() };
        room.viewers.set(viewerId, vs);
      } else {
        vs.lastSeen = Date.now();
      }
      // Update lastSeen in attendees too
      const att = room.attendees.get(viewerId);
      if (att) att.lastSeen = Date.now();
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "answer") {
      let vs = room.viewers.get(viewerId);
      if (!vs) {
        vs = { answer: null, iceCandidates: [], lastSeen: Date.now() };
        room.viewers.set(viewerId, vs);
      }
      vs.answer = body.sdp as RTCSessionDescriptionInit;
      vs.lastSeen = Date.now();
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "ice-viewer") {
      let vs = room.viewers.get(viewerId);
      if (!vs) {
        vs = { answer: null, iceCandidates: [], lastSeen: Date.now() };
        room.viewers.set(viewerId, vs);
      }
      vs.iceCandidates.push(body.candidate as IceCandidate);
      vs.lastSeen = Date.now();
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "chat") {
      // Use registered name if available
      const att = room.attendees.get(viewerId);
      const msg: ChatMessage = {
        id: `c-${Date.now()}`,
        viewerId,
        name: att?.name || (body.name as string) || "بیننده",
        text: ((body.text as string) || "").slice(0, 300),
        ts: Date.now(),
      };
      room.chat.push(msg);
      if (room.chat.length > 200) room.chat.splice(0, room.chat.length - 200);
      return NextResponse.json({ ok: true }, withNoStore());
    }

    if (type === "qa") {
      const att = room.attendees.get(viewerId);
      const q: QAQuestion = {
        id: `q-${Date.now()}`,
        viewerId,
        name: att?.name || (body.name as string) || "بیننده",
        question: ((body.question as string) || "").slice(0, 500),
        answered: false,
        ts: Date.now(),
      };
      room.qa.push(q);
      return NextResponse.json({ ok: true }, withNoStore());
    }
  }

  return NextResponse.json({ error: "unknown type" }, withNoStore({ status: 400 }));
}
