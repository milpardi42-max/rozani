import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * Marketplace persistence — same dual-backend contract as the rest of the site
 * (`src/lib/data/store.ts`, `users.ts`, `orders.ts`):
 *
 *   1. Upstash Redis  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *   2. Local JSON     data/mk-<name>.json
 *
 * Collections are append-mostly documents (assets, licenses, ledger…). Every
 * mutation goes through `mutateCollection`, which serialises concurrent writers
 * for the same key inside a single Node process and re-reads before writing, so
 * a payment callback racing an admin action cannot silently overwrite data.
 */

export const KEYS = {
  assets: "rosie-atelier:mk:assets",
  uploads: "rosie-atelier:mk:uploads",
  orders: "rosie-atelier:mk:orders",
  payments: "rosie-atelier:mk:payments",
  sandbox: "rosie-atelier:mk:sandbox-transactions",
  licenses: "rosie-atelier:mk:licenses",
  ledger: "rosie-atelier:mk:ledger",
  payouts: "rosie-atelier:mk:payouts",
  payoutProfiles: "rosie-atelier:mk:payout-profiles",
  coupons: "rosie-atelier:mk:coupons",
  subscriptions: "rosie-atelier:mk:subscriptions",
  outbox: "rosie-atelier:mk:outbox",
  events: "rosie-atelier:mk:events",
  counters: "rosie-atelier:mk:counters",
  referrals: "rosie-atelier:mk:referrals",
  settings: "rosie-atelier:mk:settings",
} as const;

export type CollectionKey = (typeof KEYS)[keyof typeof KEYS];

const FILE_DIR = path.join(process.cwd(), "data");

function fileFor(key: CollectionKey) {
  const slug = key.replace("rosie-atelier:mk:", "").replace(/[^a-z0-9-]/gi, "-");
  return path.join(FILE_DIR, `mk-${slug}.json`);
}

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

export function marketplaceBackendName(): "redis" | "file" {
  return redisEnabled() ? "redis" : "file";
}

/** Read a whole collection (never throws — a broken file degrades to []). */
export async function readCollection<T>(key: CollectionKey): Promise<T[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", key]);
      if (typeof result === "string") return JSON.parse(result) as T[];
      return [];
    }
    const raw = await fs.readFile(fileFor(key), "utf8");
    const json = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(json) as T[];
  } catch {
    return [];
  }
}

export async function writeCollection<T>(key: CollectionKey, items: T[]): Promise<void> {
  const json = JSON.stringify(items, null, 2);
  if (redisEnabled()) {
    await redisCmd(["SET", key, json]);
    return;
  }
  await fs.mkdir(FILE_DIR, { recursive: true });
  await fs.writeFile(fileFor(key), json, "utf8");
}

/* ------------------------------------------------------------------ */
/* Serialised read-modify-write                                        */
/* ------------------------------------------------------------------ */

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

/**
 * Atomically transform a collection.
 *
 * @param fn receives the freshly-read items and returns the next state plus a
 *           result value that is handed back to the caller.
 */
export async function mutateCollection<T, R>(
  key: CollectionKey,
  fn: (items: T[]) => { next?: T[]; result: R } | Promise<{ next?: T[]; result: R }>,
): Promise<R> {
  return withLock(key, async () => {
    const items = await readCollection<T>(key);
    const { next, result } = await fn(items);
    if (next) await writeCollection(key, next);
    return result;
  });
}

/* ------------------------------------------------------------------ */
/* Small documents (settings / counters)                               */
/* ------------------------------------------------------------------ */

export async function readDoc<T>(key: CollectionKey, fallback: T): Promise<T> {
  const items = await readCollection<{ value: T }>(key);
  const first = items[0];
  return first && first.value !== undefined ? first.value : fallback;
}

export async function writeDoc<T>(key: CollectionKey, value: T): Promise<void> {
  await writeCollection(key, [{ value }]);
}

/* ------------------------------------------------------------------ */
/* Atomic sequence numbers (license serials, payout refs…)             */
/* ------------------------------------------------------------------ */

export async function nextSequence(name: string): Promise<number> {
  return mutateCollection<{ name: string; value: number }, number>(KEYS.counters, (items) => {
    const idx = items.findIndex((c) => c.name === name);
    if (idx === -1) return { next: [...items, { name, value: 1 }], result: 1 };
    const value = items[idx].value + 1;
    const next = items.map((c, i) => (i === idx ? { ...c, value } : c));
    return { next, result: value };
  });
}
