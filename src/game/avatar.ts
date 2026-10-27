import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Profile } from "@/game/types";

export const BLOCKY_MODELS = [
  { id: "character-a", label: "曙光探險家" },
  { id: "character-b", label: "森林漫遊者" },
  { id: "character-c", label: "海島守護者" },
  { id: "character-d", label: "星空旅人" },
  { id: "character-e", label: "活力同學" },
  { id: "character-f", label: "陽光夥伴" },
] as const;

const modelLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>>();

function loadBlockyModel(id: string) {
  const model = BLOCKY_MODELS.some((item) => item.id === id) ? id : BLOCKY_MODELS[0].id;
  const cached = modelCache.get(model);
  if (cached) return cached;
  const promise = modelLoader.loadAsync(`/characters/${model}.glb`);
  modelCache.set(model, promise);
  return promise;
}

const skin = new THREE.MeshStandardMaterial({ color: "#f3c7a6", roughness: 0.72 });
const eyeWhite = new THREE.MeshStandardMaterial({ color: "#fffaf6", roughness: 0.4 });
const pupil = new THREE.MeshStandardMaterial({ color: "#2a211c", roughness: 0.35 });
const shoe = new THREE.MeshStandardMaterial({ color: "#3c342f", roughness: 0.8 });

const headGeo = new THREE.SphereGeometry(0.34, 18, 14);
const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.46, 4, 10);
const limbGeo = new THREE.CapsuleGeometry(0.08, 0.28, 3, 6);
const eyeGeo = new THREE.SphereGeometry(0.055, 10, 8);
const pupilGeo = new THREE.SphereGeometry(0.028, 8, 6);

export type Avatar = {
  group: THREE.Group;
  body: THREE.Mesh;
  label: HTMLElement;
  photo: HTMLImageElement;
  setProfile: (profile: Profile) => void;
  update: (delta: number) => void;
  dispose: () => void;
};

export function makeAvatar(profile: Profile): Avatar {
  const group = new THREE.Group();
  const fallback = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: profile.color, roughness: 0.62 });
  const body = new THREE.Mesh(bodyGeo, cloth);
  body.position.y = 0.78;
  body.castShadow = true;
  const head = new THREE.Mesh(headGeo, skin);
  head.position.y = 1.42;
  head.castShadow = true;
  const legL = new THREE.Mesh(limbGeo, cloth);
  legL.position.set(-0.12, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.12;
  const armL = new THREE.Mesh(limbGeo, skin);
  armL.position.set(-0.38, 0.86, 0);
  armL.rotation.z = 0.35;
  const armR = armL.clone();
  armR.position.x = 0.38;
  armR.rotation.z = -0.35;
  const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), shoe);
  shoeL.scale.set(1.1, 0.55, 1.5);
  shoeL.position.set(-0.12, 0.08, 0.06);
  const shoeR = shoeL.clone();
  shoeR.position.x = 0.12;
  const eyeL = new THREE.Mesh(eyeGeo, eyeWhite);
  eyeL.position.set(-0.1, 1.46, 0.26);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  const pupilL = new THREE.Mesh(pupilGeo, pupil);
  pupilL.position.set(-0.1, 1.45, 0.31);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.1;

  fallback.add(body, head, legL, legR, armL, armR, shoeL, shoeR, eyeL, eyeR, pupilL, pupilR);
  group.add(fallback);

  let model: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let requestId = 0;
  let disposed = false;

  const labelEl = document.createElement("div");
  labelEl.className = "nameplate";
  const photo = document.createElement("img");
  photo.alt = "";
  photo.referrerPolicy = "no-referrer";
  const name = document.createElement("span");
  labelEl.append(photo, name);
  const label = new CSS2DObject(labelEl);
  label.position.set(0, 2.05, 0);
  group.add(label);

  const avatar: Avatar = {
    group,
    body,
    label: labelEl,
    photo,
    setProfile(next) {
      cloth.color.set(next.color);
      name.textContent = next.name;
      if (next.image) {
        photo.src = next.image;
        photo.hidden = false;
      } else {
        photo.removeAttribute("src");
        photo.hidden = true;
      }
      const currentRequest = ++requestId;
      void loadBlockyModel(next.avatarModel ?? BLOCKY_MODELS[0].id)
        .then((gltf) => {
          if (disposed || currentRequest !== requestId) return;
          if (model) group.remove(model);
          model = SkeletonUtils.clone(gltf.scene);
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const scale = 1.9 / Math.max(size.y, 0.001);
          model.scale.setScalar(scale);
          model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
          model.traverse((child) => {
            child.castShadow = true;
            child.receiveShadow = true;
          });
          group.add(model);
          fallback.visible = false;
          mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(model) : null;
          const clip = gltf.animations[0];
          if (mixer && clip) mixer.clipAction(clip).play();
        })
        .catch(() => {
          // Keep the geometric fallback if the static asset cannot be loaded.
        });
    },
    update(delta) {
      mixer?.update(delta);
    },
    dispose() {
      disposed = true;
      requestId += 1;
      mixer?.stopAllAction();
      mixer = null;
      if (model) group.remove(model);
      cloth.dispose();
      shoeL.geometry.dispose();
      labelEl.remove();
    },
  };
  avatar.setProfile(profile);
  return avatar;
}
