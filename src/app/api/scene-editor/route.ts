import { getAuth, isAuthConfigured } from "@/lib/auth";
import { GAME_ASSET_BY_ID } from "@/game/platformerKit/registry";
import { replaceScene, readScene, MAIN_SCENE_ID } from "@/server/scene-store";
import type { SceneObjectRecord, SceneRegion } from "@/game/platformerKit/sceneConfig";
import { SCENE_DEFINITION_BY_ID, type SceneId } from "@/game/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REGIONS: SceneRegion[] = ["forest", "snow-mountain", "snow-valley", "highland", "floating"];
const CATEGORIES = new Set(["terrain", "snow", "cliff", "platform", "tree", "rock", "fence", "ladder", "decoration", "collectible", "interactive", "character"]);

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("sceneId");
  const sceneId = requested && SCENE_DEFINITION_BY_ID.has(requested as SceneId) ? requested : MAIN_SCENE_ID;
  const objects = await readScene(sceneId);
  return Response.json({ sceneId, objects });
}

export async function PUT(request: Request) {
  const auth = await getEditorAuth(request);
  if (!auth.allowed) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { sceneId?: unknown; objects?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const objects = parseSceneObjects(body.objects);
  const sceneId = typeof body.sceneId === "string" ? body.sceneId : MAIN_SCENE_ID;
  if (!SCENE_DEFINITION_BY_ID.has(sceneId as SceneId)) {
    return Response.json({ error: "unsupported_scene" }, { status: 400 });
  }
  if (!objects) return Response.json({ error: "bad_scene_objects" }, { status: 400 });

  try {
    const persisted = await replaceScene(objects, auth.userId, sceneId);
    if (!persisted) return Response.json({ error: "database_unavailable" }, { status: 503 });
    return Response.json({ saved: true, sceneId, count: objects.length });
  } catch (error) {
    console.error("[scene-editor] save failed", error);
    return Response.json({ error: "scene_editor_unavailable" }, { status: 500 });
  }
}

async function getEditorAuth(request: Request) {
  if (!isAuthConfigured() && process.env.NODE_ENV !== "production") {
    return { allowed: true as const, userId: "local-development", status: 200, error: "" };
  }
  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (!session?.user) return { allowed: false as const, userId: "", status: 401, error: "sign_in_required" };
  const role = (session.user as typeof session.user & { role?: string }).role;
  if (role !== "admin") return { allowed: false as const, userId: "", status: 403, error: "admin_required" };
  return { allowed: true as const, userId: session.user.id, status: 200, error: "" };
}

function parseSceneObjects(value: unknown): SceneObjectRecord[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const ids = new Set<string>();
  const objects: SceneObjectRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Partial<SceneObjectRecord>;
    if (typeof record.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(record.id) || ids.has(record.id)) return null;
    if (typeof record.assetId !== "string" || !GAME_ASSET_BY_ID.has(record.assetId)) return null;
    if (typeof record.category !== "string" || !CATEGORIES.has(record.category)) return null;
    if (typeof record.region !== "string" || !REGIONS.includes(record.region as SceneRegion)) return null;
    if (!isVector(record.position) || !isVector(record.rotation) || !isScale(record.scale)) return null;
    if (typeof record.visible !== "boolean" || typeof record.collectible !== "boolean" || typeof record.autoAnchor !== "boolean") return null;
    ids.add(record.id);
    objects.push({
      id: record.id,
      assetId: record.assetId,
      category: record.category as SceneObjectRecord["category"],
      region: record.region as SceneRegion,
      position: record.position,
      rotation: record.rotation,
      scale: record.scale,
      visible: record.visible,
      collectible: record.collectible,
      autoAnchor: record.autoAnchor,
    });
  }
  return objects;
}

function isVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= 1000);
}

function isScale(value: unknown): value is [number, number, number] {
  return isVector(value) && value.every((item) => item > 0.001);
}
