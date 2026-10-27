"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export default function CharacterPreview3D({ modelId }: { modelId: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bde8ef");
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 1.4, 5.5);
    camera.lookAt(0, 0.95, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight("#fff7df", "#b77c5b", 2.5));
    const light = new THREE.DirectionalLight("#fff3cf", 3.2);
    light.position.set(-3, 6, 4);
    scene.add(light);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 40),
      new THREE.MeshStandardMaterial({ color: "#e7b478", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const group = new THREE.Group();
    scene.add(group);
    const loader = new GLTFLoader();
    let mixer: THREE.AnimationMixer | null = null;
    let frame = 0;
    let disposed = false;
    loader.load(
      `/characters/${modelId}.glb`,
      (gltf) => {
        if (disposed) return;
        const model = SkeletonUtils.clone(gltf.scene);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 1.8 / Math.max(size.y, 0.001);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        model.traverse((object) => {
          object.castShadow = true;
          object.receiveShadow = true;
        });
        group.add(model);
        mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(model) : null;
        if (mixer && gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
      },
      undefined,
      () => undefined,
    );

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
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      group.rotation.y += delta * 0.55;
      mixer?.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
    };
  }, [modelId]);

  return <div className="character-preview-3d" ref={mountRef} aria-label="角色 3D 預覽" />;
}
