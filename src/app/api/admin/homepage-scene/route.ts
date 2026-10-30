import { getAuth, isAuthConfigured } from "@/lib/auth";
import { SCENE_DEFINITION_BY_ID, SCENE_DEFINITIONS, type SceneId } from "@/game/scenes";
import {
  clearHomepageSceneSetting,
  defaultSceneObjects,
  publishHomepageScene,
  readHomepageSceneSetting,
  readScene,
  readSceneDraft,
  saveSceneDraft,
} from "@/server/scene-store";
import { parseSceneObjects } from "@/server/scene-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAdminAuth(request);
  if (!auth.allowed) return Response.json({ error: auth.error }, { status: auth.status });
  const requested = new URL(request.url).searchParams.get("sceneId");
  const sceneId = requested && SCENE_DEFINITION_BY_ID.has(requested as SceneId) ? requested as SceneId : SCENE_DEFINITIONS[0].id;
  const draft = await readSceneDraft(sceneId);
  const activeSceneId = await readHomepageSceneSetting();
  return Response.json({
    scenes: SCENE_DEFINITIONS,
    sceneId,
    activeSceneId,
    hasDraft: Boolean(draft),
    objects: draft ?? await readScene(sceneId),
  });
}

export async function PUT(request: Request) {
  const auth = await getAdminAuth(request);
  if (!auth.allowed) return Response.json({ error: auth.error }, { status: auth.status });
  const body = await readBody(request);
  if (!body) return Response.json({ error: "bad_json" }, { status: 400 });
  const sceneId = asSceneId(body.sceneId);
  const objects = parseSceneObjects(body.objects);
  if (!sceneId || !objects) return Response.json({ error: "bad_scene_objects" }, { status: 400 });
  const saved = await saveSceneDraft(sceneId, objects, auth.userId);
  if (!saved) return Response.json({ error: "database_unavailable" }, { status: 503 });
  return Response.json({ saved: true, sceneId, count: objects.length, hasDraft: true });
}

export async function POST(request: Request) {
  const auth = await getAdminAuth(request);
  if (!auth.allowed) return Response.json({ error: auth.error }, { status: auth.status });
  const body = await readBody(request);
  if (!body) return Response.json({ error: "bad_json" }, { status: 400 });
  const sceneId = asSceneId(body.sceneId);
  const objects = parseSceneObjects(body.objects) ?? (sceneId ? await readSceneDraft(sceneId) : null);
  if (!sceneId || !objects) return Response.json({ error: "bad_scene_objects" }, { status: 400 });
  const published = await publishHomepageScene(sceneId, objects, auth.userId);
  if (!published) return Response.json({ error: "database_unavailable" }, { status: 503 });
  return Response.json({ published: true, sceneId, count: objects.length, activeSceneId: sceneId });
}

export async function DELETE(request: Request) {
  const auth = await getAdminAuth(request);
  if (!auth.allowed) return Response.json({ error: auth.error }, { status: auth.status });
  const cleared = await clearHomepageSceneSetting(auth.userId);
  if (!cleared) return Response.json({ error: "database_unavailable" }, { status: 503 });
  return Response.json({ cleared: true, activeSceneId: null });
}

async function getAdminAuth(request: Request) {
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

async function readBody(request: Request): Promise<{ sceneId?: unknown; objects?: unknown } | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as { sceneId?: unknown; objects?: unknown } : null;
  } catch {
    return null;
  }
}

function asSceneId(value: unknown): SceneId | null {
  return typeof value === "string" && SCENE_DEFINITION_BY_ID.has(value as SceneId) ? value as SceneId : null;
}
