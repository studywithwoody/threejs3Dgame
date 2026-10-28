"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IslandStage from "@/components/IslandStage";
import CameraControls from "@/components/CameraControls";
import Notifications, { type IslandNotification } from "@/components/Notifications";
import PetRoom3D from "@/components/PetRoom3D";
import CharacterPreview3D from "@/components/CharacterPreview3D";
import { authClient } from "@/lib/auth-client";
import { AVATAR_COLORS, cleanNickname, colorFromId, displayName } from "@/lib/profile";
import { uiBridge } from "@/game/bridge";
import { connectIsland, type IslandConnection, type NetMode } from "@/game/net";
import type { GameApi } from "@/game/mount";
import { setStick } from "@/game/mount";
import { BLOCKY_MODELS } from "@/game/avatar";
import {
  buyEgg,
  discardPet,
  feedPet,
  hatchEgg,
  MAX_PETS,
  EGG_COST,
  loadProgress,
  normalizeProgress,
  saveProgress,
  signature,
  STORAGE_KEY,
} from "@/game/progress";
import { emptyProgress, type IslandProgress, type PetSpecies, type PetState, type Profile } from "@/game/types";
import { petStatus } from "@/game/progress";
import type { SceneObjectRecord } from "@/game/platformerKit/sceneConfig";

type Status = {
  authConfigured: boolean;
  missing: string[];
  databaseConfigured: boolean;
  realtimeConfigured: boolean;
  urlConfigured: boolean;
};

type SessionUser = {
  id: string;
  name: string;
  image?: string | null;
  nickname?: string | null;
  avatarColor?: string | null;
  avatarModel?: string | null;
  role?: string | null;
};

type InfoCardKey = "progress" | "side";

function InfoCardToggle({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="info-card-toggle"
      type="button"
      aria-label={`${collapsed ? "展開" : "最小化"}${label}`}
      aria-expanded={!collapsed}
      title={`${collapsed ? "展開" : "最小化"}${label}`}
      onClick={onToggle}
    >
      {collapsed ? "+" : "−"}
    </button>
  );
}

const GUEST_KEY = "dawn-isle-guest";

export function Shell({ initialSceneObjects }: { initialSceneObjects: SceneObjectRecord[] }) {
  const apiRef = useRef<GameApi | null>(null);
  const netRef = useRef<IslandConnection | null>(null);
  const generation = useRef(0);
  const meRef = useRef<Profile | null>(null);
  const progressRef = useRef<IslandProgress>(emptyProgress());

  const [status, setStatus] = useState<Status | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionPending, setSessionPending] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<IslandProgress>(emptyProgress);
  const [roster, setRoster] = useState<Profile[]>([]);
  const [mode, setMode] = useState<NetMode | null>(null);
  const [notifications, setNotifications] = useState<IslandNotification[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestColor, setGuestColor] = useState<string>(AVATAR_COLORS[0]);
  const [guestAvatar, setGuestAvatar] = useState<string>(BLOCKY_MODELS[0].id);
  const [nickDraft, setNickDraft] = useState("");
  const [colorDraft, setColorDraft] = useState<string>(AVATAR_COLORS[0]);
  const [avatarDraft, setAvatarDraft] = useState<string>(BLOCKY_MODELS[0].id);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarSetupOpen, setAvatarSetupOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [petManagerOpen, setPetManagerOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [petNote, setPetNote] = useState<string | null>(null);
  const [collapsedInfo, setCollapsedInfo] = useState<Partial<Record<InfoCardKey, boolean>>>({});
  const notificationId = useRef(0);

  const toggleInfoCard = (key: InfoCardKey) => {
    setCollapsedInfo((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const addNotification = useCallback((message: string | null | undefined) => {
    if (!message) return;
    notificationId.current += 1;
    setNotifications((previous) => [
      ...previous,
      { id: `notification-${notificationId.current}`, message },
    ]);
  }, []);

  progressRef.current = progress;
  meRef.current = me;

  const onSession = useCallback((next: SessionUser | null, pending: boolean) => {
    setUser(next);
    setSessionPending(pending);
  }, []);

  useEffect(() => {
    uiBridge.onNearby = () => {};
    uiBridge.onInteract = () => {};
    uiBridge.onCoinCollected = () => {
      const player = meRef.current;
      if (!player) return;
      setProgress((previous) => {
        const next = {
          ...previous,
          scores: { ...previous.scores, [player.id]: (previous.scores[player.id] ?? 0) + 10 },
          names: { ...previous.names, [player.id]: player.name },
        };
        progressRef.current = next;
        saveProgress(next);
        netRef.current?.sendProgress(next);
        return next;
      });
      addNotification("金幣 +10 分");
    };
    uiBridge.onPose = (pose) => netRef.current?.sendPose(pose);
    return () => {
      uiBridge.onCoinCollected = () => {};
    };
  }, [addNotification]);

  useEffect(() => {
    const stored = window.localStorage.getItem(GUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { name?: string; color?: string; avatarModel?: string };
        if (parsed.name) setGuestName(parsed.name);
        if (parsed.color) setGuestColor(parsed.color);
        if (parsed.avatarModel && BLOCKY_MODELS.some((item) => item.id === parsed.avatarModel)) setGuestAvatar(parsed.avatarModel);
      } catch {
        /* ignore broken guest cache */
      }
    }
    setProgress(loadProgress());

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
    if (!me) return;
    const timer = window.setInterval(() => {
      setProgress((previous) => {
        const pets = previous.pets[me.id] ?? [];
        const nextPets = pets.map((pet) => ({ ...pet, status: petStatus(pet.lastFedAt) }));
        if (nextPets.every((pet, index) => pet.status === pets[index]?.status)) return previous;
        const next = { ...previous, pets: { ...previous.pets, [me.id]: nextPets } };
        progressRef.current = next;
        saveProgress(next);
        return next;
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [me]);
  const leaveGame = useCallback(() => {
    generation.current += 1;
    netRef.current?.close();
    netRef.current = null;
    apiRef.current?.leave();
    setMe(null);
    setRoster([]);
    setMode(null);
  }, []);

  const enterGame = useCallback(
    async (profile: Profile) => {
      const ticket = ++generation.current;
      netRef.current?.close();
      setMe(profile);
      setAvatarSetupOpen(!profile.avatarModel);
      setAvatarDraft(profile.avatarModel ?? BLOCKY_MODELS[0].id);
      setProfileOpen(!profile.avatarModel);
      setNotifications([]);
      apiRef.current?.enter(profile);
      let current = status?.databaseConfigured ? emptyProgress() : progressRef.current;
      if (status?.databaseConfigured) {
        const remote = await fetchUserProgress();
        if (remote && ticket === generation.current) {
          current = remote;
          saveProgress(remote);
          setProgress(remote);
        }
      }
      if (ticket !== generation.current) return;
      progressRef.current = current;
      apiRef.current?.applyProgress(current);
      const conn = await connectIsland(
        {
          profile,
          order: [],
          onProgress: () => {},
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
      conn.sendProgress(current);
    },
    [status?.databaseConfigured],
  );

  useEffect(() => {
    if (!me || !status?.databaseConfigured) return;
    let stop = false;
    const pull = async () => {
      const remote = await fetchUserProgress();
      if (stop || !remote) return;
      if (signature(remote) === signature(progressRef.current)) return;
      saveProgress(remote);
      setProgress(remote);
    };
    const timer = window.setInterval(() => void pull(), 10000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [me, status?.databaseConfigured]);

  useEffect(() => {
    if (!status?.authConfigured) return;
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
  }, [user, status?.authConfigured, sessionPending, enterGame, leaveGame]);

  async function updatePetProgress(action: string, local: IslandProgress, extra: Record<string, string> = {}) {
    if (!me) return;
    try {
      const response = await fetch("/api/pet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, playerId: me.id, progress: progressRef.current, ...extra }),
      });
      if (!response.ok) throw new Error("pet_action_failed");
      const data = (await response.json()) as { progress?: IslandProgress };
      const next = data.progress ?? local;
      saveProgress(next);
      progressRef.current = next;
      setProgress(next);
      netRef.current?.sendProgress(next);
    } catch {
      throw new Error("pet_action_failed");
    }
  }

  async function feedMyPet() {
    if (!me) return;
    setPetNote(null);
    const pets = progressRef.current.pets[me.id] ?? [];
    const pet = pets.find((candidate) => candidate.id === selectedPetId) ?? pets[0];
    const local = pet ? feedPet(progressRef.current, me.id, pet.id) : null;
    if (!local) {
      setPetNote(pet?.status === "dead" ? "這隻寵物已經離世了，請到管理頁移除牠。" : "分數不足，答題賺到 5 分就能買飼料。每天餵一次就好！");
      return;
    }
    try {
      await updatePetProgress("feed", local, { petId: pet?.id ?? "" });
      setPetNote("飼料買好了！牠恢復元氣，今天也要記得回來看看牠。");
    } catch {
      setPetNote("寵物店暫時沒有回應，請再試一次。");
    }
  }

  async function buyPetEgg() {
    if (!me) return;
    const local = buyEgg(progressRef.current, me.id);
    if (!local) {
      setPetNote(`購買蛋需要 ${EGG_COST} 分，答題後再回來吧！`);
      return;
    }
    try {
      await updatePetProgress("buyEgg", local);
      setPetNote("你買到一顆神秘蛋了！到寵物管理頁孵化牠吧。");
    } catch {
      setPetNote("寵物店暫時沒有回應，請再試一次。");
    }
  }

  async function hatchMyEgg(eggId: string) {
    if (!me) return;
    const pets = progressRef.current.pets[me.id] ?? [];
    if (pets.length >= MAX_PETS) {
      setPetNote(`寵物已達 ${MAX_PETS} 隻上限，先到管理頁丟棄一隻吧！`);
      return;
    }
    const species = (["cat", "dog", "chicken"] as PetSpecies[])[Math.floor(Math.random() * 3)];
    const local = hatchEgg(progressRef.current, me.id, eggId, species);
    if (!local) return;
    try {
      await updatePetProgress("hatch", local, { eggId, species });
      const newPet = local.pets[me.id]?.at(-1);
      if (newPet) setSelectedPetId(newPet.id);
      setPetNote(`孵化成功！你得到了一隻${petSpeciesLabel(species)}。`);
    } catch {
      setPetNote("孵蛋失敗，請再試一次。");
    }
  }

  async function discardMyPet(petId: string) {
    if (!me) return;
    const local = discardPet(progressRef.current, me.id, petId);
    if (!local) return;
    try {
      await updatePetProgress("discard", local, { petId });
      if (selectedPetId === petId) setSelectedPetId(local.pets[me.id]?.[0]?.id ?? null);
      setPetNote("這位小夥伴已離開你的島嶼，空出的名額可以孵新蛋了。");
    } catch {
      setPetNote("寵物管理暫時沒有回應，請再試一次。");
    }
  }

  async function saveProfile() {
    if (!me) return;
    const nickname = cleanNickname(nickDraft);
    setProfileError(null);
    if (!status?.authConfigured || me.id === guestId()) {
      const next = { ...me, name: nickname || me.name, color: colorDraft, avatarModel: avatarDraft };
      window.localStorage.setItem(GUEST_KEY, JSON.stringify({ name: next.name, color: next.color, avatarModel: next.avatarModel }));
      setMe(next);
      apiRef.current?.setProfile(next);
      netRef.current?.updateProfile(next);
      setProfileOpen(false);
      setAvatarSetupOpen(false);
      return;
    }
    const result = await authClient.updateUser({
      nickname,
      avatarColor: colorDraft,
      avatarModel: avatarDraft,
    });
    if (result.error) {
      setProfileError("暱稱沒有存進去，請再試一次。");
      return;
    }
    const next = { ...me, name: nickname || me.name, color: colorDraft, avatarModel: avatarDraft };
    setMe(next);
    apiRef.current?.setProfile(next);
    netRef.current?.updateProfile(next);
    setProfileOpen(false);
    setAvatarSetupOpen(false);
  }

  async function signIn() {
    setSigningIn(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (result.error) {
      setSigningIn(false);
      addNotification(result.error.message || "Google 登入沒有完成。");
    }
  }

  function startGuest() {
    const name = cleanNickname(guestName) || "訪客";
    const id = guestId();
    window.localStorage.setItem(GUEST_KEY, JSON.stringify({ name, color: guestColor, avatarModel: guestAvatar }));
    void enterGame({ id, name, color: guestColor, avatarModel: guestAvatar, image: null });
  }

  const score = me ? progress.scores[me.id] ?? 0 : 0;
  const myPets = me ? progress.pets[me.id] ?? [] : [];
  const myEggs = me ? progress.eggs[me.id] ?? [] : [];
  const selectedPet = myPets.find((candidate) => candidate.id === selectedPetId) ?? myPets[0];
  const displayPet = selectedPet ? { ...selectedPet, status: petStatus(selectedPet.lastFedAt) } : undefined;
  const roomPets = useMemo(
    () => myPets.map((pet) => ({ ...pet, status: petStatus(pet.lastFedAt) })),
    [myPets],
  );
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
      <IslandStage
        api={apiRef}
        sceneObjects={initialSceneObjects}
        canEditScene={!status?.authConfigured || user?.role === "admin"}
      />
      <CameraControls
        className="island-camera-controls"
        label="島嶼探索視角控制"
        onAdjust={(change) => apiRef.current?.adjustCamera(change)}
        onReset={() => apiRef.current?.resetCamera()}
      />
      <div className="vignette" />
      {status?.authConfigured ? <SessionWatch onSession={onSession} /> : null}

      <header className="brand">
        <p className="eyebrow">DAWN ISLE</p>
        <h1>曙島</h1>
        <p>五座物理站，全班一起點亮。</p>
      </header>

      <section className={`progress-pill info-card ${collapsedInfo.progress ? "is-collapsed" : ""}`} aria-label="島的進度">
        <InfoCardToggle label="島嶼進度" collapsed={Boolean(collapsedInfo.progress)} onToggle={() => toggleInfoCard("progress")} />
        <div className="info-card-content">
          <span>
            <em>{score}</em> 分
          </span>
          <span>自由探索</span>
          {mode ? <span className="mode">{mode === "remote" ? "全班連線" : "本機分頁"}</span> : null}
        </div>
      </section>

      <Notifications
        notifications={notifications}
      />

      {me ? (
        <aside className={`side info-card ${collapsedInfo.side ? "is-collapsed" : ""}`}>
          <InfoCardToggle label="島上資訊" collapsed={Boolean(collapsedInfo.side)} onToggle={() => toggleInfoCard("side")} />
          <div className="info-card-content">
            <button className="who" type="button" onClick={() => openProfile(me)}>
              {me.image ? <img src={me.image} alt="" referrerPolicy="no-referrer" /> : <i style={{ background: me.color }} />}
              <span>
                <strong>{me.name}</strong>
                <small>我的角色 · 名稱與顏色</small>
              </span>
            </button>
            <button className="room-button" type="button" onClick={() => { setPetNote(null); setRoomOpen(true); }}>
              <span className="pet-mini">{petEmoji(displayPet)}</span>
              <span><strong>我的房間</strong><small>{myPets.length} 隻寵物 · {myEggs.length} 顆蛋</small></span>
              <b>進入 →</b>
            </button>
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
          </div>
        </aside>
      ) : null}

      {me ? <MobileControls api={apiRef} /> : null}

      {showGate ? (
        <div className="gate">
          <section className="card" role="dialog" aria-labelledby="gate-title">
            <p className="eyebrow">HELLO</p>
            <h2 id="gate-title">登上曙島</h2>
            {!status ? (
              <p>正在把島準備好…</p>
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
                <AvatarRow value={guestAvatar} onChange={setGuestAvatar} />
                <CharacterPreview3D modelId={guestAvatar} />
                <button className="primary" type="button" onClick={startGuest}>
                  以訪客進入
                </button>
                <p className="note">同一個瀏覽器的分頁看得到彼此。跨裝置的即時位置之後才會接上。</p>
              </>
            )}
          </section>
        </div>
      ) : null}

      {profileOpen && me ? (
        <div className="gate">
          <section className="card character-card" role="dialog" aria-labelledby="profile-title">
            {!avatarSetupOpen ? (
              <button
                className="room-close"
                type="button"
                aria-label="關閉我的角色"
                title="關閉我的角色"
                onClick={() => setProfileOpen(false)}
              >
                ×
              </button>
            ) : null}
            <p className="eyebrow">PROFILE</p>
            <h2 id="profile-title">{avatarSetupOpen ? "建立你的島嶼角色" : "島上的名字與角色"}</h2>
            <p>{avatarSetupOpen ? "先選一個 Blocky 角色，之後可以隨時在個人資料中更換。" : `Google 名稱是「${user?.name || me.name}」。暱稱留白就會改回那個名稱。`}</p>
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
            <AvatarRow value={avatarDraft} onChange={setAvatarDraft} />
            <ColorRow value={colorDraft} onChange={setColorDraft} />
            <CharacterPreview3D modelId={avatarDraft} />
            {profileError ? <p className="warn">{profileError}</p> : null}
            <div className="row">
              <button type="button" onClick={() => { if (!avatarSetupOpen) setProfileOpen(false); }} disabled={avatarSetupOpen}>
                取消
              </button>
              <button className="primary" type="button" onClick={() => void saveProfile()}>
                儲存
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {roomOpen && me ? (
        <div className="gate">
          <section className="card room-card" role="dialog" aria-labelledby="room-title">
            <button
              className="room-close"
              type="button"
              aria-label="關閉我的房間"
              title="關閉我的房間"
              onClick={() => setRoomOpen(false)}
            >
              ×
            </button>
            <PetRoom3D
              pets={roomPets}
              onInteract={(pet) => {
                setSelectedPetId(pet.id);
                setPetNote(pet.status === "sick" ? `${pet.name}蹭了蹭你的手，但看起來還是需要休息。` : `${pet.name}開心地跳起來！牠知道你一直陪著牠。`);
              }}
            />
            <p className="eyebrow">MY ROOM · 寵物養成</p>
            <h2 id="room-title">{displayPet?.name ?? "我的寵物小屋"}</h2>
            <p>{petStatusText(displayPet, myPets.length, myEggs.length)}</p>
            {displayPet ? (
              <div className="pet-stats">
                <span>狀態 <b className={`status-${displayPet.status}`}>{petStatusLabel(displayPet.status)}</b></span>
                <span>照顧 {displayPet.feedings} 次</span>
                <span>飼料 5 分／份</span>
              </div>
            ) : null}
            <div className="pet-shop">
              <div><strong>寵物店</strong><small>答題分數可以換成飼料或神秘蛋</small></div>
              {displayPet ? <button className="primary feed-button" type="button" onClick={() => void feedMyPet()} disabled={displayPet.status === "dead" || score < 5}>
                🥕 餵食 <b>5 分</b>
              </button> : null}
              <button className="primary feed-button" type="button" onClick={() => void buyPetEgg()} disabled={score < EGG_COST}>
                🥚 買蛋 <b>{EGG_COST} 分</b>
              </button>
            </div>
            <button className="secondary pet-manage-button" type="button" onClick={() => setPetManagerOpen(true)}>
              🧺 管理寵物與蛋（{myPets.length}/{MAX_PETS}）
            </button>
            {petNote ? <p className="pet-note">{petNote}</p> : null}
            <p className="note">一天沒餵會生病，兩天沒餵會離世。最多養 {MAX_PETS} 隻寵物，空出名額才能孵新蛋。</p>
          </section>
        </div>
      ) : null}

      {petManagerOpen && me ? (
        <div className="gate">
          <section className="card pet-manager-card" role="dialog" aria-labelledby="pet-manager-title">
            <button className="room-close" type="button" aria-label="關閉寵物管理" title="關閉寵物管理" onClick={() => setPetManagerOpen(false)}>×</button>
            <p className="eyebrow">PET CARE · 管理中心</p>
            <h2 id="pet-manager-title">寵物與蛋</h2>
            <p>選一隻寵物查看狀態，也可以孵化蛋或丟棄既有寵物。</p>
            <div className="pet-manager-summary"><b>{myPets.length}/{MAX_PETS}</b> 寵物 <span>·</span> <b>{myEggs.length}</b> 顆蛋 <span>·</span> <b>{score}</b> 分</div>
            <div className="pet-manager-list">
              {myPets.length > 0 ? myPets.map((petItem) => (
                <article className={`pet-manager-item ${selectedPetId === petItem.id ? "is-selected" : ""}`} key={petItem.id}>
                  <button type="button" className="pet-select" onClick={() => { setSelectedPetId(petItem.id); setPetManagerOpen(false); setRoomOpen(true); }}>
                    <span className="pet-manager-emoji">{petEmoji({ species: petItem.species, status: petStatus(petItem.lastFedAt) })}</span>
                    <span><strong>{petItem.name}</strong><small>{petSpeciesLabel(petItem.species)} · {petStatusLabel(petStatus(petItem.lastFedAt))}</small></span>
                  </button>
                  <button className="texty danger-button" type="button" onClick={() => void discardMyPet(petItem.id)}>丟棄</button>
                </article>
              )) : <p className="empty-pets">還沒有寵物，孵化第一顆蛋吧！</p>}
            </div>
            <div className="egg-list">
              <h3>我的蛋</h3>
              {myEggs.length > 0 ? myEggs.map((egg) => (
                <div className="egg-item" key={egg.id}>
                  <span>🥚 <small>神秘蛋</small></span>
                  <button className="primary" type="button" onClick={() => void hatchMyEgg(egg.id)} disabled={myPets.length >= MAX_PETS}>孵化</button>
                </div>
              )) : <p className="empty-pets">還沒有蛋，到寵物店用 {EGG_COST} 分購買一顆吧。</p>}
            </div>
            {myPets.length >= MAX_PETS && myEggs.length > 0 ? <p className="pet-note">寵物已滿五隻，請先丟棄一隻寵物，才能孵化新的蛋。</p> : null}
            {petNote ? <p className="pet-note">{petNote}</p> : null}
          </section>
        </div>
      ) : null}

      <p className="hint">WASD 移動 · Space 跳躍 · 拖曳旋轉鏡頭 · Shift 奔跑 · 收集金幣 +10 分</p>
    </main>
  );

  function openProfile(profile: Profile) {
    setNickDraft(user?.nickname ?? "");
    setColorDraft(profile.color);
    setAvatarDraft(profile.avatarModel ?? BLOCKY_MODELS[0].id);
    setProfileError(null);
    setAvatarSetupOpen(false);
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
            avatarModel: current.avatarModel,
            role: (current as typeof current & { role?: string }).role,
          }
        : null,
      session.isPending,
    );
  }, [session.data, session.isPending]);
  return null;
}

function MobileControls({ api }: { api: { current: GameApi | null } }) {
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
    <>
      <div className="joystick" ref={padRef} aria-hidden="true">
        <i ref={knobRef} />
      </div>
      <button
        className="jump-button"
        type="button"
        aria-label="跳躍"
        onPointerDown={(event) => {
          event.preventDefault();
          api.current?.jump();
        }}
      >
        跳
      </button>
    </>
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

function AvatarRow({ value, onChange }: { value: string; onChange: (avatar: string) => void }) {
  return (
    <div className="avatar-choices" role="listbox" aria-label="選擇角色">
      <p className="choice-label">角色外觀</p>
      <div className="avatar-choice-grid">
        {BLOCKY_MODELS.map((model) => (
          <button
            key={model.id}
            type="button"
            className={model.id === value ? "on" : ""}
            aria-label={model.label}
            aria-selected={model.id === value}
            onClick={() => onChange(model.id)}
          >
            <span className="avatar-choice-preview">{model.id.slice(-1).toUpperCase()}</span>
            <span>{model.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function petEmoji(pet?: Pick<PetState, "species" | "status">) {
  if (!pet) return "🥚";
  if (pet.status === "dead") return "🪦";
  if (pet.status === "sick") return "🤒";
  return pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : pet.species === "chicken" ? "🐔" : "🐰";
}

function petStatusLabel(status?: PetState["status"]) {
  return status === "dead" ? "已離世" : status === "sick" ? "生病了" : "健康有活力";
}

function petStatusText(pet: PetState | undefined, petCount: number, eggCount: number) {
  if (!pet) return eggCount > 0 ? "你有神秘蛋等待孵化，快到寵物管理頁看看吧！" : "房間還沒有寵物，先到寵物店買一顆蛋吧。";
  if (pet.status === "dead") return "這位小夥伴已經離世，請到管理頁移除牠，空出新的名額。";
  if (pet.status === "sick") return `${pet.name} 今天不舒服，需要飼料和你的關心。`;
  return `${pet.name} 正在房間裡等你，摸摸牠、餵牠吃點好吃的吧！目前共有 ${petCount} 隻寵物。`;
}

function petSpeciesLabel(species: PetSpecies) {
  return species === "cat" ? "貓咪" : species === "dog" ? "狗狗" : species === "chicken" ? "小雞" : "兔子";
}

function profileFromUser(user: SessionUser): Profile {
  return {
    id: user.id,
    name: displayName(user),
    image: user.image,
    color: user.avatarColor || colorFromId(user.id),
    avatarModel: user.avatarModel || undefined,
  };
}

function sameProfile(prev: Profile | null, next: Profile) {
  return !!prev && prev.id === next.id && prev.name === next.name && prev.color === next.color && prev.image === next.image && prev.avatarModel === next.avatarModel;
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

async function fetchUserProgress() {
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
