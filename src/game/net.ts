import type { IslandProgress, Pose, Profile } from "@/game/types";

const CHANNEL = "dawn-isle";

/**
 * Seam for a future hosted realtime provider.
 * `connectIsland` returns this shape. A provider replaces `connectBroadcast`
 * and can fall back to it when credentials are missing or the socket fails.
 */
export type RealtimeTransport = {
  mode: NetMode;
  warning?: string;
  sendPose: (pose: Pose) => void;
  sendProgress: (state: IslandProgress) => void;
  updateProfile: (profile: Profile) => void;
  close: () => void;
};

export type NetMode = "local" | "remote";

export type IslandConnection = RealtimeTransport;

type Handlers = {
  profile: Profile;
  order: string[];
  onProgress: (state: IslandProgress) => void;
  onPose: (pose: Pose & Profile) => void;
  onLeave: (id: string) => void;
  onRoster: (people: Profile[]) => void;
};

export async function connectIsland(
  handlers: Handlers,
  options?: { databaseConfigured?: boolean; spawn?: { x: number; z: number } },
): Promise<RealtimeTransport> {
  const local = connectBroadcast(handlers, options?.spawn);
  const warning = options?.databaseConfigured
    ? "即時多人連線尚未接上。同一個瀏覽器的分頁看得到彼此；全班的答題進度存在資料庫。"
    : "尚未連接資料庫。進度存在這台瀏覽器，同一個瀏覽器的分頁看得到彼此。";
  return { ...local, warning };
}

function connectBroadcast(handlers: Handlers, spawn = { x: 4, z: -10.5 }): RealtimeTransport {
  const channel = new BroadcastChannel(CHANNEL);
  let profile = handlers.profile;
  const poseNow = { x: spawn.x, z: spawn.z, ry: 0 };
  const roster = new Map<string, Profile & { seen: number }>();

  const publishRoster = () => {
    const now = Date.now();
    for (const [id, person] of roster) {
      if (now - person.seen > 8000) roster.delete(id);
    }
    handlers.onRoster([profile, ...roster.values()]);
  };

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as {
      type: string;
      payload: Pose & Profile & { progress?: IslandProgress };
    };
    const payload = data?.payload;
    if (!payload?.id || payload.id === profile.id) return;
    if (data.type === "pose" || data.type === "hello") {
      handlers.onPose(payload);
      roster.set(payload.id, { ...payload, seen: Date.now() });
      publishRoster();
      if (data.type === "hello") {
        channel.postMessage({ type: "pose", payload: { ...profile, ...poseNow } });
      }
    }
  };

  const timer = window.setInterval(() => {
    const now = Date.now();
    for (const [id, person] of roster) {
      if (now - person.seen > 8000) {
        roster.delete(id);
        handlers.onLeave(id);
      }
    }
    publishRoster();
  }, 2000);

  channel.postMessage({ type: "hello", payload: { ...profile, ...poseNow } });
  publishRoster();

  return {
    mode: "local",
    sendPose(pose) {
      poseNow.x = pose.x;
      poseNow.z = pose.z;
      poseNow.ry = pose.ry;
      channel.postMessage({ type: "pose", payload: { ...profile, ...pose } });
    },
    sendProgress(state) {
      void state;
    },
    updateProfile(next) {
      profile = next;
      publishRoster();
    },
    close() {
      window.clearInterval(timer);
      channel.close();
    },
  };
}
