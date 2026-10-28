"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PetRoom3D from "@/components/PetRoom3D";
import { defaultFurniture, FURNITURE_CATALOG, FURNITURE_BY_ID, type RoomFurniture } from "@/game/furniture";
import { authClient } from "@/lib/auth-client";
import { displayName } from "@/lib/profile";
import {
  buyEgg,
  discardPet,
  EGG_COST,
  feedPet,
  hatchEgg,
  loadProgress,
  MAX_PETS,
  normalizeProgress,
  PET_SPECIES,
  petStatus,
  saveProgress,
} from "@/game/progress";
import { emptyProgress, type IslandProgress, type PetSpecies, type PetState } from "@/game/types";

export default function RoomPage() {
  const session = authClient.useSession();
  const [progress, setProgress] = useState<IslandProgress>(emptyProgress);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [furniture, setFurniture] = useState<RoomFurniture[]>([]);
  const [ownedFurniture, setOwnedFurniture] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [roomRevision, setRoomRevision] = useState(0);
  const [guestId, setGuestId] = useState("guest");
  const user = session.data?.user;
  const playerId = user?.id ?? guestId;
  const playerName = user ? displayName(user) : getGuestName();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) setGuestId(getGuestId());
      const local = loadProgress();
      if (!user) {
        if (active) setProgress(local);
        return;
      }
      try {
        const response = await fetch("/api/progress", { cache: "no-store" });
        const data = (await response.json()) as { progress?: IslandProgress; persisted?: boolean };
        const next = response.ok && data.persisted && data.progress ? normalizeProgress(data.progress) : local;
        if (active) {
          setProgress(next);
          saveProgress(next);
        }
      } catch {
        if (active) setProgress(local);
      }
    };
    void load();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const local = readRoomStorage();
    setFurniture(local.furniture);
    setOwnedFurniture(local.owned);
    if (!user) return;
    void fetch("/api/room", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { furniture?: RoomFurniture[]; owned?: Record<string, number> };
      setFurniture(Array.isArray(data.furniture) ? data.furniture : []);
      setOwnedFurniture(data.owned ?? {});
    }).catch(() => undefined);
  }, [user]);

  const pets = useMemo(() => (progress.pets[playerId] ?? []).map((pet) => ({ ...pet, status: petStatus(pet.lastFedAt) })), [progress, playerId]);
  const eggs = progress.eggs[playerId] ?? [];
  const score = progress.scores[playerId] ?? 0;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0];

  const saveRoom = (next: RoomFurniture[]) => {
    setFurniture(next);
    window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify({ furniture: next, owned: ownedFurniture }));
    if (user) void fetch("/api/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", furniture: next }) });
  };

  const buyFurniture = async (assetId: string) => {
    const item = FURNITURE_BY_ID.get(assetId);
    if (!item || score < item.price) { setNotice("分數不足，先完成島嶼上的題目吧！"); return; }
    if (user) {
      const response = await fetch("/api/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "buy", assetId }) });
      if (!response.ok) { setNotice(response.status === 409 ? "分數不足，無法購買這件家具。" : "家具商店暫時無法使用。"); return; }
      const data = await response.json() as { score?: number };
      const nextScore = data.score ?? score - item.price;
      setProgress((current) => {
        const next = { ...current, scores: { ...current.scores, [playerId]: nextScore } };
        saveProgress(next);
        return next;
      });
    } else {
      setProgress((current) => {
        const next = { ...current, scores: { ...current.scores, [playerId]: score - item.price } };
        saveProgress(next);
        return next;
      });
    }
    const nextOwned = { ...ownedFurniture, [assetId]: (ownedFurniture[assetId] ?? 0) + 1 };
    setOwnedFurniture(nextOwned);
    window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify({ furniture, owned: nextOwned }));
    setNotice(`已購買${item.name}，按「放入房間」開始佈置。`);
  };

  const addFurniture = (assetId: string) => {
    const owned = ownedFurniture[assetId] ?? 0;
    const placed = furniture.filter((item) => item.assetId === assetId).length;
    if (placed >= owned) { setNotice("請先購買這件家具，或已經把擁有的數量放完了。"); return; }
    const item = defaultFurniture(assetId, furniture.length);
    if (!item) return;
    saveRoom([...furniture, item]);
    setSelectedFurnitureId(item.id);
    setRoomRevision((value) => value + 1);
    setEditing(true);
  };

  const removeFurniture = () => {
    if (!selectedFurnitureId) return;
    saveRoom(furniture.filter((item) => item.id !== selectedFurnitureId));
    setSelectedFurnitureId(null);
    setRoomRevision((value) => value + 1);
  };

  const update = async (local: IslandProgress, action: string, extra: Record<string, string> = {}) => {
    setProgress(local);
    saveProgress(local);
    if (!user) return;
    try {
      const response = await fetch("/api/pet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, playerId, progress: local, ...extra }),
      });
      if (!response.ok) throw new Error("request_failed");
      const data = (await response.json()) as { progress?: IslandProgress };
      if (data.progress) {
        const next = normalizeProgress(data.progress);
        setProgress(next);
        saveProgress(next);
      }
    } catch {
      setNotice("變更已保存在這個瀏覽器，雲端同步稍後會再試一次。");
    }
  };

  const feed = () => {
    if (!selectedPet) return;
    const next = feedPet(progress, playerId, selectedPet.id);
    if (!next) {
      setNotice(selectedPet.status === "dead" ? "這隻寵物已離世，請先在管理中心移除牠。" : "分數不足，答題賺到 5 分就能買飼料。");
      return;
    }
    setNotice(`${selectedPet.name} 吃飽了，今天也恢復元氣！`);
    void update(next, "feed", { petId: selectedPet.id });
  };

  const buy = () => {
    const next = buyEgg(progress, playerId);
    if (!next) {
      setNotice(`購買神秘蛋需要 ${EGG_COST} 分。`);
      return;
    }
    setNotice("你買到一顆神秘蛋了！到管理中心孵化牠吧。");
    void update(next, "buyEgg");
  };

  const hatch = (eggId: string) => {
    if (pets.length >= MAX_PETS) {
      setNotice(`寵物已達 ${MAX_PETS} 隻上限，先移除一隻吧。`);
      return;
    }
    const species = PET_SPECIES[Math.floor(Math.random() * PET_SPECIES.length)];
    const next = hatchEgg(progress, playerId, eggId, species);
    if (!next) return;
    setNotice("孵化成功！新的小夥伴來到房間了。");
    void update(next, "hatch", { eggId, species });
  };

  const discard = (petId: string) => {
    const next = discardPet(progress, playerId, petId);
    if (!next) return;
    if (selectedPetId === petId) setSelectedPetId(null);
    setNotice("這位小夥伴已離開房間，空出名額了。");
    void update(next, "discard", { petId });
  };

  return (
    <main className="room-page">
      <header className="room-page-header">
        <Link className="back-link" href="/">← 回到曙島</Link>
        <div>
          <p className="eyebrow">MY ROOM · {user ? playerName : "訪客模式"}</p>
          <h1>我的寵物小屋</h1>
        </div>
        <div className="room-score">{score}<small>分</small></div>
      </header>
      <section className="room-page-content">
        <div className="room-page-stage">
          <PetRoom3D
            key={`${roomRevision}-${editing ? "edit" : "view"}`}
            pets={pets}
            furniture={furniture}
            editing={editing}
            selectedFurnitureId={selectedFurnitureId}
            onSelectFurniture={setSelectedFurnitureId}
            onFurnitureChange={saveRoom}
            onInteract={(pet) => {
              setSelectedPetId(pet.id);
              setNotice(pet.status === "sick" ? `${pet.name} 看起來需要休息。` : `${pet.name} 開心地跳起來！`);
            }}
          />
        </div>
        <aside className="room-page-panel">
          <div className="room-panel-intro">
            <span className="pet-mini">{petEmoji(selectedPet)}</span>
            <div><p className="eyebrow">ROOM CARE</p><h2>{selectedPet?.name ?? "還沒有寵物"}</h2></div>
          </div>
          <p>{petStatusText(selectedPet, pets.length, eggs.length)}</p>
          {selectedPet ? <div className="pet-stats"><span>狀態 <b className={`status-${selectedPet.status}`}>{petStatusLabel(selectedPet.status)}</b></span><span>照顧 {selectedPet.feedings} 次</span></div> : null}
          <div className="pet-shop"><div><strong>寵物店</strong><small>用答題分數照顧小夥伴</small></div>{selectedPet ? <button className="primary feed-button" type="button" onClick={feed} disabled={selectedPet.status === "dead" || score < 5}>🥕 餵食 <b>5 分</b></button> : null}<button className="primary feed-button" type="button" onClick={buy} disabled={score < EGG_COST}>🥚 買蛋 <b>{EGG_COST} 分</b></button></div>
          <div className="room-editor-toolbar"><div><strong>房間佈置</strong><small>{editing ? "點擊家具後使用箭頭控制器拖曳、旋轉或縮放" : "購買家具後，開啟編輯模式開始佈置"}</small></div><button className={editing ? "primary" : "secondary"} type="button" onClick={() => setEditing((value) => !value)}>{editing ? "完成佈置" : "進入編輯"}</button>{editing && selectedFurnitureId ? <button className="texty danger-button" type="button" onClick={removeFurniture}>刪除選取</button> : null}</div>
          {editing ? <div className="furniture-shop"><div className="furniture-shop-heading"><strong>家具商店</strong><small>分數：{score} · 已擁有可擺放家具</small></div><div className="furniture-grid">{FURNITURE_CATALOG.map((item) => { const owned = ownedFurniture[item.id] ?? 0; const placed = furniture.filter((entry) => entry.assetId === item.id).length; return <article className="furniture-item" key={item.id}><span className="furniture-icon">{item.icon}</span><div><strong>{item.name}</strong><small>{item.price} 分 · {placed}/{owned} 已擺放</small></div><button className="secondary" type="button" onClick={() => buyFurniture(item.id)} disabled={score < item.price}>購買</button><button className="texty" type="button" onClick={() => addFurniture(item.id)} disabled={placed >= owned}>放入房間</button></article>; })}</div></div> : null}
          <button className="secondary pet-manage-button" type="button" onClick={() => setManagerOpen(true)}>🧺 管理寵物與蛋（{pets.length}/{MAX_PETS}）</button>
          {notice ? <p className="pet-note">{notice}</p> : null}
          <p className="note">點擊寵物可以和牠互動。一天沒餵會生病，兩天沒餵會離世。</p>
        </aside>
      </section>
      {managerOpen ? <div className="gate"><section className="card pet-manager-card" role="dialog" aria-labelledby="room-manager-title"><button className="room-close" type="button" onClick={() => setManagerOpen(false)} aria-label="關閉管理中心">×</button><p className="eyebrow">PET CARE · 管理中心</p><h2 id="room-manager-title">寵物與蛋</h2><p>選一隻寵物查看狀態，也可以孵化蛋或移除既有寵物。</p><div className="pet-manager-list">{pets.length ? pets.map((pet) => <article className={`pet-manager-item ${selectedPet?.id === pet.id ? "is-selected" : ""}`} key={pet.id}><button className="pet-select" type="button" onClick={() => { setSelectedPetId(pet.id); setManagerOpen(false); }}><span className="pet-manager-emoji">{petEmoji(pet)}</span><span><strong>{pet.name}</strong><small>{petSpeciesLabel(pet.species)} · {petStatusLabel(pet.status)}</small></span></button><button className="texty danger-button" type="button" onClick={() => discard(pet.id)}>移除</button></article>) : <p className="empty-pets">還沒有寵物，先買一顆蛋吧！</p>}</div><div className="egg-list"><h3>我的蛋</h3>{eggs.length ? eggs.map((egg) => <div className="egg-item" key={egg.id}><span>🥚 <small>神秘蛋</small></span><button className="primary" type="button" onClick={() => hatch(egg.id)} disabled={pets.length >= MAX_PETS}>孵化</button></div>) : <p className="empty-pets">還沒有蛋。</p>}</div></section></div> : null}
    </main>
  );
}

function getGuestId() { if (typeof window === "undefined") return "guest"; const key = "dawn-isle-guest-id"; const current = window.localStorage.getItem(key); if (current) return current; const id = `guest-${crypto.randomUUID()}`; window.localStorage.setItem(key, id); return id; }
function getGuestName() { if (typeof window === "undefined") return "訪客"; try { return JSON.parse(window.localStorage.getItem("dawn-isle-guest") || "{}").name || "訪客"; } catch { return "訪客"; } }
const ROOM_STORAGE_KEY = "dawn-isle-room-v1";
function readRoomStorage(): { furniture: RoomFurniture[]; owned: Record<string, number> } { if (typeof window === "undefined") return { furniture: [], owned: {} }; try { const value = JSON.parse(window.localStorage.getItem(ROOM_STORAGE_KEY) || "{}"); return { furniture: Array.isArray(value.furniture) ? value.furniture : [], owned: value.owned && typeof value.owned === "object" ? value.owned : {} }; } catch { return { furniture: [], owned: {} }; }
}
function petEmoji(pet?: Pick<PetState, "species" | "status">) { if (!pet) return "🥚"; if (pet.status === "dead") return "🪦"; if (pet.status === "sick") return "🤒"; return ({ bunny: "🐰", cat: "🐱", dog: "🐶", chicken: "🐔", beaver: "🦫", cow: "🐮", deer: "🦌", fox: "🦊", panda: "🐼", penguin: "🐧" } satisfies Record<PetSpecies, string>)[pet.species]; }
function petStatusLabel(status: PetState["status"]) { return status === "dead" ? "已離世" : status === "sick" ? "生病了" : "健康有活力"; }
function petStatusText(pet: PetState | undefined, petCount: number, eggCount: number) { if (!pet) return eggCount ? "你有神秘蛋等待孵化，打開管理中心看看吧。" : "房間還沒有寵物，先到寵物店買一顆蛋吧。"; if (pet.status === "dead") return "這位小夥伴已經離世，請到管理中心移除牠。"; if (pet.status === "sick") return `${pet.name} 今天不舒服，需要飼料和你的關心。`; return `${pet.name} 正在房間裡等你，目前共有 ${petCount} 隻寵物。`; }
function petSpeciesLabel(species: PetSpecies) { return ({ bunny: "兔子", cat: "貓咪", dog: "狗狗", chicken: "小雞", beaver: "河狸", cow: "乳牛", deer: "小鹿", fox: "狐狸", panda: "熊貓", penguin: "企鵝" } satisfies Record<PetSpecies, string>)[species]; }
