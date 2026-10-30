"use client";

import { memo, useEffect, useRef } from "react";
import { mountIsland, type GameApi } from "@/game/mount";
import type { SceneObjectRecord } from "@/game/platformerKit/sceneConfig";
import type { SceneDefinition } from "@/game/scenes";

function IslandStage({
  api,
  sceneObjects,
  scene,
  canEditScene,
}: {
  api: { current: GameApi | null };
  sceneObjects: SceneObjectRecord[];
  scene: SceneDefinition;
  canEditScene: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = mountIsland(host, sceneObjects, canEditScene, scene.id, scene.spawn);
    api.current = game;
    return () => {
      game.dispose();
      if (api.current === game) api.current = null;
    };
  }, [api, sceneObjects, scene]);

  useEffect(() => {
    api.current?.setEditorAccess(canEditScene);
  }, [api, canEditScene]);

  return <div ref={hostRef} className="stage-host" />;
}

export default memo(IslandStage);
