import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Orders store — same dual-backend pattern.
 * Persists customer orders submitted via /api/orders.
 */

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface OrderLine {
  kind: "pattern" | "product";
  id: string;
  sku: string;
  title: string;
  image: string;
  price: { fa: number; en: number };
  colorName?: string;
  qty: number;
}

export interface Order {
  id: string;
  userId?: string; // optional – guest checkout supported
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  lines: OrderLine[];
  total: { fa: number; en: number };
  status: OrderStatus;
  createdAt: string;
}

/* ---------- backends ---------- */
const ORDER_KEY = "rosie-atelier:orders";
const FILE_PATH = path.join(process.cwd(), "data", "orders.json");

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

async function fileRead(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function fileWrite(orders: Order[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(orders, null, 2), "utf8");
}

/* ---------- public API ---------- */
export async function getAllOrders(): Promise<Order[]> {
  try {
    if (redisEnabled()) {
      const { result } = await redisCmd(["GET", ORDER_KEY]);
      if (typeof result === "string") return JSON.parse(result) as Order[];
      return [];
    }
    return await fileRead();
  } catch {
    return [];
  }
}

async function saveAllOrders(orders: Order[]): Promise<void> {
  if (redisEnabled()) {
    await redisCmd(["SET", ORDER_KEY, JSON.stringify(orders)]);
  } else {
    await fileWrite(orders);
  }
}

export async function createOrder(
  data: Omit<Order, "id" | "status" | "createdAt">,
): Promise<Order> {
  const orders = await getAllOrders();
  const order: Order = {
    ...data,
    id: `RA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await saveAllOrders([...orders, order]);
  return order;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const orders = await getAllOrders();
  return orders.filter((o) => o.userId === userId);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const orders = await getAllOrders();
  return orders.filter((o) => o.email.toLowerCase() === email.toLowerCase());
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const orders = await getAllOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], status };
  await saveAllOrders(orders);
  return orders[idx];
}
