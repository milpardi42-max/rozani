import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getContent, updateCollection } from "./store";

/**
 * User store — same dual-backend pattern as the content store.
 *  1. Upstash Redis  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *  2. Local file     data/users.json
 *
 * Passwords are hashed with PBKDF2-SHA256. No plain-text is ever persisted.
 */

export type UserRole = "user" | "artist" | "admin";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** PBKDF2 hash: "pbkdf2:iterations:salt:hash" */
  passwordHash: string;
  artistId?: string; // linked Artist record if role === "artist"
  createdAt: string;
}

export type PublicUser = Omit<StoredUser, "passwordHash">;

/* ---------- helpers ---------- */
const ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const [, iter, salt, expected] = parts;
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, Number(iter), 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

/* ---------- Redis backend ---------- */
const USER_KEY = "rosie-atelier:users";
const FILE_PATH = path.join(process.cwd(), "data", "users.json");

function redisEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCmd(args: string[]) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()) as { result: unknown };
}

/* ---------- file backend ---------- */
async function fileRead(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function fileWrite(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(users, null, 2), "utf8");
}

/* ---------- public API ---------- */
export async function getAllUsers(): Promise<StoredUser[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", USER_KEY]);
      if (typeof result === "string") return JSON.parse(result) as StoredUser[];
      return [];
    }
    return await fileRead();
  } catch {
    return [];
  }
}

export async function saveAllUsers(users: StoredUser[]): Promise<void> {
  if (redisEnabled()) {
    await redisCmd(["SET", USER_KEY, JSON.stringify(users)]);
  } else {
    await fileWrite(users);
  }
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) ?? null;
}

export interface ArtistSignupExtra {
  phone?: string;
  city?: string;
  specialty?: string;
  instagram?: string;
  portfolioUrl?: string;
  /** Studio / brand name (seller registration) */
  studioName?: string;
  /** Years of practice (seller registration) */
  experience?: string;
  /** Short "about" written by the designer — becomes the public bio */
  bio?: string;
  /** Delivery formats the designer declared (format ids, already validated) */
  formats?: string[];
  /** Product families the designer works in (family ids, already validated) */
  families?: string[];
  /** Timestamp of the accepted seller terms */
  termsAt?: string;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = "user",
  artistId?: string,
  signupExtra?: ArtistSignupExtra,
): Promise<StoredUser> {
  const users = await getAllUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("email_taken");
  }

  const userId = `usr-${crypto.randomBytes(8).toString("hex")}`;

  let resolvedArtistId: string | undefined;

  if (role === "artist") {
    if (artistId) {
      // Explicitly provided (admin assigning an existing Artist record)
      resolvedArtistId = artistId;
    } else {
      // Self-registration via /creators/join — create a fresh "pending" Artist record
      resolvedArtistId = await createPendingArtist(userId, name, email, signupExtra);
    }
  }

  const user: StoredUser = {
    id: userId,
    name,
    email: email.toLowerCase().trim(),
    role,
    passwordHash: await hashPassword(password),
    ...(resolvedArtistId ? { artistId: resolvedArtistId } : {}),
    createdAt: new Date().toISOString(),
  };
  await saveAllUsers([...users, user]);
  return user;
}

/**
 * Creates a new Artist record with status "pending" linked to the given user.
 * Called automatically during artist self-registration.
 */
async function createPendingArtist(
  userId: string,
  name: string,
  _email: string,
  extra?: ArtistSignupExtra,
): Promise<string> {
  const content = await getContent();

  // Derive a unique slug from the name
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "artist";

  let slug = base;
  let i = 1;
  while (content.artists.some((a) => a.slug === slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }

  const artistId = `artist-${crypto.randomBytes(8).toString("hex")}`;

  const cityVal = extra?.city?.trim() || "";
  const instagramHandle = extra?.instagram?.replace(/^@/, "").trim() || undefined;

  const newArtist = {
    id: artistId,
    slug,
    name: { fa: name, en: name },
    profession: {
      fa: extra?.specialty || "هنرمند / طراح",
      en: extra?.specialty || "Artist / Designer",
    },
    bio: { fa: extra?.bio?.trim() ?? "", en: extra?.bio?.trim() ?? "" },
    avatar: "/images/artists/placeholder.jpg",
    cover: "/images/artists/cover-placeholder.jpg",
    location: { fa: cityVal, en: cityVal },
    social: {
      ...(instagramHandle ? { instagram: instagramHandle } : {}),
      ...(extra?.portfolioUrl ? { website: extra.portfolioUrl } : {}),
    },
    featured: false,
    followers: 0,
    rating: 0,
    reviewsCount: 0,
    tags: [],
    userId,
    status: "pending" as const,
    revenueSharePct: 30,
    licenseType: "standard" as const,
    ...(extra?.phone ? { signupPhone: extra.phone } : {}),
    ...(extra?.city ? { signupCity: extra.city } : {}),
    ...(extra?.specialty ? { signupSpecialty: extra.specialty } : {}),
    ...(extra?.portfolioUrl ? { signupPortfolioUrl: extra.portfolioUrl } : {}),
    ...(extra?.studioName ? { signupStudio: extra.studioName } : {}),
    ...(extra?.experience ? { signupExperience: extra.experience } : {}),
    ...(extra?.formats?.length ? { signupFormats: extra.formats } : {}),
    ...(extra?.families?.length ? { signupFamilies: extra.families } : {}),
    ...(extra?.termsAt ? { signupTermsAt: extra.termsAt } : {}),
  };

  await updateCollection("artists", [...content.artists, newArtist]);
  return artistId;
}

export async function updateUser(id: string, patch: Partial<Pick<StoredUser, "name" | "artistId" | "role" | "passwordHash">>): Promise<StoredUser | null> {
  const users = await getAllUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  // No fallback to artists[0] — adminAssigning role must provide an explicit artistId,
  // or leave it blank (the artist may not yet have a linked profile).

  const updated = { ...users[idx], ...patch };
  users[idx] = updated;
  await saveAllUsers(users);
  return updated;
}

export function toPublicUser(u: StoredUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...pub } = u;
  return pub;
}
