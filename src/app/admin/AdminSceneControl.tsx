"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IslandStage from "@/components/IslandStage";
import type { GameApi } from "@/game/mount";
import type { SceneObjectRecord } from "@/game/platformerKit/sceneConfig";
import type { SceneDefinition, SceneId } from "@/game/scenes";

type AdminState = {
  scenes: SceneDefinition[];
  sceneId: SceneId;
  activeSceneId: SceneId | null;
  hasDraft: boolean;
  objects: SceneObjectRecord[];
};

export default function AdminSceneControl() {
  const apiRef = useRef<GameApi | null>(null);
  const [state, setState] = useState<AdminState | null>(null);
  const [selectedId, setSelectedId] = useState<SceneId | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("正在載入地圖設定…");

  const load = useCallback(async (sceneId?: SceneId) => {
    setLoading(true);
    const query = sceneId ? `?sceneId=${encodeURIComponent(sceneId)}` : "";
    const response = await fetch(`/api/admin/homepage-scene${query}`, { cache: "no-store" });
    if (!response.ok) {
      setNotice(response.status === 403 ? "只有 admin 帳戶可以管理地圖。" : "無法載入地圖設定。請稍後再試。");
      setLoading(false);
      return;
    }
    const next = await response.json() as AdminState;
    setState(next);
    setSelectedId(next.sceneId);
    setNotice(next.hasDraft ? "已有未發布草稿。" : "目前載入正式佈局，按 F2 開始編輯。 ");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedScene = useMemo(
    () => state?.scenes.find((scene) => scene.id === (selectedId ?? state.sceneId)) ?? null,
    [selectedId, state],
  );

  const selectScene = (sceneId: SceneId) => {
    if (busy || sceneId === state?.sceneId) return;
    setSelectedId(sceneId);
    void load(sceneId);
  };

  const publish = async () => {
    if (!state || !state.hasDraft) return;
    setBusy(true);
    const response = await fetch("/api/admin/homepage-scene", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sceneId: state.sceneId }),
    });
    setNotice(response.ok ? "已發布到首頁，新的使用者會立即看到這張地圖。" : "發布失敗，請確認草稿已儲存。 ");
    if (response.ok) setState((current) => current ? { ...current, activeSceneId: current.sceneId, hasDraft: false } : current);
    setBusy(false);
  };

  const restoreDaily = async () => {
    setBusy(true);
    const response = await fetch("/api/admin/homepage-scene", { method: "DELETE" });
    setNotice(response.ok ? "已恢復每日自動輪替。" : "恢復每日輪替失敗，請稍後再試。 ");
    if (response.ok) setState((current) => current ? { ...current, activeSceneId: null } : current);
    setBusy(false);
  };

  const onEditorSaved = useCallback(() => {
    setState((current) => current ? { ...current, hasDraft: true } : current);
    setNotice("草稿已儲存；確認無誤後按「套用到首頁」。");
  }, []);

  if (loading && !state) return <main className="admin-page"><p className="admin-loading">正在載入地圖控制台…</p></main>;
  if (!state || !selectedScene) return <main className="admin-page"><p className="admin-loading">{notice}</p></main>;

  return (
    <main className="admin-page">
      <div className="admin-stage-wrap">
        <IslandStage
          api={apiRef}
          sceneObjects={state.objects}
          scene={selectedScene}
          canEditScene
          editorSaveUrl="/api/admin/homepage-scene"
          onEditorSaved={onEditorSaved}
        />
      </div>
      <section className="admin-panel" aria-labelledby="admin-title">
        <div className="admin-panel__topline">
          <div>
            <p className="eyebrow">DAWN ISLE · ADMIN</p>
            <h1 id="admin-title">首頁地圖控制台</h1>
            <p className="admin-lede">選擇主題、調整 3D 物件，再決定是否發布到試用首頁。</p>
          </div>
          <Link href="/" className="admin-back">返回首頁</Link>
        </div>

        <div className="admin-status-card">
          <span className="admin-status-dot" />
          <div><strong>{state.activeSceneId ? `目前首頁：${state.scenes.find((scene) => scene.id === state.activeSceneId)?.name ?? state.activeSceneId}` : "目前首頁：每日自動輪替"}</strong><small>{notice}</small></div>
        </div>

        <div className="admin-theme-list">
          {state.scenes.map((scene) => (
            <button key={scene.id} type="button" className={`admin-theme-card ${scene.id === state.sceneId ? "is-selected" : ""}`} onClick={() => selectScene(scene.id)}>
              <span className="admin-theme-index">0{scene.sortOrder + 1}</span>
              <span><strong>{scene.name}</strong><small>{scene.description}</small></span>
              {state.activeSceneId === scene.id ? <b>首頁中</b> : null}
            </button>
          ))}
        </div>

        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => apiRef.current?.setEditorEnabled(true)}>開啟 3D 編輯</button>
          <button type="button" className="primary" disabled={busy || !state.hasDraft} onClick={() => void publish()}>套用到首頁</button>
          <button type="button" className="texty" disabled={busy || !state.activeSceneId} onClick={() => void restoreDaily()}>恢復每日輪替</button>
        </div>
        <p className="admin-help">編輯器內可點選素材，使用控制器或鍵盤調整；按「儲存場景」會先保存草稿，不會立即改變首頁。</p>
      </section>
    </main>
  );
}
