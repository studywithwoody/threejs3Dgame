import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProgress, mergeProgress, normalizeProgress, saveProgress, signature } from "@/game/progress";
import { SPAWN } from "@/game/terrain";
import { emptyProgress, type ChatMessage, type IslandProgress, type Pose, type Profile } from "@/game/types";

const CHANNEL = "dawn-isle";

export type NetMode = "supabase" | "local";

export type IslandConnection = {
  mode: NetMode;
  warning?: string;
  sendPose: (pose: Pose) => void;
  sendChat: (text: string) => void;
  sendProgress: (state: IslandProgress) => void;
  updateProfile: (profile: Profile) => void;
  close: () => void;
};

type Handlers = {
  profile: Profile;
  order: string[];
  onProgress: (state: IslandProgress) => void;
  onChat: (message: ChatMessage) => void;
  onPose: (pose: Pose & Profile) => void;
  onLeave: (id: string) => void;
  onRoster: (people: Profile[]) => void;
};

export function realtimeConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export async function connectIsland(handlers: Handlers): Promise<IslandConnection> {
  if (realtimeConfigured()) {
    try {
      return await connectSupabase(handlers);
    } catch (error) {
      console.warn("[dawn-isle] Supabase realtime failed, using local tabs", error);
      const local = connectLocal(handlers);
      return { ...local, warning: "Supabase 即時連線失敗，已改成同一個瀏覽器分頁之間的連線。" };
    }
  }
  const local = connectLocal(handlers);
  return {
    ...local,
    warning: realtimeConfigured()
      ? undefined
      : "尚未設定 Supabase。現在只有同一個瀏覽器裡的分頁看得到彼此。",
  };
}

async function connectSupabase(handlers: Handlers): Promise<IslandConnection> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 12 } },
  });

  const remoteProgress = await pullProgress(supabase, handlers.order);
  let progress = mergeProgress(handlers.order, [loadProgress(), remoteProgress]);
  if (signature(progress) !== signature(loadProgress())) handlers.onProgress(progress);

  let profile = handlers.profile;
  let closed = false;
  let dbDisabled = false;
  let lastTrack = 0;
  const poseNow = { x: SPAWN.x, z: SPAWN.z, ry: 0 };
  const roster = new Map<string, Profile>();

  const channel = supabase.channel(CHANNEL, {
    config: {
      private: false,
      broadcast: { self: false },
      presence: { key: profile.id },
    },
  });

  const publishProgress = (state: IslandProgress) => {
    progress = state;
    saveProgress(state);
    if (!dbDisabled) void pushProgress(supabase, state).catch(() => {
      dbDisabled = true;
    });
    void channel.send({ type: "broadcast", event: "progress", payload: state });
  };

  const acceptProgress = (incoming: IslandProgress) => {
    const merged = mergeProgress(handlers.order, [progress, normalizeProgress(incoming)]);
    if (signature(merged) === signature(progress)) return;
    const echo = signature(merged) !== signature(normalizeProgress(incoming));
    progress = merged;
    saveProgress(merged);
    handlers.onProgress(merged);
    if (echo) publishProgress(merged);
  };

  channel
    .on("broadcast", { event: "pose" }, ({ payload }) => {
      const pose = payload as Pose & Profile;
      if (!pose?.id || pose.id === profile.id) return;
      handlers.onPose(pose);
      remember(roster, pose, handlers);
    })
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      const message = payload as ChatMessage;
      if (!message?.text || message.id === profile.id) return;
      handlers.onChat(message);
    })
    .on("broadcast", { event: "progress" }, ({ payload }) => acceptProgress(payload as IslandProgress))
    .on("broadcast", { event: "hello" }, ({ payload }) => {
      const hello = payload as Pose & Profile & { progress?: IslandProgress };
      if (!hello?.id || hello.id === profile.id) return;
      if (hello.progress) acceptProgress(hello.progress);
      handlers.onPose(hello);
      remember(roster, hello, handlers);
      void channel.send({
        type: "broadcast",
        event: "pose",
        payload: { ...profile, ...poseNow },
      });
      void channel.send({ type: "broadcast", event: "progress", payload: progress });
    })
    .on("presence", { event: "sync" }, () => {
      roster.clear();
      const state = channel.presenceState() as Record<string, Profile[]>;
      for (const metas of Object.values(state)) {
        const meta = metas?.[0];
        if (meta?.id) roster.set(meta.id, meta);
      }
      handlers.onRoster([...roster.values()]);
    });

  const subscribed = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("subscribe timeout")), 8000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        window.clearTimeout(timer);
        reject(new Error(status));
      }
    });
  });

  try {
    await subscribed;
  } catch (error) {
    void supabase.removeChannel(channel);
    throw error;
  }
  if (closed) {
    void supabase.removeChannel(channel);
    throw new Error("closed");
  }

  const track = () => {
    const now = Date.now();
    if (now - lastTrack < 7000) return;
    lastTrack = now;
    void channel.track({
      id: profile.id,
      name: profile.name,
      image: profile.image ?? null,
      color: profile.color,
    });
  };
  track();
  void channel.send({
    type: "broadcast",
    event: "hello",
    payload: { ...profile, ...poseNow, progress },
  });

  return {
    mode: "supabase",
    sendPose(pose) {
      poseNow.x = pose.x;
      poseNow.z = pose.z;
      poseNow.ry = pose.ry;
      void channel.send({ type: "broadcast", event: "pose", payload: { ...profile, ...pose } });
    },
    sendChat(text) {
      const message: ChatMessage = { id: profile.id, name: profile.name, text, t: Date.now() };
      handlers.onChat(message);
      void channel.send({ type: "broadcast", event: "chat", payload: message });
    },
    sendProgress(state) {
      acceptProgress(state);
      publishProgress(progress);
    },
    updateProfile(next) {
      profile = next;
      window.setTimeout(track, 7000);
    },
    close() {
      closed = true;
      void channel.untrack();
      void supabase.removeChannel(channel);
    },
  };
}


async function pullProgress(supabase: SupabaseClient, order: string[]) {
  const { data, error } = await supabase
    .from("island_progress")
    .select("solved, scores, names")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return emptyProgress();
  return mergeProgress(order, [emptyProgress(), normalizeProgress(data)]);
}

async function pushProgress(supabase: SupabaseClient, state: IslandProgress) {
  const { error } = await supabase.from("island_progress").upsert({
    id: 1,
    solved: state.solved,
    scores: state.scores,
    names: state.names,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function connectLocal(handlers: Handlers): IslandConnection {
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
    const data = event.data as { type: string; payload: Pose & Profile & { progress?: IslandProgress; text?: string; t?: number } };
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
      handlers.onChat({ id: payload.id, name: payload.name, text: payload.text, t: payload.t ?? Date.now() });
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

function remember(roster: Map<string, Profile>, profile: Profile, handlers: Handlers) {
  roster.set(profile.id, {
    id: profile.id,
    name: profile.name,
    image: profile.image,
    color: profile.color,
  });
  handlers.onRoster([...roster.values()]);
}
