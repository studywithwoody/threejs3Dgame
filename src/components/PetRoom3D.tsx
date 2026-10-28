"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import CameraControls, { type CameraAdjustment } from "@/components/CameraControls";
import type { PetSpecies, PetState } from "@/game/types";
import { FURNITURE_BY_ID, type RoomFurniture } from "@/game/furniture";

type Props = {
  pets?: PetState[];
  onInteract?: (pet: PetState) => void;
  furniture?: RoomFurniture[];
  editing?: boolean;
  selectedFurnitureId?: string | null;
  onSelectFurniture?: (id: string | null) => void;
  onFurnitureChange?: (furniture: RoomFurniture[]) => void;
};

const MODEL_PATHS: Record<PetSpecies, string> = {
  bunny: "/assets/cube-pets/Models/GLB%20format/animal-bunny.glb",
  cat: "/assets/cube-pets/Models/GLB%20format/animal-cat.glb",
  dog: "/assets/cube-pets/Models/GLB%20format/animal-dog.glb",
  chicken: "/assets/cube-pets/Models/GLB%20format/animal-chick.glb",
  beaver: "/assets/cube-pets/Models/GLB%20format/animal-beaver.glb",
  cow: "/assets/cube-pets/Models/GLB%20format/animal-cow.glb",
  deer: "/assets/cube-pets/Models/GLB%20format/animal-deer.glb",
  fox: "/assets/cube-pets/Models/GLB%20format/animal-fox.glb",
  panda: "/assets/cube-pets/Models/GLB%20format/animal-panda.glb",
  penguin: "/assets/cube-pets/Models/GLB%20format/animal-penguin.glb",
};

const CAMERA_TARGET = new THREE.Vector3(0, 1.1, 0);
const CAMERA_DEFAULT = { yaw: 0, pitch: 0.14, distance: 8.2 };
// The room is roughly 10.8 world units wide, so this keeps each pet close to
// one fifth of the room while leaving enough space for five pets to wander.
const PET_MODEL_HEIGHT = 1.25;
const PET_SPOTS = [
  new THREE.Vector3(-2.25, 0, 0.9),
  new THREE.Vector3(2.25, 0, 0.9),
  new THREE.Vector3(-1.35, 0, -1.25),
  new THREE.Vector3(1.35, 0, -1.25),
  new THREE.Vector3(0, 0, 1.9),
];
type CameraControls = typeof CAMERA_DEFAULT;

export default function PetRoom3D({ pets = [], onInteract, furniture = [], editing = false, selectedFurnitureId = null, onSelectFurniture, onFurnitureChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef(onInteract);
  const selectFurnitureRef = useRef(onSelectFurniture);
  const furnitureChangeRef = useRef(onFurnitureChange);
  const cameraControlsRef = useRef<CameraControls>({ ...CAMERA_DEFAULT });
  interactRef.current = onInteract;
  selectFurnitureRef.current = onSelectFurniture;
  furnitureChangeRef.current = onFurnitureChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bde8ef");
    scene.fog = new THREE.Fog("#bde8ef", 8, 22);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const cameraTarget = CAMERA_TARGET.clone();
    const cameraPosition = new THREE.Vector3();
    const getCameraPosition = () => {
      const { yaw, pitch, distance } = cameraControlsRef.current;
      const horizontal = Math.cos(pitch) * distance;
      return cameraPosition.set(
        Math.sin(yaw) * horizontal,
        CAMERA_TARGET.y + Math.sin(pitch) * distance,
        Math.cos(yaw) * horizontal,
      );
    };
    camera.position.copy(getCameraPosition());
    camera.lookAt(cameraTarget);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff7df", "#b77c5b", 2.4));
    const sun = new THREE.DirectionalLight("#fff3cf", 3.4);
    sun.position.set(-3, 7, 5);
    sun.castShadow = true;
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 48),
      new THREE.MeshStandardMaterial({ color: "#e7b478", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.15, 48),
      new THREE.MeshStandardMaterial({ color: "#ec9174", roughness: 1 }),
    );
    rug.scale.set(1.35, 1, 0.55);
    rug.position.y = 0.015;
    rug.receiveShadow = true;
    scene.add(rug);

    const plant = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.62, 10), new THREE.MeshStandardMaterial({ color: "#d97855" }));
    pot.position.y = 0.31;
    plant.add(pot);
    for (let i = 0; i < 5; i += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: "#76a86d" }));
      leaf.scale.set(0.6, 1.5, 0.35);
      leaf.position.set(Math.cos(i * 1.25) * 0.25, 0.82 + (i % 2) * 0.12, Math.sin(i * 1.25) * 0.18);
      plant.add(leaf);
    }
    plant.position.set(-2.8, 0, -0.4);
    scene.add(plant);

    const loader = new GLTFLoader();
    const furnitureGroups = new Map<string, THREE.Group>();
    const furnitureRoot = new THREE.Group();
    furnitureRoot.name = "room-furniture";
    scene.add(furnitureRoot);
    const editorGrid = new THREE.GridHelper(10, 20, "#d97855", "#ffffff");
    editorGrid.position.y = 0.02;
    editorGrid.visible = editing;
    scene.add(editorGrid);
    const editorBox = new THREE.Box3();
    const editorBoxHelper = new THREE.Box3Helper(editorBox, "#d97855");
    editorBoxHelper.visible = false;
    scene.add(editorBoxHelper);
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode("translate");
    transformControls.enabled = editing;
    scene.add(transformControls.getHelper());
    type PetActor = {
      pet: PetState;
      group: THREE.Group;
      mixer: THREE.AnimationMixer;
      clips: THREE.AnimationClip[];
      mode: "idle" | "walk" | "sit";
      activeAction: THREE.AnimationAction | null;
      nextWander: number;
      homeX: number;
      homeZ: number;
      targetX: number;
      targetZ: number;
      petJump: number;
    };
    const actors: PetActor[] = [];

    const syncFurniture = () => {
      const active = new Set(furniture.map((item) => item.id));
      for (const [id, group] of furnitureGroups) {
        if (!active.has(id)) {
          furnitureRoot.remove(group);
          furnitureGroups.delete(id);
        }
      }
      furniture.forEach((item) => {
        const catalog = FURNITURE_BY_ID.get(item.assetId);
        if (!catalog) return;
        const group = furnitureGroups.get(item.id);
        if (group) {
          group.position.set(...item.position);
          group.rotation.set(...item.rotation);
          group.scale.set(...item.scale);
          return;
        }
        loader.load(catalog.path, (gltf) => {
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const normalized = 1.5 / Math.max(size.y, size.x, size.z, 0.001);
          model.scale.setScalar(normalized);
          model.position.y = -bounds.min.y * normalized;
          model.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
          const itemGroup = new THREE.Group();
          itemGroup.name = item.id;
          itemGroup.position.set(...item.position);
          itemGroup.rotation.set(...item.rotation);
          itemGroup.scale.set(...item.scale);
          itemGroup.add(model);
          furnitureGroups.set(item.id, itemGroup);
          furnitureRoot.add(itemGroup);
          if (selectedFurnitureId === item.id && editing) transformControls.attach(itemGroup);
        }, undefined, () => undefined);
      });
    };
    syncFurniture();
    const selectedGroup = () => selectedFurnitureId ? furnitureGroups.get(selectedFurnitureId) ?? null : null;
    const updateEditorBounds = () => {
      const group = selectedGroup();
      editorBoxHelper.visible = Boolean(group && editing);
      if (!group || !editing) return;
      editorBox.setFromObject(group);
      editorBoxHelper.updateMatrixWorld(true);
    };
    const collectFurniture = () => [...furnitureGroups.entries()].map(([id, group]) => ({ id, assetId: furniture.find((item) => item.id === id)?.assetId ?? "", position: [group.position.x, group.position.y, group.position.z] as [number, number, number], rotation: [group.rotation.x, group.rotation.y, group.rotation.z] as [number, number, number], scale: [group.scale.x, group.scale.y, group.scale.z] as [number, number, number] })).filter((item) => FURNITURE_BY_ID.has(item.assetId));
    if (editing && selectedFurnitureId) {
      const selected = selectedGroup();
      if (selected) transformControls.attach(selected);
    }
    const onTransformChange = () => updateEditorBounds();
    const onTransformEnd = (event: { value: unknown }) => { if (event.value === false) furnitureChangeRef.current?.(collectFurniture()); };
    transformControls.addEventListener("change", onTransformChange);
    transformControls.addEventListener("dragging-changed", onTransformEnd);

    const addTombstone = (group: THREE.Group) => {
      const tombstone = new THREE.Group();
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.02, 0.3), new THREE.MeshStandardMaterial({ color: "#8f8b91", roughness: 1 }));
      stone.position.y = 0.51;
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.34), stone.material);
      crossbar.position.set(0, 0.79, 0.03);
      tombstone.add(stone, crossbar);
      tombstone.position.set(0, 0, 0.05);
      group.add(tombstone);
      return tombstone;
    };

    pets.slice(0, PET_SPOTS.length).forEach((pet, index) => {
      const spot = PET_SPOTS[index];
      const group = new THREE.Group();
      group.position.set(spot.x, 0.1, spot.z);
      scene.add(group);
      const actor: PetActor = {
        pet,
        group,
        mixer: new THREE.AnimationMixer(group),
        clips: [],
        mode: "idle",
        activeAction: null,
        nextWander: 2 + index * 0.8,
        homeX: spot.x,
        homeZ: spot.z,
        targetX: spot.x,
        targetZ: spot.z,
        petJump: 0,
      };
      actors.push(actor);

      if (pet.status === "dead") {
        addTombstone(group);
        group.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
        return;
      }

      loader.load(
        MODEL_PATHS[pet.species],
        (gltf) => {
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const scale = PET_MODEL_HEIGHT / Math.max(size.y, 0.001);
          model.scale.setScalar(scale);
          model.position.y = 0.08 - bounds.min.y * scale;
          model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.castShadow = true;
              object.receiveShadow = true;
            }
          });
          group.add(model);
          actor.clips = gltf.animations;
          chooseAction(actor, pet.status === "sick" ? "sit" : "idle");
        },
        undefined,
        () => {
          const fallback = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: "#f2c36b" }));
          fallback.position.y = 0.5;
          fallback.castShadow = true;
          group.add(fallback);
        },
      );
    });

    const chooseAction = (actor: PetActor, name: "idle" | "walk" | "sit") => {
      const clip = THREE.AnimationClip.findByName(actor.clips, name) ?? actor.clips[0];
      if (!clip || actor.activeAction?.getClip() === clip) return;
      const next = actor.mixer.clipAction(clip);
      next.reset().fadeIn(0.25).play();
      actor.activeAction?.fadeOut(0.25);
      actor.activeAction = next;
      actor.mode = name;
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredActor: PetActor | null = null;
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const furnitureHit = editing ? raycaster.intersectObjects([...furnitureGroups.values()], true)[0] : null;
      hoveredActor = actors.find((actor) => actor.group.visible && raycaster.intersectObjects(actor.group.children, true).length > 0) ?? null;
      renderer.domElement.style.cursor = furnitureHit || hoveredActor ? "pointer" : "default";
    };
    const onClick = () => {
      if (editing) {
        const hit = raycaster.intersectObjects([...furnitureGroups.values()], true)[0];
        if (hit) {
          let root: THREE.Object3D | null = hit.object;
          while (root?.parent && root.parent !== furnitureRoot) root = root.parent;
          const id = root?.name ?? null;
          selectFurnitureRef.current?.(id);
          if (root) transformControls.attach(root);
          updateEditorBounds();
        } else selectFurnitureRef.current?.(null);
        return;
      }
      if (!hoveredActor) return;
      hoveredActor.petJump = 1;
      interactRef.current?.(hoveredActor.pet);
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      camera.position.lerp(getCameraPosition(), Math.min(delta * 7, 1));
      camera.lookAt(cameraTarget);
      actors.forEach((actor) => {
        actor.mixer.update(delta);
        if (actor.pet.status === "healthy" && actor.group.visible) {
          actor.nextWander -= delta;
          if (actor.nextWander <= 0) {
            actor.nextWander = 4 + Math.random() * 4;
            actor.targetX = THREE.MathUtils.clamp(actor.homeX + (Math.random() - 0.5) * 1.4, -3.5, 3.5);
            actor.targetZ = THREE.MathUtils.clamp(actor.homeZ + (Math.random() - 0.5) * 1.2, -2.1, 2.5);
            actor.mode = Math.random() > 0.4 ? "walk" : "idle";
          }
          actor.group.position.x += (actor.targetX - actor.group.position.x) * Math.min(delta * 1.8, 1);
          actor.group.position.z += (actor.targetZ - actor.group.position.z) * Math.min(delta * 1.8, 1);
          if (actor.mode === "walk") actor.group.rotation.y = actor.targetX >= actor.group.position.x ? 0.12 : Math.PI - 0.12;
        } else if (actor.pet.status === "sick") {
          actor.group.rotation.z = Math.sin(elapsed * 1.8 + actor.homeX) * 0.035;
        }
        if (actor.petJump > 0) {
          actor.petJump = Math.max(0, actor.petJump - delta * 2.8);
          actor.group.position.y = Math.sin((1 - actor.petJump) * Math.PI) * 0.42;
        } else {
          actor.group.position.y = actor.pet.status === "healthy" ? Math.sin(elapsed * 2.2 + actor.homeX) * 0.025 : 0.1;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      transformControls.removeEventListener("change", onTransformChange);
      transformControls.removeEventListener("dragging-changed", onTransformEnd);
      transformControls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, [pets]);

  const adjustCamera = (change: CameraAdjustment) => {
    const controls = cameraControlsRef.current;
    cameraControlsRef.current = {
      yaw: controls.yaw + (change.yaw ?? 0),
      pitch: THREE.MathUtils.clamp(controls.pitch + (change.pitch ?? 0), -0.18, 1.05),
      distance: THREE.MathUtils.clamp(controls.distance + (change.distance ?? 0), 5.4, 11),
    };
  };

  const resetCamera = () => {
    cameraControlsRef.current = { ...CAMERA_DEFAULT };
  };

  return (
    <div className={`pet-room-3d ${editing ? "is-editing" : ""} status-${pets.some((pet) => pet.status === "sick") ? "sick" : "healthy"}`} ref={mountRef}>
      <CameraControls onAdjust={adjustCamera} onReset={resetCamera} label="寵物房間視角控制" />
      <span className="pet-expression" aria-hidden="true">
        {pets.length === 0 ? "🏠" : pets.some((pet) => pet.status === "sick") ? "🤒" : "😊"}
      </span>
      {pets.length > 0 ? <span className="pet-count">小屋裡有 {pets.length} 位小夥伴</span> : null}
      <span className="pet-3d-hint">方向鍵調整視角，＋／－縮放</span>
    </div>
  );
}
