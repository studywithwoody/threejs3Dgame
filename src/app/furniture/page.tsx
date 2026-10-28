"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FurniturePreview3D from "@/components/FurniturePreview3D";
import { FURNITURE_CATALOG, FURNITURE_BY_ID } from "@/game/furniture";
import { readRoomStorage, writeRoomStorage } from "@/game/room-storage";
import { authClient } from "@/lib/auth-client";
import { loadProgress, saveProgress } from "@/game/progress";

export default function FurniturePage() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const [guestId, setGuestId] = useState("guest");
  const [selectedAssetId, setSelectedAssetId] = useState(FURNITURE_CATALOG[0]?.id ?? "");
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const playerId = user?.id ?? guestId;
  const selected = FURNITURE_BY_ID.get(selectedAssetId) ?? FURNITURE_CATALOG[0];

  useEffect(() => {
    const local = readRoomStorage();
    const localProgress = loadProgress();
    if (!user) {
      const id = getGuestId();
      setGuestId(id);
      setOwned(local.owned);
      setScore(localProgress.scores[id] ?? 0);
      setLoading(false);
      return;
    }
    void fetch("/api/room", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { persisted?: boolean; score?: number; owned?: Record<string, number> };
      if (response.ok && data.persisted) {
        setOwned(data.owned ?? {});
        setScore(data.score ?? 0);
      } else {
        setOwned(local.owned);
        setScore(localProgress.scores[user.id] ?? 0);
      }
    }).catch(() => {
      setOwned(local.owned);
      setScore(localProgress.scores[user.id] ?? 0);
    }).finally(() => setLoading(false));
  }, [user]);

  const buyFurniture = async () => {
    if (!selected || score < selected.price) {
      setNotice("分數不足，先完成島嶼上的題目吧！");
      return;
    }
    let nextScore = score - selected.price;
    if (user) {
      const response = await fetch("/api/room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "buy", assetId: selected.id }),
      });
      if (!response.ok) {
        setNotice(response.status === 409 ? "分數不足，無法購買這件家具。" : "家具商店暫時無法使用。");
        return;
      }
      const data = await response.json() as { score?: number };
      nextScore = data.score ?? nextScore;
    }
    setScore(nextScore);
    const nextOwned = { ...owned, [selected.id]: (owned[selected.id] ?? 0) + 1 };
    setOwned(nextOwned);
    const progress = loadProgress();
    saveProgress({ ...progress, scores: { ...progress.scores, [playerId]: nextScore } });
    writeRoomStorage({ furniture: readRoomStorage().furniture, owned: nextOwned });
    setNotice(`已購買${selected.name}，回到房間即可放入並佈置。`);
  };

  return (
    <main className="furniture-page">
      <header className="furniture-page-header">
        <div>
          <Link className="back-link" href="/">← 回到曙島</Link>
          <p className="eyebrow">FURNITURE SHOP · {user ? "會員模式" : "訪客模式"}</p>
          <h1>家具商店</h1>
          <p>先看看家具的 3D 樣式，再用答題分數帶回房間。</p>
        </div>
        <div className="furniture-page-actions"><Link className="room-shop-link" href="/room">我的房間</Link><div className="room-score">{score}<small>分</small></div></div>
      </header>
      <section className="furniture-shop-layout">
        <div className="furniture-catalog-panel">
          <div className="furniture-panel-heading"><div><p className="eyebrow">KENNEY FURNITURE KIT</p><h2>挑選家具</h2></div><span>{ownedTotal(owned)} 件</span></div>
          {loading ? <p className="furniture-empty">正在讀取家具庫存…</p> : <div className="furniture-catalog-grid">{FURNITURE_CATALOG.map((item) => <button className={`furniture-catalog-card ${selectedAssetId === item.id ? "is-selected" : ""}`} type="button" key={item.id} onClick={() => { setSelectedAssetId(item.id); setNotice(null); }}><span className="furniture-icon">{item.icon}</span><span><strong>{item.name}</strong><small>{item.price} 分 · 已有 {owned[item.id] ?? 0} 件</small></span></button>)}</div>}
        </div>
        {selected ? <article className="furniture-preview-panel"><div className="furniture-preview-copy"><div><p className="eyebrow">3D PREVIEW</p><h2>{selected.name}</h2></div><span className="furniture-price">{selected.price} 分</span></div><FurniturePreview3D assetId={selected.id} /><div className="furniture-purchase-row"><p>購買後會先放入你的家具庫存，不會自動改變房間配置。</p><button className="primary" type="button" onClick={buyFurniture} disabled={loading || score < selected.price}>購買家具</button></div>{notice ? <p className="pet-note">{notice}</p> : null}</article> : null}
      </section>
      <p className="furniture-license">3D 家具素材來自 Kenney Furniture Kit，採 CC0 授權。</p>
    </main>
  );
}

function getGuestId() {
  if (typeof window === "undefined") return "guest";
  const key = "dawn-isle-guest-id";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const id = `guest-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, id);
  return id;
}

function ownedTotal(owned: Record<string, number>) {
  return Object.values(owned).reduce((total, count) => total + Math.max(0, Number(count) || 0), 0);
}
