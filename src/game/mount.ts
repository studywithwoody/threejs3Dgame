import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { makeAvatar, type Avatar } from "@/game/avatar";
import { uiBridge } from "@/game/bridge";
import { buildIsland } from "@/game/island";
import { configureTerrain, groundY, isWalkable, surfaceY } from "@/game/terrain";
import { GAME_ASSETS, type PlatformerKitCategory } from "@/game/platformerKit/registry";
import type { SceneObjectRecord, SceneRegion } from "@/game/platformerKit/sceneConfig";
import type { SceneId } from "@/game/scenes";
import type { IslandProgress, Pose, Profile } from "@/game/types";
import type { CameraAdjustment } from "@/components/CameraControls";

const POSE_MS = 200;

export type GameApi = {
  enter: (profile: Profile) => void;
  leave: () => void;
  jump: () => void;
  setProfile: (profile: Profile) => void;
  applyProgress: (progress: IslandProgress) => void;
  upsertRemote: (player: Profile & Pose) => void;
  removeRemote: (id: string) => void;
  nearby: () => string | null;
  adjustCamera: (change: CameraAdjustment) => void;
  resetCamera: () => void;
  setEditorAccess: (allowed: boolean) => void;
  dispose: () => void;
};

type Remote = {
  avatar: Avatar;
  x: number;
  z: number;
  ry: number;
  tx: number;
  tz: number;
  try: number;
  seen: number;
};

export function mountIsland(
  host: HTMLElement,
  sceneObjects: SceneObjectRecord[],
  canEditScene = true,
  sceneId: SceneId = "main-island",
  spawn = { x: 4, z: -10.5 },
): GameApi {
  const canvas = document.createElement("canvas");
  const labels = document.createElement("div");
  labels.className = "labels";
  host.append(canvas, labels);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const labelRenderer = new CSS2DRenderer({ element: labels });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 400);
  camera.position.set(36, 28, 36);
  configureTerrain(sceneObjects);
  const world = buildIsland(scene, sceneObjects);
  const orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.enablePan = true;
  orbitControls.minZoom = 0.7;
  orbitControls.maxZoom = 2.8;
  orbitControls.target.set(0, 3, 4);
  orbitControls.update();

  const editorGrid = new THREE.GridHelper(80, 80, "#e07a5f", "#ffffff");
  editorGrid.position.y = -0.52;
  editorGrid.visible = false;
  scene.add(editorGrid);
  const editorAxes = new THREE.AxesHelper(5);
  editorAxes.visible = false;
  scene.add(editorAxes);
  const editorBox = new THREE.Box3();
  const editorBoxHelper = new THREE.Box3Helper(editorBox, "#e07a5f");
  editorBoxHelper.visible = false;
  scene.add(editorBoxHelper);
  const transformControls = new TransformControls(camera, canvas);
  transformControls.setMode("translate");
  transformControls.enabled = false;
  scene.add(transformControls.getHelper());
  const editorHud = document.createElement("div");
  editorHud.className = "scene-editor-hud";
  editorHud.hidden = true;
  host.append(editorHud);
  let editorEnabled = false;
  let editorCanWrite = canEditScene;
  let editorDragging = false;
  let selectedEditorObject: THREE.Object3D | null = null;
  let selectedEditorId: string | null = null;
  let editorDirty = false;
  const editorHudInfo = document.createElement("div");
  const editorSaveButton = document.createElement("button");
  editorSaveButton.type = "button";
  editorSaveButton.textContent = "儲存場景";
  const editorTools = document.createElement("div");
  editorTools.className = "scene-editor-tools";
  const assetSelect = document.createElement("select");
  assetSelect.setAttribute("aria-label", "選擇素材");
  assetSelect.innerHTML = GAME_ASSETS.map((asset) => `<option value="${asset.id}">${asset.id}</option>`).join("");
  const regionSelect = document.createElement("select");
  regionSelect.setAttribute("aria-label", "選擇區域");
  regionSelect.innerHTML = ["forest", "snow-mountain", "snow-valley", "highland", "floating"].map((region) => `<option value="${region}">${region}</option>`).join("");
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "新增素材";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "刪除選取";
  editorTools.append(assetSelect, regionSelect, addButton, deleteButton);
  editorHud.append(editorHudInfo, editorTools, editorSaveButton);

  const updateEditorHud = () => {
    if (!editorEnabled) return;
    editorSaveButton.disabled = !editorDirty;
    deleteButton.disabled = !selectedEditorId;
    editorTools.hidden = !editorEnabled;
    if (!selectedEditorObject || !selectedEditorId) {
      editorHudInfo.textContent = "場景編輯器 · 點擊素材以選取";
      return;
    }
    const p = selectedEditorObject.position;
    const r = selectedEditorObject.rotation;
    const s = selectedEditorObject.scale;
    editorHudInfo.textContent = `場景編輯器 · ${selectedEditorId}\n位置 (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})\n旋轉 (${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}) · 縮放 (${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)})\nWASD 位移 · ↑/Q 上移 · ↓/Z 下移 · E 旋轉 · R 縮放 · Shift 加速`;
  };

  const refreshEditorBounds = () => {
    if (!selectedEditorObject) return;
    editorBox.setFromObject(selectedEditorObject);
    editorBoxHelper.updateMatrixWorld(true);
    updateEditorHud();
  };

  const saveEditorScene = async () => {
    const objects = world.getSceneObjects();
    const response = await fetch("/api/scene-editor", {
      method: "PUT",
      headers: { "content-type": "application/json" },
    body: JSON.stringify({ sceneId, objects }),
    }).catch(() => null);
    if (!response?.ok) return false;
    editorDirty = false;
    updateEditorHud();
    return true;
  };

  const markEditorDirty = () => {
    editorDirty = true;
    configureTerrain(world.getSceneObjects());
    updateEditorHud();
  };

  const onEditorSave = () => {
    void saveEditorScene();
  };

  const nudgeEditorObject = (x: number, y: number, z: number, accelerated = false) => {
    if (!selectedEditorObject) return;
    const step = 0.25 * (accelerated ? 4 : 1);
    transformControls.setMode("translate");
    selectedEditorObject.position.x += x * step;
    selectedEditorObject.position.y += y * step;
    selectedEditorObject.position.z += z * step;
    refreshEditorBounds();
    markEditorDirty();
  };

  const onAddSceneObject = () => {
    const asset = GAME_ASSETS.find((candidate) => candidate.id === assetSelect.value);
    if (!asset) return;
    const object: SceneObjectRecord = {
      id: `editor-${asset.id}-${Date.now()}`,
      assetId: asset.id,
      category: asset.category as PlatformerKitCategory,
      region: regionSelect.value as SceneRegion,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      collectible: asset.category === "collectible" || asset.id.startsWith("coin-"),
      autoAnchor: false,
    };
    void world.addSceneObject(object).then(() => {
      const added = world.getEditableObjects().get(object.id);
      if (added) selectEditorObject(added, object.id);
      markEditorDirty();
    });
  };

  const onDeleteSceneObject = () => {
    if (!selectedEditorId) return;
    world.removeSceneObject(selectedEditorId);
    selectEditorObject(null, null);
    markEditorDirty();
  };

  const selectEditorObject = (object: THREE.Object3D | null, id: string | null) => {
    selectedEditorObject = object;
    selectedEditorId = id;
    if (object) {
      transformControls.attach(object);
      editorBoxHelper.visible = true;
      refreshEditorBounds();
    } else {
      transformControls.detach();
      editorBoxHelper.visible = false;
      updateEditorHud();
    }
  };

  const setEditorEnabled = (enabled: boolean) => {
    if (enabled && !editorCanWrite) return;
    editorEnabled = enabled;
    editorGrid.visible = enabled;
    editorAxes.visible = enabled;
    transformControls.enabled = enabled;
    editorHud.hidden = !enabled;
    if (!enabled) selectEditorObject(null, null);
    updateEditorHud();
  };

  const editorRaycaster = new THREE.Raycaster();
  const editorPointer = new THREE.Vector2();
  const onEditorClick = (event: MouseEvent) => {
    if (!editorEnabled || editorDragging) return;
    const rect = canvas.getBoundingClientRect();
    editorPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    editorRaycaster.setFromCamera(editorPointer, camera);
    const objects = world.getEditableObjects();
    const hit = editorRaycaster.intersectObjects([...objects.values()], true)[0];
    if (!hit) {
      selectEditorObject(null, null);
      return;
    }
    let root: THREE.Object3D | null = hit.object;
    while (root && ![...objects.values()].includes(root)) root = root.parent;
    const entry = root ? [...objects.entries()].find(([, value]) => value === root) : undefined;
    selectEditorObject(root, entry?.[0] ?? null);
  };

  const onTransformChange = () => {
    refreshEditorBounds();
    markEditorDirty();
  };
  const onTransformDragging = (event: { value: unknown }) => {
    editorDragging = event.value === true;
    orbitControls.enabled = !editorDragging && !playing;
  };
  transformControls.addEventListener("change", onTransformChange);
  transformControls.addEventListener("dragging-changed", onTransformDragging);
  canvas.addEventListener("click", onEditorClick);
  editorSaveButton.addEventListener("click", onEditorSave);
  addButton.addEventListener("click", onAddSceneObject);
  deleteButton.addEventListener("click", onDeleteSceneObject);

  /*
   * The editor saves a complete scene snapshot, rather than writing one
   * object at a time. This keeps add/delete/transform changes atomic.
   */
  void 0;

  const keys = new Set<string>();
  let playing = false;
  let profile: Profile | null = null;
  let local: Avatar | null = null;
  let x = spawn.x;
  let z = spawn.z;
  let ry = 0;
  let cameraYaw = 0;
  let cameraPitch = 0.4;
  let distance = 12;
  let playerY = surfaceY(spawn.x, spawn.z) ?? groundY(spawn.x, spawn.z);
  let jumpVelocity = 0;
  let grounded = true;
  let nearbyId: string | null = null;
  let solved = new Set<string>();
  let lastPoseAt = 0;
  let moved = false;
  const remotes = new Map<string, Remote>();
  let attract = 0.4;
  let frame = 0;
  let running = true;

  const requestJump = () => {
    if (uiBridge.typing || !playing || !grounded) return;
    grounded = false;
    jumpVelocity = 8.5;
  };

  const resize = () => {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    const viewHeight = 24;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.left = -viewHeight * (width / height) / 2;
    camera.right = viewHeight * (width / height) / 2;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const onKeyDown = (event: KeyboardEvent) => {
    if (uiBridge.typing) return;
    if (event.key === "F2") {
      event.preventDefault();
      setEditorEnabled(!editorEnabled);
      return;
    }
    if (editorEnabled) {
      const key = event.key.toLowerCase();
      if (key === "w") nudgeEditorObject(0, 0, 1, event.shiftKey);
      if (key === "a") nudgeEditorObject(1, 0, 0, event.shiftKey);
      if (key === "s") nudgeEditorObject(0, 0, -1, event.shiftKey);
      if (key === "d") nudgeEditorObject(-1, 0, 0, event.shiftKey);
      if (key === "q" || key === "arrowup") nudgeEditorObject(0, 1, 0, event.shiftKey);
      if (key === "z" || key === "arrowdown") nudgeEditorObject(0, -1, 0, event.shiftKey);
      if (key === "e") transformControls.setMode("rotate");
      if (key === "r") transformControls.setMode("scale");
      if (event.key === "Escape") selectEditorObject(null, null);
      if (["w", "a", "s", "d", "q", "z", "arrowup", "arrowdown", "e", "r", "escape"].includes(key)) event.preventDefault();
      return;
    }
    keys.add(event.key.toLowerCase());
    if (event.key === " " || event.key.startsWith("Arrow")) event.preventDefault();
    if (event.key === " ") requestJump();
    if (event.key.toLowerCase() === "e") uiBridge.onInteract();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase());
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  let dragging = false;
  let activePointerId: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  const onPointerDown = (event: PointerEvent) => {
    if (editorEnabled || !playing || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragging = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    host.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== activePointerId) return;
    cameraYaw -= (event.clientX - lastPointerX) * 0.005;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + (event.clientY - lastPointerY) * 0.008, 0.12, 0.95);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
  };
  const onWheel = (event: WheelEvent) => {
    if (editorEnabled || !playing) return;
    event.preventDefault();
    distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.01, 7, 18);
  };
  host.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  host.addEventListener("wheel", onWheel, { passive: false });

  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();

  const tick = () => {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    if (!editorEnabled) world.update(time, solved);
    if (editorEnabled) refreshEditorBounds();

    if (editorEnabled || !playing || !local || !profile) {
      orbitControls.enabled = true;
      orbitControls.update();
    } else {
      orbitControls.enabled = false;
      const typing = uiBridge.typing;
      const forward = typing
        ? 0
        : (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      const strafe = typing
        ? 0
        : (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      const ix = THREE.MathUtils.clamp(strafe + stickState.x, -1, 1);
      const iy = THREE.MathUtils.clamp(forward + stickState.y, -1, 1);
      const length = Math.hypot(ix, iy);
      const speed = (keys.has("shift") || length > 0.85 ? 9.2 : 5.4) * (length > 1 ? 1 : length);
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      const dx = (sin * iy - cos * ix) * speed * dt;
      const dz = (cos * iy + sin * ix) * speed * dt;
      const move = (nextX: number, nextZ: number) => {
        if (!isWalkable(nextX, nextZ)) return false;
        const nextSurface = surfaceY(nextX, nextZ);
        if (grounded && nextSurface !== null && nextSurface - playerY > 0.85) return false;
        x = nextX;
        z = nextZ;
        if (grounded) {
          // A lower or missing surface is an edge, not an instant teleport
          // down. Let gravity carry the avatar to the next supported block.
          if (nextSurface === null || nextSurface < playerY - 0.85) {
            grounded = false;
            jumpVelocity = 0;
          } else if (nextSurface !== null) {
            playerY = nextSurface;
          }
        }
        return true;
      };
      move(x + dx, z);
      move(x, z + dz);
      if (Math.hypot(dx, dz) > 0.0008) {
        ry = Math.atan2(dx, dz);
        moved = true;
      }
      if (!grounded) {
        const previousY = playerY;
        jumpVelocity -= 24 * dt;
        playerY += jumpVelocity * dt;
        const landingY = surfaceY(x, z);
        if (landingY !== null && jumpVelocity <= 0 && previousY >= landingY && playerY <= landingY) {
          playerY = landingY;
          jumpVelocity = 0;
          grounded = true;
        } else if (playerY < -14) {
          // Keep the fall physical, but recover after leaving the playable
          // world so a missed jump never strands the player off-camera.
          x = spawn.x;
          z = spawn.z;
          playerY = surfaceY(x, z) ?? groundY(x, z);
          jumpVelocity = 0;
          grounded = true;
        }
      }
      if (world.tryCollectCoin(x, z)) uiBridge.onCoinCollected();
      const bob = Math.sin(time * (moved ? 9 : 2)) * (moved ? 0.05 : 0.015);
      local.group.position.set(x, playerY + bob, z);
      local.group.rotation.y = ry;
      local.update(dt);
      const cameraTargetY = playerY + 1.35;
      const horizontalDistance = Math.cos(cameraPitch) * distance;
      desired.set(
        x - Math.sin(cameraYaw) * horizontalDistance,
        cameraTargetY + Math.sin(cameraPitch) * distance,
        z - Math.cos(cameraYaw) * horizontalDistance,
      );
      if (desired.y < cameraTargetY + 0.25) desired.y = cameraTargetY + 0.25;
      camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
      camera.lookAt(x, cameraTargetY, z);

      nearbyId = null;
      uiBridge.onNearby(null);
      const now = performance.now();
      if (moved && now - lastPoseAt > POSE_MS) {
        lastPoseAt = now;
        moved = false;
        uiBridge.onPose({ id: profile.id, x, z, ry });
      } else if (now - lastPoseAt > 4000) {
        lastPoseAt = now;
        uiBridge.onPose({ id: profile.id, x, z, ry });
      }
    }

    for (const [id, remote] of remotes) {
      if (performance.now() - remote.seen > 9000) {
        remote.avatar.dispose();
        scene.remove(remote.avatar.group);
        remotes.delete(id);
        continue;
      }
      remote.x = THREE.MathUtils.damp(remote.x, remote.tx, 8, dt);
      remote.z = THREE.MathUtils.damp(remote.z, remote.tz, 8, dt);
      remote.ry = dampAngle(remote.ry, remote.try, dt);
      remote.avatar.group.position.set(remote.x, surfaceY(remote.x, remote.z) ?? groundY(remote.x, remote.z), remote.z);
      remote.avatar.group.rotation.y = remote.ry;
      remote.avatar.update(dt);
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  tick();

  const api: GameApi = {
    jump: requestJump,
    enter(next) {
      profile = next;
      playing = true;
      x = spawn.x;
      z = spawn.z;
      ry = 0;
      playerY = surfaceY(x, z) ?? groundY(x, z);
      jumpVelocity = 0;
      grounded = true;
      cameraYaw = 0;
      cameraPitch = 0.4;
      distance = 12;
      orbitControls.enabled = false;
      const followHorizontalDistance = Math.cos(cameraPitch) * distance;
      camera.position.set(
        x - Math.sin(cameraYaw) * followHorizontalDistance,
        playerY + 1.35 + Math.sin(cameraPitch) * distance,
        z - Math.cos(cameraYaw) * followHorizontalDistance,
      );
      camera.lookAt(x, playerY + 1.35, z);
      if (!local) {
        local = makeAvatar(next);
        scene.add(local.group);
      } else {
        local.setProfile(next);
      }
      uiBridge.onPose({ id: next.id, x, z, ry });
    },
    leave() {
      playing = false;
      nearbyId = null;
      uiBridge.onNearby(null);
      if (local) {
        local.dispose();
        scene.remove(local.group);
        local = null;
      }
      for (const remote of remotes.values()) {
        remote.avatar.dispose();
        scene.remove(remote.avatar.group);
      }
      remotes.clear();
      profile = null;
    },
    setProfile(next) {
      profile = next;
      local?.setProfile(next);
    },
    applyProgress(progress) {
      solved = new Set(progress.solved);
    },
    upsertRemote(player) {
      if (profile && player.id === profile.id) return;
      let remote = remotes.get(player.id);
      if (!remote) {
        const avatar = makeAvatar(player);
        scene.add(avatar.group);
        remote = {
          avatar,
          x: player.x,
          z: player.z,
          ry: player.ry,
          tx: player.x,
          tz: player.z,
          try: player.ry,
          seen: performance.now(),
        };
        remotes.set(player.id, remote);
      }
      remote.avatar.setProfile(player);
      remote.tx = player.x;
      remote.tz = player.z;
      remote.try = player.ry;
      remote.seen = performance.now();
    },
    removeRemote(id) {
      const remote = remotes.get(id);
      if (!remote) return;
      remote.avatar.dispose();
      scene.remove(remote.avatar.group);
      remotes.delete(id);
    },
    nearby: () => nearbyId,
    adjustCamera(change) {
      cameraYaw += change.yaw ?? 0;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch + (change.pitch ?? 0), 0.12, 0.95);
      distance = THREE.MathUtils.clamp(distance + (change.distance ?? 0), 7, 18);
    },
    resetCamera() {
      cameraYaw = 0;
      cameraPitch = 0.4;
      distance = 12;
    },
    setEditorAccess(allowed) {
      editorCanWrite = allowed;
      if (!allowed && editorEnabled) setEditorEnabled(false);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      orbitControls.dispose();
      transformControls.removeEventListener("change", onTransformChange);
      transformControls.removeEventListener("dragging-changed", onTransformDragging);
      editorSaveButton.removeEventListener("click", onEditorSave);
      transformControls.dispose();
      canvas.removeEventListener("click", onEditorClick);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      host.removeEventListener("wheel", onWheel);
      api.leave();
      world.dispose();
      renderer.dispose();
      canvas.remove();
      labels.remove();
      editorHud.remove();
    },
  };

  return api;
}

export function setStick(x: number, y: number) {
  stickState.x = x;
  stickState.y = y;
}

const stickState = { x: 0, y: 0 };

function dampAngle(current: number, target: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-dt * 8));
}
