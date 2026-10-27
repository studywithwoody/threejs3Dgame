import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { makeAvatar, type Avatar } from "@/game/avatar";
import { uiBridge } from "@/game/bridge";
import { buildIsland } from "@/game/island";
import { SPAWN, groundY, isWalkable, surfaceY } from "@/game/terrain";
import type { IslandProgress, Pose, Profile } from "@/game/types";
import type { CameraAdjustment } from "@/components/CameraControls";

const POSE_MS = 200;

export type GameApi = {
  enter: (profile: Profile) => void;
  leave: () => void;
  setProfile: (profile: Profile) => void;
  applyProgress: (progress: IslandProgress) => void;
  upsertRemote: (player: Profile & Pose) => void;
  removeRemote: (id: string) => void;
  nearby: () => string | null;
  adjustCamera: (change: CameraAdjustment) => void;
  resetCamera: () => void;
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

export function mountIsland(host: HTMLElement): GameApi {
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
  const world = buildIsland(scene);
  const orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.enablePan = true;
  orbitControls.minZoom = 0.7;
  orbitControls.maxZoom = 2.8;
  orbitControls.target.set(0, 3, 4);
  orbitControls.update();

  const keys = new Set<string>();
  let playing = false;
  let profile: Profile | null = null;
  let local: Avatar | null = null;
  let x = SPAWN.x;
  let z = SPAWN.z;
  let ry = 0;
  let cameraYaw = 0;
  let cameraPitch = 0.4;
  let distance = 12;
  let playerY = 0;
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
    keys.add(event.key.toLowerCase());
    if (event.key === " " || event.key.startsWith("Arrow")) event.preventDefault();
    if (event.key === " " && playing && !uiBridge.typing && grounded) {
      grounded = false;
      jumpVelocity = 8.5;
    }
    if (event.key.toLowerCase() === "e") uiBridge.onInteract();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase());
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  let dragging = false;
  let lastPointer = 0;
  const onPointerDown = (event: PointerEvent) => {
    if (!playing || event.button !== 0) return;
    dragging = true;
    lastPointer = event.clientX;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    cameraYaw -= (event.clientX - lastPointer) * 0.005;
    lastPointer = event.clientX;
  };
  const onPointerUp = () => {
    dragging = false;
  };
  const onWheel = (event: WheelEvent) => {
    if (!playing) return;
    event.preventDefault();
    distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.01, 7, 18);
  };
  host.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  host.addEventListener("wheel", onWheel, { passive: false });

  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();

  const tick = () => {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    world.update(time, solved);

    if (!playing || !local || !profile) {
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
        if (grounded && nextSurface - playerY > 0.85) return false;
        x = nextX;
        z = nextZ;
        if (grounded) playerY = nextSurface;
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
        if (jumpVelocity <= 0 && previousY >= landingY && playerY <= landingY) {
          playerY = landingY;
          jumpVelocity = 0;
          grounded = true;
        } else if (playerY <= 0) {
          playerY = 0;
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
      camera.position.lerp(desired, 1 - Math.exp(-dt * 4.5));
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
      remote.avatar.group.position.set(remote.x, groundY(remote.x, remote.z), remote.z);
      remote.avatar.group.rotation.y = remote.ry;
      remote.avatar.update(dt);
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  tick();

  const api: GameApi = {
    enter(next) {
      profile = next;
      playing = true;
      x = SPAWN.x;
      z = SPAWN.z;
      ry = 0;
      playerY = 0;
      jumpVelocity = 0;
      grounded = true;
      cameraYaw = 0;
      cameraPitch = 0.4;
      distance = 12;
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
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      orbitControls.dispose();
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("wheel", onWheel);
      api.leave();
      world.dispose();
      renderer.dispose();
      canvas.remove();
      labels.remove();
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
