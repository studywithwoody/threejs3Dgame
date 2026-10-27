import { Shell } from "@/components/Shell";
import { readScene } from "@/server/scene-store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sceneObjects = await readScene();
  return <Shell initialSceneObjects={sceneObjects} />;
}
