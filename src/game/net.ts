import { loadProgress, mergeProgress, normalizeProgress, saveProgress, signature } from "@/game/progress";
import { SPAWN } from "@/game/terrain";
import type { ChatMessage, IslandProgress, Pose, Profile } from "@/game/types";

const CHANNEL = "dawn-isle";

/**
 * Seam for a future hosted realtime provider.
 * `connectIsland` returns this shape. A provider replaces `connectBroadcast`
 * and can fall back to it when credentials are missing or the socket fails.
 * Chat is not stored; only this transport carries it.
 */
export type RealtimeTransport = {
  mode: NetMode;
  warning?: string;
  sendPose: (pose: Pose) => void;
  sendChat: (text: string) => void;
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
  onChat: (message: ChatMessage) => void;
  onPose: (pose: Pose & Profile) => void;
  onLeave: (id: string) => void;
  onRoster: (people: Profile[]) => void;
};

export async function connectIsland(
  handlers: Handlers,
  options?: { databaseConfigured?: boolean },
): Promise<RealtimeTransport> {
  const local = connectBroadcast(handlers);
  const warning = options?.databaseConfigured
    ? "即時多人連線尚未接上。同一個瀏覽器的分頁看得到彼此；全班的答題進度存在資料庫。"
    : "尚未連接資料庫。進度存在這台瀏覽器，同一個瀏覽器的分頁看得到彼此。";
  return { ...local, warning };
}

function connectBroadcast(handlers: Handlers): RealtimeTransport {
  const channel = new BroadcastChannel(CHANNEL);
  let profile = handlers.profile;
  let progress = loadProgress();
  const poseNow = { x: SPAWN.x, z: SPAWN.z, ry: 0 };
  const roster = new Map<string, Profile & { seen: number }>();

  const publishRoster = () => {
    const now = Date.now();
    for (const [id, person] of roster) {
      if (now - person.seen > 8000) roster.delete(id);
    }
    handlers.onRoster([profile, ...roster.values()]);
  };

  const acceptProgress = (incoming: IslandProgress, echo: boolean) => {
    const merged = mergeProgress(handlers.order, [progress, normalizeProgress(incoming)]);
    if (signature(merged) === signature(progress)) return;
    progress = merged;
    saveProgress(merged);
    handlers.onProgress(merged);
    if (echo && signature(merged) !== signature(normalizeProgress(incoming))) {
      channel.postMessage({ type: "progress", payload: merged });
    }
  };

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as {
      type: string;
      payload: Pose & Profile & { progress?: IslandProgress; text?: string; t?: number };
    };
    const payload = data?.payload;
    if (!payload?.id || payload.id === profile.id) return;
    if (data.type === "pose" || data.type === "hello") {
      handlers.onPose(payload);
      roster.set(payload.id, { ...payload, seen: Date.now() });
      publishRoster();
      if (data.type === "hello") {
        if (payload.progress) acceptProgress(payload.progress, true);
        channel.postMessage({ type: "pose", payload: { ...profile, ...poseNow } });
        channel.postMessage({ type: "progress", payload: progress });
      }
    } else if (data.type === "chat" && payload.text) {
      handlers.onChat({
        id: payload.id,
        name: payload.name,
        text: payload.text,
        t: payload.t ?? Date.now(),
      });
    } else if (data.type === "progress") {
      acceptProgress(payload as unknown as IslandProgress, true);
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

  channel.postMessage({ type: "hello", payload: { ...profile, ...poseNow, progress } });
  publishRoster();

  return {
    mode: "local",
    sendPose(pose) {
      poseNow.x = pose.x;
      poseNow.z = pose.z;
      poseNow.ry = pose.ry;
      channel.postMessage({ type: "pose", payload: { ...profile, ...pose } });
    },
    sendChat(text) {
      const message: ChatMessage = { id: profile.id, name: profile.name, text, t: Date.now() };
      handlers.onChat(message);
      channel.postMessage({ type: "chat", payload: message });
    },
    sendProgress(state) {
      acceptProgress(state, false);
      channel.postMessage({ type: "progress", payload: progress });
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
