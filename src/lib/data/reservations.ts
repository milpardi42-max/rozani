import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { AcademyReservation } from "../types";
import type { Localized } from "../i18n/types";

const KEY = "rosie-atelier:academy-reservations";
const FILE = path.join(process.cwd(), "data", "reservations.json");

function redisEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCmd(args: string[]) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  return (await response.json()) as { result: unknown };
}

async function read(): Promise<AcademyReservation[]> {
  try {
    const raw = redisEnabled()
      ? (await redisCmd(["GET", KEY])).result
      : await fs.readFile(FILE, "utf8");
    if (typeof raw !== "string") return [];
    return JSON.parse(raw) as AcademyReservation[];
  } catch {
    return [];
  }
}

async function write(reservations: AcademyReservation[]) {
  const json = JSON.stringify(reservations, null, 2);
  if (redisEnabled()) {
    await redisCmd(["SET", KEY, json]);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, json, "utf8");
}

export async function getAllReservations(): Promise<AcademyReservation[]> {
  return read();
}

export async function getUserReservations(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return (await read())
    .filter((reservation) => reservation.userId === userId || reservation.email === normalizedEmail)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function createReservation(input: {
  eventSlug: string;
  eventType: "course" | "workshop" | "webinar";
  eventTitle: Localized;
  startsAt: string;
  capacity: number;
  userId?: string;
  name: string;
  email: string;
}) {
  const reservations = await read();
  const email = input.email.trim().toLowerCase();
  const duplicate = reservations.find(
    (reservation) =>
      reservation.eventSlug === input.eventSlug &&
      reservation.status !== "cancelled" &&
      (input.userId ? reservation.userId === input.userId : reservation.email === email),
  );
  if (duplicate) return duplicate;

  const activeCount = reservations.filter(
    (reservation) => reservation.eventSlug === input.eventSlug && reservation.status !== "cancelled",
  ).length;
  // Courses are self-paced: unlimited seats, no schedule.
  if (input.capacity > 0 && activeCount >= input.capacity) {
    throw new Error("event_full");
  }

  const reservation: AcademyReservation = {
    id: `res-${crypto.randomBytes(8).toString("hex")}`,
    eventSlug: input.eventSlug,
    eventType: input.eventType,
    eventTitle: input.eventTitle,
    startsAt: input.startsAt,
    ...(input.userId ? { userId: input.userId } : {}),
    name: input.name.trim().slice(0, 80),
    email,
    createdAt: new Date().toISOString(),
    status: "reserved",
  };
  await write([...reservations, reservation]);
  return reservation;
}