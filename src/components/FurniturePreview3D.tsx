"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CameraControls, { type CameraAdjustment } from "@/components/CameraControls";
import { FURNITURE_BY_ID } from "@/game/furniture";

type Props = { assetId: string };
type PreviewCamera = { yaw: number; pitch: number; distance: number };

const DEFAULT_CAMERA: PreviewCamera = { yaw: 0.45, pitch: 0.18, distance: 4.8 };

export default function FurniturePreview3D({ assetId }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<PreviewCamera>({ ...DEFAULT_CAMERA });
  const [error, setError] = useState(false);
  const item = FURNITURE_BY_ID.get(assetId);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !item) return;
    setError(false);
    cameraRef.current = { ...DEFAULT_CAMERA };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bde8ef");
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 0.78, 0);
    const cameraPosition = new THREE.Vector3();
    const updateCamera = () => {
      const { yaw, pitch, distance } = cameraRef.current;
      const horizontal = Math.cos(pitch) * distance;
      cameraPosition.set(Math.sin(yaw) * horizontal, target.y + Math.sin(pitch) * distance, Math.cos(yaw) * horizontal);
      camera.position.lerp(cameraPosition, 0.3);
      camera.lookAt(target);
    };
    camera.position.set(0, 1.5, DEFAULT_CAMERA.distance);
    camera.lookAt(target);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff7df", "#b77c5b", 2.5));
    const light = new THREE.DirectionalLight("#fff3cf", 3.4);
    light.position.set(-3, 6, 4);
    light.castShadow = true;
    scene.add(light);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: "#e7b478", roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const group = new THREE.Group();
    scene.add(group);
    let disposed = false;
    new GLTFLoader().load(item.path, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 1.9 / Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      group.add(model);
    }, undefined, () => {
      if (!disposed) setError(true);
    });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const controls = cameraRef.current;
      controls.yaw -= (event.clientX - lastX) * 0.012;
      controls.pitch = THREE.MathUtils.clamp(controls.pitch + (event.clientY - lastY) * 0.008, -0.22, 0.9);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const stopDragging = () => { dragging = false; };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraRef.current.distance = THREE.MathUtils.clamp(cameraRef.current.distance + event.deltaY * 0.004, 3, 8);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", stopDragging);
    renderer.domElement.addEventListener("pointercancel", stopDragging);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

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
      group.rotation.y += delta * 0.18;
      updateCamera();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", stopDragging);
      renderer.domElement.removeEventListener("pointercancel", stopDragging);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
    };
  }, [item]);

  const adjustCamera = (change: CameraAdjustment) => {
    const controls = cameraRef.current;
    controls.yaw += change.yaw ?? 0;
    controls.pitch = THREE.MathUtils.clamp(controls.pitch + (change.pitch ?? 0), -0.22, 0.9);
    controls.distance = THREE.MathUtils.clamp(controls.distance + (change.distance ?? 0), 3, 8);
  };

  const resetCamera = () => { cameraRef.current = { ...DEFAULT_CAMERA }; };

  if (!item) return <div className="furniture-preview-empty">找不到這件家具。</div>;
  return (
    <div className="furniture-preview-3d" ref={mountRef} aria-label={`${item.name} 3D 預覽`}>
      <CameraControls onAdjust={adjustCamera} onReset={resetCamera} label="家具預覽視角控制" />
      <span className="furniture-preview-hint">拖曳旋轉 · 滾輪縮放</span>
      {error ? <span className="furniture-preview-error">模型載入失敗，請稍後再試</span> : null}
    </div>
  );
}
