import { eq, sql } from "drizzle-orm";
import { furnitureInventory, roomFurniture, userProgress } from "@/db/schema";
import { FURNITURE_BY_ID, type RoomFurniture } from "@/game/furniture";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordScoreTransaction } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await authenticatedUser(request);
  if (!userId) return Response.json({ persisted: false, owned: {}, furniture: [] });
  const db = getDb();
  if (!db) return Response.json({ persisted: false, owned: {}, furniture: [] });
  const [inventory, objects, score] = await Promise.all([
    db.select().from(furnitureInventory).where(eq(furnitureInventory.userId, userId)),
    db.select().from(roomFurniture).where(eq(roomFurniture.userId, userId)),
    db.select({ score: userProgress.score }).from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
  ]);
  return Response.json({ persisted: true, score: score[0]?.score ?? 0, owned: Object.fromEntries(inventory.map((item) => [item.assetId, item.quantity])), furniture: objects.map(rowToFurniture) });
}

export async function POST(request: Request) {
  const userId = await authenticatedUser(request);
  if (!userId) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const db = getDb();
  if (!db) return Response.json({ error: "room_unavailable" }, { status: 503 });
  let body: { action?: unknown; assetId?: unknown; furniture?: unknown };
  try { body = await request.json() as typeof body; } catch { return Response.json({ error: "bad_json" }, { status: 400 }); }

  if (body.action === "buy") {
    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    const item = FURNITURE_BY_ID.get(assetId);
    if (!item) return Response.json({ error: "unknown_furniture" }, { status: 400 });
    return db.transaction(async (tx) => {
      const scoreRow = await tx.select({ score: userProgress.score }).from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
      const score = scoreRow[0]?.score ?? 0;
      if (score < item.price) return Response.json({ error: "insufficient_score", score }, { status: 409 });
      await tx.insert(userProgress).values({ userId, score: score - item.price, updatedAt: new Date() }).onConflictDoUpdate({ target: userProgress.userId, set: { score: score - item.price, updatedAt: new Date() } });
      await tx.insert(furnitureInventory).values({ userId, assetId, quantity: 1, updatedAt: new Date() }).onConflictDoUpdate({ target: [furnitureInventory.userId, furnitureInventory.assetId], set: { quantity: sql`${furnitureInventory.quantity} + 1`, updatedAt: new Date() } });
      await recordScoreTransaction(tx, userId, -item.price, "buy_furniture", assetId);
      return Response.json({ purchased: true, score: score - item.price });
    });
  }

  if (body.action === "save") {
    const furniture = parseFurniture(body.furniture);
    if (!furniture) return Response.json({ error: "bad_furniture" }, { status: 400 });
    await db.transaction(async (tx) => {
      await tx.delete(roomFurniture).where(eq(roomFurniture.userId, userId));
      if (furniture.length > 0) await tx.insert(roomFurniture).values(furniture.map((item) => ({ userId, objectId: item.id, assetId: item.assetId, positionX: item.position[0], positionY: item.position[1], positionZ: item.position[2], rotationX: item.rotation[0], rotationY: item.rotation[1], rotationZ: item.rotation[2], scaleX: item.scale[0], scaleY: item.scale[1], scaleZ: item.scale[2], updatedAt: new Date() })));
    });
    return Response.json({ saved: true, count: furniture.length });
  }
  return Response.json({ error: "bad_action" }, { status: 400 });
}

async function authenticatedUser(request: Request) {
  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (isAuthConfigured() && !session?.user) return null;
  return session?.user?.id ?? null;
}

function rowToFurniture(row: typeof roomFurniture.$inferSelect): RoomFurniture {
  return { id: row.objectId, assetId: row.assetId, position: [row.positionX, row.positionY, row.positionZ], rotation: [row.rotationX, row.rotationY, row.rotationZ], scale: [row.scaleX, row.scaleY, row.scaleZ] };
}

function parseFurniture(value: unknown): RoomFurniture[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const ids = new Set<string>();
  const result: RoomFurniture[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Partial<RoomFurniture>;
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(item.id) || ids.has(item.id) || typeof item.assetId !== "string" || !FURNITURE_BY_ID.has(item.assetId)) return null;
    if (![item.position, item.rotation, item.scale].every(isVector)) return null;
    const position = item.position as [number, number, number];
    const rotation = item.rotation as [number, number, number];
    const scale = item.scale as [number, number, number];
    ids.add(item.id);
    result.push({ id: item.id, assetId: item.assetId, position, rotation, scale });
  }
  return result;
}

function isVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((part) => typeof part === "number" && Number.isFinite(part) && Math.abs(part) < 100);
}
