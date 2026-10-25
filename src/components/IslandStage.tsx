"use client";

import { memo, useEffect, useRef } from "react";
import { mountIsland, type GameApi } from "@/game/mount";

function IslandStage({ api }: { api: { current: GameApi | null } }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = mountIsland(host);
    api.current = game;
    return () => {
      game.dispose();
      if (api.current === game) api.current = null;
    };
  }, [api]);

  return <div ref={hostRef} className="stage-host" />;
}

export default memo(IslandStage, () => true);
