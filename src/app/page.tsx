import { Shell } from "@/components/Shell";
import { readScene } from "@/server/scene-store";
import { resolveDailyScene } from "@/server/daily-scene";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { scene, dateKey } = await resolveDailyScene();
  const sceneObjects = await readScene(scene.id);
  return <Shell initialSceneObjects={sceneObjects} scene={scene} dateKey={dateKey} />;
}
