import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { Profile } from "@/game/types";

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
  bubble: HTMLElement;
  bubbleTimer: number;
  setProfile: (profile: Profile) => void;
  say: (text: string) => void;
  dispose: () => void;
};

export function makeAvatar(profile: Profile): Avatar {
  const group = new THREE.Group();
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

  group.add(body, head, legL, legR, armL, armR, shoeL, shoeR, eyeL, eyeR, pupilL, pupilR);

  const labelEl = document.createElement("div");
  labelEl.className = "nameplate";
  const photo = document.createElement("img");
  photo.alt = "";
  photo.referrerPolicy = "no-referrer";
  const name = document.createElement("span");
  const bubble = document.createElement("b");
  bubble.className = "bubble";
  bubble.hidden = true;
  labelEl.append(photo, name, bubble);
  const label = new CSS2DObject(labelEl);
  label.position.set(0, 2.05, 0);
  group.add(label);

  let bubbleTimer = 0;

  const avatar: Avatar = {
    group,
    body,
    label: labelEl,
    photo,
    bubble,
    bubbleTimer,
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
    },
    say(text) {
      bubble.textContent = text;
      bubble.hidden = false;
      window.clearTimeout(bubbleTimer);
      bubbleTimer = window.setTimeout(() => {
        bubble.hidden = true;
      }, 5600);
    },
    dispose() {
      window.clearTimeout(bubbleTimer);
      cloth.dispose();
      shoeL.geometry.dispose();
      labelEl.remove();
    },
  };
  avatar.setProfile(profile);
  return avatar;
}
