"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PetState } from "@/game/types";

type Props = {
  pet?: PetState;
  onInteract?: () => void;
};

const MODEL_PATHS: Record<PetState["species"], string> = {
  bunny: "/pets/chick.glb",
  cat: "/pets/cat.glb",
  dog: "/pets/dog.glb",
};

const CAMERA_VIEWS = [
  { label: "正面", position: new THREE.Vector3(0, 2.25, 8.2), target: new THREE.Vector3(0, 1.25, 0) },
  { label: "側面", position: new THREE.Vector3(6.4, 2.35, 5.1), target: new THREE.Vector3(0, 1.2, 0) },
  { label: "俯視", position: new THREE.Vector3(0, 6.8, 5.8), target: new THREE.Vector3(0, 0.65, 0) },
];

export default function PetRoom3D({ pet, onInteract }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef(onInteract);
  const cameraViewRef = useRef(0);
  const [cameraView, setCameraView] = useState(0);
  interactRef.current = onInteract;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bde8ef");
    scene.fog = new THREE.Fog("#bde8ef", 8, 22);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const cameraTarget = new THREE.Vector3();
    const view = CAMERA_VIEWS[cameraViewRef.current];
    camera.position.copy(view.position);
    cameraTarget.copy(view.target);
    camera.lookAt(view.target);
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

    const group = new THREE.Group();
    group.position.y = 0.1;
    scene.add(group);
    const loader = new GLTFLoader();
    const mixer = new THREE.AnimationMixer(group);
    let model: THREE.Object3D | null = null;
    let activeAction: THREE.AnimationAction | null = null;
    let clips: THREE.AnimationClip[] = [];
    let mode: "idle" | "walk" | "sit" = "idle";
    let nextWander = 3;
    let targetX = 0;
    let petJump = 0;
    let hovered = false;

    const chooseAction = (name: "idle" | "walk" | "sit") => {
      const clip = THREE.AnimationClip.findByName(clips, name) ?? clips[0];
      if (!clip || activeAction?.getClip() === clip) return;
      const next = mixer.clipAction(clip);
      next.reset().fadeIn(0.25).play();
      activeAction?.fadeOut(0.25);
      activeAction = next;
      mode = name;
    };

    loader.load(
      MODEL_PATHS[pet?.species ?? "bunny"],
      (gltf) => {
        model = gltf.scene;
        model.scale.setScalar(2.05);
        model.position.y = 0.08;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        group.add(model);
        clips = gltf.animations;
        chooseAction(pet?.status === "sick" ? "sit" : "idle");
      },
      undefined,
      () => {
        const fallback = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 12), new THREE.MeshStandardMaterial({ color: "#f2c36b" }));
        fallback.position.y = 0.82;
        fallback.castShadow = true;
        group.add(fallback);
      },
    );

    const tombstone = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.35), new THREE.MeshStandardMaterial({ color: "#8f8b91", roughness: 1 }));
    stone.position.y = 0.68;
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), stone.material);
    crossbar.position.set(0, 1.05, 0.03);
    tombstone.add(stone, crossbar);
    tombstone.position.set(0, 0, 0.05);
    tombstone.visible = pet?.status === "dead";
    scene.add(tombstone);
    if (pet?.status === "dead") group.visible = false;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      hovered = group.visible && raycaster.intersectObjects(group.children, true).length > 0;
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";
    };
    const onClick = () => {
      if (!hovered || !group.visible) return;
      petJump = 1;
      interactRef.current?.();
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
      const nextView = CAMERA_VIEWS[cameraViewRef.current];
      camera.position.lerp(nextView.position, Math.min(delta * 5, 1));
      cameraTarget.lerp(nextView.target, Math.min(delta * 5, 1));
      camera.lookAt(cameraTarget);
      mixer.update(delta);
      if (pet?.status === "healthy" && group.visible) {
        nextWander -= delta;
        if (nextWander <= 0) {
          nextWander = 4 + Math.random() * 4;
          targetX = (Math.random() - 0.5) * 2.5;
          chooseAction(Math.random() > 0.4 ? "walk" : "idle");
        }
        group.position.x += (targetX - group.position.x) * Math.min(delta * 1.8, 1);
        if (mode === "walk") group.rotation.y = targetX >= group.position.x ? 0.12 : Math.PI - 0.12;
      } else if (pet?.status === "sick") {
        group.rotation.z = Math.sin(elapsed * 1.8) * 0.035;
      }
      if (petJump > 0) {
        petJump = Math.max(0, petJump - delta * 2.8);
        group.position.y = Math.sin((1 - petJump) * Math.PI) * 0.55;
      } else {
        group.position.y = pet?.status === "healthy" ? Math.sin(elapsed * 2.2) * 0.025 : 0.1;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
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
  }, [pet?.species, pet?.status]);

  const rotateCamera = () => {
    const nextView = (cameraView + 1) % CAMERA_VIEWS.length;
    cameraViewRef.current = nextView;
    setCameraView(nextView);
  };

  return (
    <div className={`pet-room-3d status-${pet?.status ?? "healthy"}`} ref={mountRef}>
      <button
        className="pet-camera-button"
        type="button"
        aria-label={`切換寵物房間視角，目前為${CAMERA_VIEWS[cameraView].label}視角`}
        onClick={rotateCamera}
      >
        ↻ {CAMERA_VIEWS[cameraView].label}視角
      </button>
      <span className="pet-expression" aria-hidden="true">
        {pet?.status === "dead" ? "🪦" : pet?.status === "sick" ? "🤒" : "😊"}
      </span>
      <span className="pet-3d-hint">點一下寵物和牠互動</span>
    </div>
  );
}
