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
  editorSaveUrl,
  onEditorSaved,
}: {
  api: { current: GameApi | null };
  sceneObjects: SceneObjectRecord[];
  scene: SceneDefinition;
  canEditScene: boolean;
  editorSaveUrl?: string;
  onEditorSaved?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = mountIsland(host, sceneObjects, canEditScene, scene.id, scene.spawn, editorSaveUrl, onEditorSaved);
    api.current = game;
    return () => {
      game.dispose();
      if (api.current === game) api.current = null;
    };
  }, [api, sceneObjects, scene, editorSaveUrl, onEditorSaved]);

  useEffect(() => {
    api.current?.setEditorAccess(canEditScene);
  }, [api, canEditScene]);

  return <div ref={hostRef} className="stage-host" />;
}

export default memo(IslandStage);
