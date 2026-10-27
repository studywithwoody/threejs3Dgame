import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Transform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

const OVERRIDES_PATH = path.join(process.cwd(), "src/game/platformerKit/scene-editor-overrides.json");

export async function POST(request: Request) {
  let body: { id?: unknown; position?: unknown; rotation?: unknown; scale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const transform = readTransform(body.position, body.rotation, body.scale);
  if (!/^[a-zA-Z0-9_-]+$/.test(id) || !transform) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const source = await readFile(OVERRIDES_PATH, "utf8");
    const overrides = JSON.parse(source) as Record<string, Transform>;
    overrides[id] = transform;
    await writeFile(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
    return Response.json({ saved: true, id });
  } catch (error) {
    console.error("[scene-editor]", error);
    return Response.json({ error: "scene_editor_unavailable" }, { status: 500 });
  }
}

function readTransform(position: unknown, rotation: unknown, scale: unknown): Transform | null {
  if (!isVector(position) || !isVector(rotation) || !isVector(scale)) return null;
  return { position, rotation, scale };
}

function isVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}
