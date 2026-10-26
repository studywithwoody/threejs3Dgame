"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IslandStage from "@/components/IslandStage";
import { authClient } from "@/lib/auth-client";
import { AVATAR_COLORS, cleanNickname, colorFromId, displayName } from "@/lib/profile";
import { stationOrderRef, uiBridge } from "@/game/bridge";
import { connectIsland, type IslandConnection, type NetMode } from "@/game/net";
import type { GameApi } from "@/game/mount";
import { setStick } from "@/game/mount";
import { type PublicQuestion } from "@/game/questions";
import {
  canSolve,
  loadProgress,
  mergeProgress,
  nextStation,
  normalizeProgress,
  saveProgress,
  signature,
  stationOrder,
  STORAGE_KEY,
} from "@/game/progress";
import { PLACES } from "@/game/terrain";
import { emptyProgress, type ChatMessage, type IslandProgress, type Profile } from "@/game/types";

type Status = {
  authConfigured: boolean;
  missing: string[];
  databaseConfigured: boolean;
  realtimeConfigured: boolean;
  urlConfigured: boolean;
};

type AnswerPayload = {
  correct?: boolean;
  reason?: string;
  explain?: string;
  progress?: IslandProgress;
  persisted?: boolean;
};

type SessionUser = {
  id: string;
  name: string;
  image?: string | null;
  nickname?: string | null;
  avatarColor?: string | null;
};

const GUEST_KEY = "dawn-isle-guest";

export function Shell() {
  const apiRef = useRef<GameApi | null>(null);
  const netRef = useRef<IslandConnection | null>(null);
  const generation = useRef(0);
  const nearbyRef = useRef<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const meRef = useRef<Profile | null>(null);
  const progressRef = useRef<IslandProgress>(emptyProgress());
  const orderRef = useRef<string[]>([]);
  const lastChat = useRef(0);

  const [status, setStatus] = useState<Status | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [questionError, setQuestionError] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionPending, setSessionPending] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<IslandProgress>(emptyProgress);
  const [roster, setRoster] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<NetMode | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [nearby, setNearby] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<"idle" | "wrong" | "correct">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [quizNote, setQuizNote] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestColor, setGuestColor] = useState<string>(AVATAR_COLORS[0]);
  const [nickDraft, setNickDraft] = useState("");
  const [colorDraft, setColorDraft] = useState<string>(AVATAR_COLORS[0]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const order = useMemo(() => (questions ? stationOrder(questions) : []), [questions]);
  orderRef.current = order;
  stationOrderRef.ids = order;
  progressRef.current = progress;
  meRef.current = me;
  nearbyRef.current = nearby;
  activeRef.current = activeId;

  const onSession = useCallback((next: SessionUser | null, pending: boolean) => {
    setUser(next);
    setSessionPending(pending);
  }, []);

  useEffect(() => {
    uiBridge.onNearby = (id) => setNearby((prev) => (prev === id ? prev : id));
    uiBridge.onInteract = () => {
      if (activeRef.current) return;
      const id = nearbyRef.current;
      if (id) openStation(id);
    };
    uiBridge.onPose = (pose) => netRef.current?.sendPose(pose);
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(GUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { name?: string; color?: string };
        if (parsed.name) setGuestName(parsed.name);
        if (parsed.color) setGuestColor(parsed.color);
      } catch {
        /* ignore broken guest cache */
      }
    }
    setProgress(loadProgress());
    const narrow = window.matchMedia("(max-width: 860px)").matches;
    if (narrow) setChatOpen(false);

    fetch("/api/status")
      .then((response) => response.json())
      .then((data: Status) => setStatus(data))
      .catch(() =>
        setStatus({
          authConfigured: false,
          missing: ["無法讀取 /api/status"],
          databaseConfigured: false,
          realtimeConfigured: false,
          urlConfigured: false,
        }),
      );

    fetch("/api/questions", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { stations?: PublicQuestion[] }) => setQuestions(data.stations ?? []))
      .catch(() => setQuestionError(true));

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setProgress(loadProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    apiRef.current?.applyProgress(progress);
  }, [progress]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, chatOpen]);

  const leaveGame = useCallback(() => {
    generation.current += 1;
    netRef.current?.close();
    netRef.current = null;
    apiRef.current?.leave();
    setMe(null);
    setRoster([]);
    setMode(null);
    setActiveId(null);
  }, []);

  const enterGame = useCallback(
    async (profile: Profile) => {
      const ticket = ++generation.current;
      netRef.current?.close();
      setMe(profile);
      setBanner(null);
      setMessages([]);
      apiRef.current?.enter(profile);
      let current = progressRef.current;
      if (status?.databaseConfigured) {
        const remote = await fetchSharedProgress();
        if (remote && ticket === generation.current) {
          const merged = mergeProgress(orderRef.current, [emptyProgress(), remote]);
          if (signature(merged) !== signature(current)) {
            current = merged;
            saveProgress(merged);
            setProgress(merged);
          }
        }
      }
      if (ticket !== generation.current) return;
      progressRef.current = current;
      apiRef.current?.applyProgress(current);
      const conn = await connectIsland(
        {
          profile,
          order: orderRef.current,
          onProgress: (incoming) => {
            setProgress((prev) => {
              const merged = mergeProgress(orderRef.current, [prev, incoming]);
              if (signature(merged) === signature(prev)) return prev;
              saveProgress(merged);
              return merged;
            });
          },
          onChat: (message) => {
            setMessages((prev) => [...prev.slice(-79), message]);
            apiRef.current?.showBubble(message.id, message.text);
          },
          onPose: (pose) => apiRef.current?.upsertRemote(pose),
          onLeave: (id) => apiRef.current?.removeRemote(id),
          onRoster: (people) => setRoster(people),
        },
        { databaseConfigured: status?.databaseConfigured },
      );
      if (ticket !== generation.current) {
        conn.close();
        return;
      }
      netRef.current = conn;
      setMode(conn.mode);
      setBanner(conn.warning ?? null);
      conn.sendProgress(current);
    },
    [status?.databaseConfigured],
  );

  useEffect(() => {
    if (!me || !status?.databaseConfigured) return;
    let stop = false;
    const pull = async () => {
      const remote = await fetchSharedProgress();
      if (stop || !remote) return;
      const merged = mergeProgress(orderRef.current, [emptyProgress(), remote]);
      if (signature(merged) === signature(progressRef.current)) return;
      saveProgress(merged);
      setProgress(merged);
      netRef.current?.sendProgress(merged);
    };
    const timer = window.setInterval(() => void pull(), 10000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [me, status?.databaseConfigured]);

  useEffect(() => {
    if (!status?.authConfigured || !questions) return;
    if (!user) {
      if (sessionPending) return;
      if (meRef.current) leaveGame();
      return;
    }
    const profile = profileFromUser(user);
    if (!meRef.current || meRef.current.id !== profile.id) {
      void enterGame(profile);
      return;
    }
    setMe((prev) => (sameProfile(prev, profile) ? prev : profile));
    apiRef.current?.setProfile(profile);
    netRef.current?.updateProfile(profile);
  }, [user, questions, status?.authConfigured, sessionPending, enterGame, leaveGame]);

  function openStation(id: string) {
    if (!meRef.current || !questions) return;
    setActiveId(id);
    setPicked(null);
    setVerdict("idle");
    setQuizNote(null);
    setSubmitting(false);
  }

  async function choose(index: number) {
    if (!activeId || !me || verdict === "correct" || submitting) return;
    const question = questions?.find((item) => item.id === activeId);
    if (!question) return;
    if (!canSolve(order, progress.solved, question.id)) return;
    setPicked(index);
    setSubmitting(true);
    setQuizNote(null);
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stationId: question.id,
          choice: index,
          playerId: me.id,
          playerName: me.name,
          progress: progressRef.current,
        }),
      });
      const data = (await response.json()) as AnswerPayload;
      if (!response.ok || !data.progress) {
        setQuizNote(response.status === 401 ? "請先用 Google 登入再作答。" : "沒有送出，請再試一次。");
        return;
      }
      const merged = mergeProgress(
        order,
        data.persisted
          ? [emptyProgress(), normalizeProgress(data.progress)]
          : [progressRef.current, normalizeProgress(data.progress)],
      );
      if (signature(merged) !== signature(progressRef.current)) {
        saveProgress(merged);
        progressRef.current = merged;
        setProgress(merged);
        netRef.current?.sendProgress(merged);
      }
      if (data.correct) {
        setVerdict("correct");
        return;
      }
      if (data.reason === "locked" || data.reason === "solved") return;
      setVerdict("wrong");
    } catch {
      setQuizNote("沒有送出，請再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProfile() {
    if (!me) return;
    const nickname = cleanNickname(nickDraft);
    setProfileError(null);
    if (!status?.authConfigured || me.id === guestId()) {
      const next = { ...me, name: nickname || me.name, color: colorDraft };
      window.localStorage.setItem(GUEST_KEY, JSON.stringify({ name: next.name, color: next.color }));
      setMe(next);
      apiRef.current?.setProfile(next);
      netRef.current?.updateProfile(next);
      setProfileOpen(false);
      return;
    }
    const result = await authClient.updateUser({
      nickname,
      avatarColor: colorDraft,
    });
    if (result.error) {
      setProfileError("暱稱沒有存進去，請再試一次。");
      return;
    }
    setProfileOpen(false);
  }

  async function signIn() {
    setSigningIn(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (result.error) {
      setSigningIn(false);
      setBanner(result.error.message || "Google 登入沒有完成。");
    }
  }

  function sendChat() {
    const text = draft.replace(/\s+/g, " ").trim().slice(0, 180);
    if (!text || !me) return;
    const now = Date.now();
    if (now - lastChat.current < 450) return;
    lastChat.current = now;
    netRef.current?.sendChat(text);
    setDraft("");
  }

  function startGuest() {
    const name = cleanNickname(guestName) || "訪客";
    const id = guestId();
    window.localStorage.setItem(GUEST_KEY, JSON.stringify({ name, color: guestColor }));
    void enterGame({ id, name, color: guestColor, image: null });
  }

  const active = questions?.find((item) => item.id === activeId) ?? null;
  const place = PLACES.find((item) => item.id === activeId);
  const unlocked = active ? progress.solved.includes(active.id) : false;
  const available = active ? canSolve(order, progress.solved, active.id) : false;
  const upcoming = nextStation(order, progress.solved);
  const score = me ? progress.scores[me.id] ?? 0 : 0;
  const people = dedupePeople(me, roster);
  const leaders = Object.entries(progress.scores)
    .map(([id, points]) => ({
      id,
      points,
      name: progress.names[id] || people.find((person) => person.id === id)?.name || "同學",
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 6);

  const showGate = !me && (status?.authConfigured ? !user : true);

  return (
    <main className="app">
      <IslandStage api={apiRef} />
      <div className="vignette" />
      {status?.authConfigured ? <SessionWatch onSession={onSession} /> : null}

      <header className="brand">
        <p className="eyebrow">DAWN ISLE</p>
        <h1>曙島</h1>
        <p>五座物理站，全班一起點亮。</p>
      </header>

      <section className="progress-pill" aria-label="島的進度">
        <span>
          <em>{progress.solved.length}</em> / {questions?.length ?? 5}
        </span>
        <span>{score} 分</span>
        {mode ? <span className="mode">{mode === "remote" ? "全班連線" : "本機分頁"}</span> : null}
      </section>

      {banner ? <p className="banner">{banner}</p> : null}
      {questions && progress.solved.length === questions.length && questions.length > 0 ? (
        <p className="ribbon">燈塔亮了。曙島的五個徽章都收集齊了。</p>
      ) : null}

      {me ? (
        <aside className="side">
          <button className="who" type="button" onClick={() => openProfile(me)}>
            {me.image ? <img src={me.image} alt="" referrerPolicy="no-referrer" /> : <i style={{ background: me.color }} />}
            <span>
              <strong>{me.name}</strong>
              <small>改暱稱與顏色</small>
            </span>
          </button>
          <div className="badges" aria-label="徽章">
            {(questions ?? [])
              .filter((question) => progress.solved.includes(question.id))
              .map((question) => (
                <span key={question.id}>{question.badge}</span>
              ))}
          </div>
          <h2>島上的人</h2>
          <ul className="roster">
            {people.map((person) => (
              <li key={person.id}>
                <i style={{ background: person.color }} />
                {person.name}
                <b>{progress.scores[person.id] ?? 0}</b>
              </li>
            ))}
          </ul>
          {leaders.length > 0 ? (
            <>
              <h2>分數</h2>
              <ol className="leaders">
                {leaders.map((row) => (
                  <li key={row.id}>
                    <span>{row.name}</span>
                    <b>{row.points}</b>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          {status?.authConfigured ? (
            <button className="texty" type="button" onClick={() => void authClient.signOut()}>
              登出
            </button>
          ) : (
            <button className="texty" type="button" onClick={leaveGame}>
              離開島嶼
            </button>
          )}
        </aside>
      ) : null}

      {me && nearby ? (
        <button className="interact" type="button" onClick={() => openStation(nearby)}>
          調查{PLACES.find((item) => item.id === nearby)?.label}
          <small>E</small>
        </button>
      ) : null}

      {me ? <Joystick /> : null}

      {me ? (
        <section className={`chat ${chatOpen ? "open" : ""}`}>
          <button className="chat-toggle" type="button" onClick={() => setChatOpen((open) => !open)}>
            聊天 {messages.length > 0 ? messages.length : ""}
          </button>
          {chatOpen ? (
            <>
              <div className="log" ref={logRef} aria-live="polite">
                {messages.length === 0 ? <p className="muted">跟島上的同學說說話。</p> : null}
                {messages.map((message, index) => (
                  <p key={`${message.t}-${message.id}-${index}`}>
                    <b>{message.name}</b> {message.text}
                  </p>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendChat();
                }}
              >
                <input
                  value={draft}
                  maxLength={180}
                  placeholder="輸入訊息"
                  aria-label="聊天訊息"
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => {
                    uiBridge.typing = true;
                  }}
                  onBlur={() => {
                    uiBridge.typing = false;
                  }}
                />
                <button type="submit">送出</button>
              </form>
            </>
          ) : null}
        </section>
      ) : null}

      {showGate ? (
        <div className="gate">
          <section className="card" role="dialog" aria-labelledby="gate-title">
            <p className="eyebrow">HELLO</p>
            <h2 id="gate-title">登上曙島</h2>
            {!status || !questions ? (
              <p>正在把島準備好…</p>
            ) : questionError || questions.length === 0 ? (
              <p>題目檔讀取失敗。請確認 <code>data/questions.json</code>。</p>
            ) : status.authConfigured ? (
              <>
                <p>用 Google 帳號進來。島上會顯示你的名稱和頭像，暱稱可以再改。信件地址不會出現在畫面上。</p>
                {sessionPending ? <p>正在確認登入狀態…</p> : null}
                <button className="primary" type="button" onClick={() => void signIn()} disabled={signingIn}>
                  {signingIn ? "前往 Google…" : "以 Google 帳號進入"}
                </button>
                {!status.urlConfigured ? (
                  <p className="note">正式環境請設定 BETTER_AUTH_URL。Preview 部署可以留空。</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="warn">驗證尚未設定。這個畫面是訪客模式，方便先試玩；接上 Google 之後，學生會改以帳號進入。</p>
                <ul className="missing">
                  {status.missing.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <label>
                  顯示名稱
                  <input
                    value={guestName}
                    maxLength={16}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="例如：林同學"
                  />
                </label>
                <ColorRow value={guestColor} onChange={setGuestColor} />
                <button className="primary" type="button" onClick={startGuest}>
                  以訪客進入
                </button>
                <p className="note">同一個瀏覽器的分頁看得到彼此。跨裝置的即時位置與聊天之後才會接上。</p>
              </>
            )}
          </section>
        </div>
      ) : null}

      {profileOpen && me ? (
        <div className="gate">
          <section className="card" role="dialog" aria-labelledby="profile-title">
            <p className="eyebrow">PROFILE</p>
            <h2 id="profile-title">島上的名字</h2>
            <p>Google 名稱是「{user?.name || me.name}」。暱稱留白就會改回那個名稱。</p>
            <label>
              暱稱
              <input
                value={nickDraft}
                maxLength={16}
                onChange={(event) => setNickDraft(event.target.value)}
                onFocus={() => {
                  uiBridge.typing = true;
                }}
                onBlur={() => {
                  uiBridge.typing = false;
                }}
              />
            </label>
            <ColorRow value={colorDraft} onChange={setColorDraft} />
            {profileError ? <p className="warn">{profileError}</p> : null}
            <div className="row">
              <button type="button" onClick={() => setProfileOpen(false)}>
                取消
              </button>
              <button className="primary" type="button" onClick={() => void saveProfile()}>
                儲存
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {active && place ? (
        <div className="gate">
          <section className="card quiz" role="dialog" aria-labelledby="quiz-title">
            <p className="eyebrow">STAGE {String(active.stage).padStart(2, "0")}</p>
            <h2 id="quiz-title">{active.title}</h2>
            {unlocked ? (
              <>
                <p>{active.explain}</p>
                <p className="badge-line">已獲得 {active.badge}</p>
              </>
            ) : available ? (
              <>
                <p>{active.prompt}</p>
                <div className="choices">
                  {active.choices.map((choice, index) => (
                    <button
                      key={`${active.id}-${index}`}
                      type="button"
                      className={choiceClass(index, picked, verdict)}
                      onClick={() => void choose(index)}
                      disabled={verdict === "correct" || submitting}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                {verdict === "wrong" ? <p className="warn">再想想，這次還沒對。</p> : null}
                {quizNote ? <p className="warn">{quizNote}</p> : null}
                {verdict === "correct" ? (
                  <>
                    <p>{active.explain}</p>
                    <p className="badge-line">全班得到 {active.badge}，你 +10 分。</p>
                  </>
                ) : null}
              </>
            ) : (
              <p>
                這一站還沒開放。先到
                {labelOf(upcoming)}
                把上一題解開，燈才會繼續往前亮。
              </p>
            )}
            <button type="button" onClick={() => setActiveId(null)}>
              {verdict === "correct" ? "繼續探索" : "離開"}
            </button>
          </section>
        </div>
      ) : null}

      <p className="hint">WASD 移動 · 拖曳旋轉鏡頭 · 靠近站點按 E</p>
    </main>
  );

  function openProfile(profile: Profile) {
    setNickDraft(user?.nickname ?? "");
    setColorDraft(profile.color);
    setProfileError(null);
    setProfileOpen(true);
  }
}

function SessionWatch({
  onSession,
}: {
  onSession: (user: SessionUser | null, pending: boolean) => void;
}) {
  const session = authClient.useSession();
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;
  useEffect(() => {
    const current = session.data?.user;
    onSessionRef.current(
      current
        ? {
            id: current.id,
            name: current.name,
            image: current.image,
            nickname: current.nickname,
            avatarColor: current.avatarColor,
          }
        : null,
      session.isPending,
    );
  }, [session.data, session.isPending]);
  return null;
}

function Joystick() {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    let pointer: number | null = null;

    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const length = Math.hypot(dx, dy) || 1;
      const scale = Math.min(radius - 16, length);
      dx = (dx / length) * scale;
      dy = (dy / length) * scale;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      setStick(dx / radius, -(dy / radius));
    };
    const end = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      knob.style.transform = "translate(0, 0)";
      setStick(0, 0);
    };
    const start = (event: PointerEvent) => {
      pointer = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      move(event);
    };
    pad.addEventListener("pointerdown", start);
    pad.addEventListener("pointermove", move);
    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
    return () => {
      pad.removeEventListener("pointerdown", start);
      pad.removeEventListener("pointermove", move);
      pad.removeEventListener("pointerup", end);
      pad.removeEventListener("pointercancel", end);
      setStick(0, 0);
    };
  }, []);

  return (
    <div className="joystick" ref={padRef} aria-hidden="true">
      <i ref={knobRef} />
    </div>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="colors" role="listbox" aria-label="角色顏色">
      {AVATAR_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          className={color === value ? "on" : ""}
          style={{ background: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

function profileFromUser(user: SessionUser): Profile {
  return {
    id: user.id,
    name: displayName(user),
    image: user.image,
    color: user.avatarColor || colorFromId(user.id),
  };
}

function sameProfile(prev: Profile | null, next: Profile) {
  return !!prev && prev.id === next.id && prev.name === next.name && prev.color === next.color && prev.image === next.image;
}

function guestId() {
  const key = "dawn-isle-guest-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = `guest-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, id);
  return id;
}

function dedupePeople(me: Profile | null, roster: Profile[]) {
  const map = new Map<string, Profile>();
  if (me) map.set(me.id, me);
  for (const person of roster) map.set(person.id, person);
  return [...map.values()];
}

function labelOf(id: string | null) {
  return PLACES.find((place) => place.id === id)?.label ?? "第一站";
}

function choiceClass(index: number, picked: number | null, verdict: "idle" | "wrong" | "correct") {
  if (picked !== index) return "";
  if (verdict === "correct") return "right";
  if (verdict === "wrong") return "wrong";
  return "";
}

async function fetchSharedProgress() {
  try {
    const response = await fetch("/api/progress", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { progress?: IslandProgress; persisted?: boolean };
    if (!data.persisted || !data.progress) return null;
    return normalizeProgress(data.progress);
  } catch {
    return null;
  }
}
