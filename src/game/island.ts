import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PLACES, groundY, islandRadius, isWalkable, nearestPlatformAnchor } from "@/game/terrain";
import { platformerKitPath } from "@/game/platformerKit/registry";
import { PLATFORMER_SCENE_OBJECTS, type SceneObject, type SceneRegion } from "@/game/platformerKit/sceneConfig";

const WOOD = "#b8743d";
const WOOD_DARK = "#8a552c";
const CREAM = "#fff4ea";
const CORAL = "#e07a5f";
const SAGE = "#6e9a62";
const GLASS = "#d7f3e6";
const kitLoader = new GLTFLoader();
const kitCache = new Map<string, Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>>();

function std(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra });
}

export type IslandWorld = {
  update: (time: number, solved: ReadonlySet<string>) => void;
  tryCollectCoin: (x: number, z: number) => boolean;
  dispose: () => void;
};

export function buildIsland(scene: THREE.Scene): IslandWorld {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(object: T): T => {
    disposables.push(object);
    return object;
  };

  scene.background = new THREE.Color("#8bd7ef");
  scene.fog = new THREE.Fog("#b9ebf2", 48, 125);

  const hemi = new THREE.HemisphereLight("#fff1e4", "#7ea56a", 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff6ea", 1.65);
  sun.position.set(28, 36, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const skyGeo = new THREE.SphereGeometry(170, 28, 18);
  const skyColors: number[] = [];
  const skyPos = skyGeo.attributes.position;
  const top = new THREE.Color("#f6b89a");
  const mid = new THREE.Color("#f7e6d6");
  const horizon = new THREE.Color("#b7dceb");
  for (let i = 0; i < skyPos.count; i += 1) {
    const y = skyPos.getY(i) / 170;
    const color = y > 0.2 ? top.clone().lerp(mid, 1 - y) : horizon.clone().lerp(mid, THREE.MathUtils.clamp((y + 0.35) / 0.55, 0, 1));
    skyColors.push(color.r, color.g, color.b);
  }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  keep(skyGeo);

  const waterGeo = new THREE.CircleGeometry(86, 80);
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color("#7fd0c8") },
      uDeep: { value: new THREE.Color("#1d7c90") },
    },
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.16 + uTime * 1.2) * cos(p.y * 0.14 + uTime * 0.9) * 0.22;
        p.z += w;
        vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      varying float vWave;
      void main() {
        float t = clamp(0.45 + vWave * 1.8, 0.0, 1.0);
        gl_FragColor = vec4(mix(uDeep, uShallow, t), 0.94);
      }
    `,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.55;
  scene.add(water);
  keep(waterGeo);
  keep(waterMat);

  const course = buildReferenceScene(scene);

  return {
    update(time, solved) {
      waterMat.uniforms.uTime.value = time;
      course.update(time);
    },
    tryCollectCoin(x, z) {
      return course.tryCollectCoin(x, z);
    },
    dispose() {
      for (const item of disposables) item.dispose();
    },
  };
}

function buildReferenceScene(scene: THREE.Scene) {
  const worldScene = new THREE.Group();
  worldScene.name = "WorldScene";
  const regions = new Map<SceneRegion, THREE.Group>();
  for (const region of ["forest", "snow-mountain", "snow-valley", "highland", "floating"] as SceneRegion[]) {
    const group = new THREE.Group();
    group.name = `${region[0].toUpperCase()}${region.slice(1)}Region`;
    regions.set(region, group);
    worldScene.add(group);
  }
  scene.add(worldScene);

  const instances = new Map<string, THREE.Object3D>();
  const collectibles = PLATFORMER_SCENE_OBJECTS.filter((item) => item.collectible);
  const initialY = new Map<string, number>();

  for (const config of PLATFORMER_SCENE_OBJECTS) {
    const path = platformerKitPath(config.assetId);
    let request = kitCache.get(path);
    if (!request) {
      request = kitLoader.loadAsync(path);
      kitCache.set(path, request);
    }
    void request.then((gltf) => {
      const model = gltf.scene.clone(true);
      model.name = config.id;
      model.rotation.set(...config.rotation);
      model.scale.set(...config.scale);

      const isSupport = config.category === "terrain" || config.category === "snow" || config.category === "platform";
      const anchor = isSupport
        ? { x: config.position[0], z: config.position[2], top: config.position[1] }
        : nearestPlatformAnchor(config.position[0], config.position[2]);

      // GLB files have different local origins. Measure the scaled and
      // rotated model at Y=0, then move its lowest point onto the platform.
      // This avoids props floating above blocks or sinking into their tops.
      model.position.set(anchor.x, 0, anchor.z);
      const bounds = new THREE.Box3().setFromObject(model);
      model.position.y = isSupport
        ? config.position[1]
        : anchor.top - bounds.min.y + 0.025;
      model.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
      regions.get(config.region)?.add(model);
      instances.set(config.id, model);
      initialY.set(config.id, model.position.y);
    }).catch(() => {
      // Keep the scene deterministic when an optional browser request fails.
    });
  }

  return {
    update(time: number) {
      for (const config of collectibles) {
        const model = instances.get(config.id);
        if (!model) continue;
        model.rotation.y = time * 2.4;
        model.position.y = (initialY.get(config.id) ?? model.position.y) + Math.sin(time * 2.5 + model.position.x) * 0.12;
      }
      const floating = instances.get("floating-center");
      if (floating) floating.position.x = 9 + Math.sin(time * 1.1) * 2.5;
    },
    tryCollectCoin(x: number, z: number) {
      for (const config of collectibles) {
        if (Math.hypot(config.position[0] - x, config.position[2] - z) > 1.5) continue;
        const model = instances.get(config.id);
        if (!model || !model.visible) continue;
        model.visible = false;
        return true;
      }
      return false;
    },
  };
}

function buildPlatformerCourse(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const kitPath = (name: string) => `/assets/platformer-kit/Models/GLB%20format/${name}.glb`;
  const kitCoins: Array<THREE.Object3D | null> = [];
  const kitFlags: THREE.Object3D[] = [];
  const movingPlatforms: THREE.Object3D[] = [];
  const addKitModel = (name: string, position: THREE.Vector3, scale: number, target: Array<THREE.Object3D | null> = [], index = -1) => {
    const path = kitPath(name);
    let request = kitCache.get(path);
    if (!request) {
      request = kitLoader.loadAsync(path);
      kitCache.set(path, request);
    }
    void request.then((gltf) => {
      const model = gltf.scene.clone(true);
      model.position.copy(position);
      model.scale.setScalar(scale);
      model.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
      scene.add(model);
      if (index >= 0) target[index] = model;
      else target.push(model);
    }).catch(() => {
      // The level intentionally contains only Platformer Kit assets.
    });
  };

  // A grid of Kenney grass blocks is the island: no custom terrain mesh underneath.
  const groundTiles: Array<[number, number]> = [];
  for (let x = -18; x <= 18; x += 6) {
    for (let z = -18; z <= 18; z += 6) {
      if (Math.hypot(x, z + 1) < 22) groundTiles.push([x, z]);
    }
  }
  for (const [x, z] of groundTiles) {
    addKitModel("block-grass-large", new THREE.Vector3(x, 0, z), 2.2);
  }
  for (const [x, z, rotation] of [[-21, -15, 0], [21, -9, Math.PI], [-15, 21, Math.PI / 2], [15, 21, -Math.PI / 2]] as const) {
    addKitModel("block-grass-large-slope", new THREE.Vector3(x, 0, z), 2.2);
    void rotation;
  }

  const raisedPlatforms: Array<[string, number, number, number, number]> = [
    ["block-grass", -6, 2.4, -6, 1.8],
    ["platform-ramp", 0, 3.2, -1, 1.8],
    ["block-grass-large", 6, 4.8, 3, 1.65],
    ["block-grass-long", 3, 2.4, 12, 1.55],
    ["block-moving-blue", -8, 3.6, 9, 1.7],
    ["block-grass-low", -12, 1.4, -3, 1.4],
    ["block-grass-corner", 11, 2.0, -6, 1.5],
    ["platform-overhang", -12, 3.0, 6, 1.4],
    ["block-grass-large-slope", 12, 1.8, 12, 1.6],
  ];
  for (const [name, x, y, z, scale] of raisedPlatforms) {
    if (name === "block-moving-blue") {
      addKitModel(name, new THREE.Vector3(x, y, z), scale, movingPlatforms as Array<THREE.Object3D | null>);
    } else {
      addKitModel(name, new THREE.Vector3(x, y, z), scale);
    }
  }

  addKitModel("flag", new THREE.Vector3(3, 4.6, 12), 1.7, kitFlags);
  for (const [name, x, z, scale] of [
    ["tree-pine-small", -15, 3, 2.4],
    ["tree-pine-small", 15, -9, 2.2],
    ["tree-pine", -15, -15, 2.0],
    ["rocks", 15, 15, 1.4],
    ["flowers", -9, 15, 1.5],
    ["mushrooms", -15, 9, 1.2],
    ["fence-straight", 15, 9, 1.4],
    ["crate", 9, -15, 1.5],
  ] as const) addKitModel(name, new THREE.Vector3(x, 1.1, z), scale);

  const coinPositions = [[-6, 5.4, -6], [0, 6.2, -1], [6, 6.8, 3], [3, 5.6, 12], [-8, 5.8, 9]] as const;
  for (const [index, [x, y, z]] of coinPositions.entries()) {
    addKitModel("coin-gold", new THREE.Vector3(x, y, z), 1.1, kitCoins, index);
  }

  const coinSpots = coinPositions.map(([x, , z]) => ({ x, z, collected: false }));

  return {
    update(time: number) {
      for (const [index, coin] of kitCoins.entries()) {
        if (coin) coin.rotation.y = time * 2.4;
        if (coin) coin.position.y += Math.sin(time * 2.5 + index) * 0.002;
      }
      for (const kitFlag of kitFlags) kitFlag.rotation.y = Math.sin(time * 2) * 0.12;
      if (movingPlatforms[0]) movingPlatforms[0].position.x = -8 + Math.sin(time * 1.2) * 2.5;
    },
    tryCollectCoin(x: number, z: number) {
      for (let index = 0; index < coinSpots.length; index += 1) {
        const coin = coinSpots[index];
        if (coin.collected || Math.hypot(coin.x - x, coin.z - z) > 1.35) continue;
        coin.collected = true;
        kitCoins[index]?.traverse((child) => { child.visible = false; });
        return true;
      }
      return false;
    },
  };
}

function buildTerrain() {
  const rings = 32;
  const segs = 72;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const row = segs + 1;
  for (let i = 0; i <= rings; i += 1) {
    const u = i / rings;
    for (let j = 0; j <= segs; j += 1) {
      const theta = (j / segs) * Math.PI * 2;
      const edge = islandRadius(theta);
      const r = u * edge;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = groundY(x, z);
      positions.push(x, y, z);
      const noise = Math.sin(i * 12.3 + j * 4.7) * 0.015;
      if (u > 0.84 || y < 0.55) {
        colors.push(0.93 + noise, 0.78 + noise, 0.55);
      } else {
        const hill = THREE.MathUtils.clamp(y / 4.2, 0, 1);
        colors.push(0.34 + hill * 0.12 + noise, 0.58 + (1 - hill) * 0.12, 0.3 + noise);
      }
    }
  }
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segs; j += 1) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

function buildGrassPatches(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const grassMat = std("#79b85b", { roughness: 1 });
  keep(grassMat);
  const patches = [
    { x: 0, z: 10, rx: 4.8, rz: 3.55, phase: 0.2 },
    { x: 7.2, z: 16.4, rx: 2.55, rz: 2.15, phase: 1.4 },
    { x: -12.5, z: -0.6, rx: 2.65, rz: 2.15, phase: 2.7 },
  ];
  const segments = 20;
  const rings = 3;

  for (const patch of patches) {
    const positions: number[] = [patch.x, groundY(patch.x, patch.z) + 0.045, patch.z];
    const indices: number[] = [];
    for (let ring = 1; ring <= rings; ring += 1) {
      const radius = ring / rings;
      for (let i = 0; i < segments; i += 1) {
        const theta = (i / segments) * Math.PI * 2;
        const edgeNoise = 1 + Math.sin(theta * 3 + patch.phase) * 0.06 + Math.cos(theta * 5 - patch.phase) * 0.035;
        const x = patch.x + Math.cos(theta) * patch.rx * radius * edgeNoise;
        const z = patch.z + Math.sin(theta) * patch.rz * radius * edgeNoise;
        positions.push(x, groundY(x, z) + 0.045, z);
      }
    }
    for (let i = 0; i < segments; i += 1) {
      indices.push(0, 1 + i, 1 + ((i + 1) % segments));
    }
    for (let ring = 1; ring < rings; ring += 1) {
      const currentStart = 1 + (ring - 1) * segments;
      const nextStart = currentStart + segments;
      for (let i = 0; i < segments; i += 1) {
        const next = (i + 1) % segments;
        indices.push(currentStart + i, nextStart + i, currentStart + next);
        indices.push(currentStart + next, nextStart + i, nextStart + next);
      }
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const grass = new THREE.Mesh(geometry, grassMat);
    grass.receiveShadow = true;
    scene.add(grass);
  }
}

function buildDock(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const wood = std(WOOD);
  const dark = std(WOOD_DARK);
  const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(4.4, 0.22, 14)), wood);
  deck.position.set(0, 0.5, -24);
  deck.castShadow = true;
  deck.receiveShadow = true;
  scene.add(deck);
  for (const x of [-2.1, 2.1]) {
    for (const z of [-18, -23, -28, -31]) {
      const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6)), dark);
      post.position.set(x, 0.15, z);
      post.castShadow = true;
      scene.add(post);
    }
  }
  const lanternGeo = keep(new THREE.SphereGeometry(0.16, 12, 10));
  const lanterns: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
  for (const z of [-18.4, -26.5]) {
    const mat = std("#f6e2c4", { emissive: "#000000", emissiveIntensity: 0 });
    const lantern = new THREE.Mesh(lanternGeo, mat);
    lantern.position.set(1.5, 1.35, z);
    scene.add(lantern);
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6)), dark);
    pole.position.set(1.5, 0.85, z);
    scene.add(pole);
    lanterns.push(lantern);
  }
  const barrel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.28, 0.3, 0.42, 8)), std("#c4894a"));
  barrel.position.set(-1.2, 0.78, -19.2);
  barrel.castShadow = true;
  scene.add(barrel);
  return lanterns;
}

function buildObservatory(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const x = 0.2;
  const z = 10.4;
  const y = groundY(x, z);
  const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.55, 1.7, 1.3, 8)), std(CREAM));
  base.position.set(x, y + 0.65, z);
  base.castShadow = true;
  scene.add(base);
  const domeMat = std("#f7f1ea", { emissive: "#000000", emissiveIntensity: 0 });
  const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)), domeMat);
  dome.position.set(x, y + 1.3, z);
  dome.castShadow = true;
  scene.add(dome);
  const slit = new THREE.Mesh(keep(new THREE.BoxGeometry(0.28, 0.15, 1.3)), std(CORAL));
  slit.position.set(x, y + 1.85, z);
  scene.add(slit);
  return dome;
}

function buildGreenhouse(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const x = 14.4;
  const z = 2.1;
  const y = groundY(x, z);
  const frame = std(SAGE);
  const floor = new THREE.Mesh(keep(new THREE.BoxGeometry(3.4, 0.2, 2.6)), std("#d9c3a2"));
  floor.position.set(x, y + 0.1, z);
  floor.receiveShadow = true;
  scene.add(floor);
  const panes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
  const paneGeo = keep(new THREE.BoxGeometry(3.1, 1.5, 0.06));
  for (const side of [-1, 1]) {
    const mat = std(GLASS, { transparent: true, opacity: 0.45, emissive: "#000000", roughness: 0.2 });
    const pane = new THREE.Mesh(paneGeo, mat);
    pane.position.set(x, y + 1.05, z + side * 1.25);
    scene.add(pane);
    panes.push(pane);
  }
  const roof = new THREE.Mesh(keep(new THREE.ConeGeometry(2.15, 0.9, 4)), frame);
  roof.position.set(x, y + 2.15, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);
  const plant = new THREE.Mesh(keep(new THREE.SphereGeometry(0.28, 10, 8)), std("#7dbe6a"));
  plant.position.set(x - 0.4, y + 0.45, z);
  scene.add(plant);
  return panes;
}

function buildSlope(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const x = -14.3;
  const z = -0.2;
  const y = groundY(x, z);
  const ramp = new THREE.Mesh(keep(new THREE.BoxGeometry(1.4, 0.18, 3.2)), std("#d7b48a"));
  ramp.position.set(x, y + 0.7, z);
  ramp.rotation.x = -0.42;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  scene.add(ramp);
  const ball = new THREE.Mesh(keep(new THREE.SphereGeometry(0.28, 16, 12)), std(CORAL));
  ball.position.set(x, y + 0.34, z - 1.8);
  ball.castShadow = true;
  scene.add(ball);
}

function buildLighthouse(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const x = 7.6;
  const z = 17.2;
  const y = groundY(x, z);
  const tower = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.55, 0.78, 3.4, 10)), std(CREAM));
  tower.position.set(x, y + 1.7, z);
  tower.castShadow = true;
  scene.add(tower);
  const band = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.8, 0.8, 0.28, 10)), std("#f6d56b"));
  band.position.set(x, y + 2.5, z);
  scene.add(band);
  const lamp = new THREE.Mesh(
    keep(new THREE.SphereGeometry(0.38, 14, 10)),
    std("#fff4c8", { emissive: "#ffd36a", emissiveIntensity: 0.35 }),
  );
  lamp.position.set(x, y + 3.55, z);
  scene.add(lamp);
  const roof = new THREE.Mesh(keep(new THREE.ConeGeometry(0.7, 0.55, 10)), std(CORAL));
  roof.position.set(x, y + 4.15, z);
  roof.castShadow = true;
  scene.add(roof);
  const beamMat = new THREE.MeshBasicMaterial({
    color: "#ffe7a3",
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(keep(new THREE.ConeGeometry(1.6, 7.5, 16, 1, true)), beamMat);
  beam.position.set(x, y + 3.55, z);
  beam.rotation.z = Math.PI / 2;
  beam.visible = false;
  scene.add(beam);
  keep(beamMat);
  return beam;
}

function buildBoat(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const hull = new THREE.Mesh(keep(new THREE.BoxGeometry(1.1, 0.32, 2.1)), std("#f4efe6"));
  hull.position.set(3.4, 0.15, -27.5);
  scene.add(hull);
  const stripe = new THREE.Mesh(keep(new THREE.BoxGeometry(1.12, 0.08, 2.12)), std(CORAL));
  stripe.position.set(3.4, 0.28, -27.5);
  scene.add(stripe);
}

function buildFlowers(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const group = new THREE.Group();
  group.visible = false;
  const petal = keep(new THREE.SphereGeometry(0.12, 8, 6));
  const colors = ["#e07a5f", "#f6d56b", "#f2a3c7", "#ffffff"];
  const spots: Array<[number, number]> = [
    [-2, -10],
    [2.2, -8],
    [-7, -5],
    [-4, 2],
    [4, 3],
    [8, 6],
    [3, 12],
    [-8, 4],
  ];
  spots.forEach(([x, z], index) => {
    const flower = new THREE.Mesh(petal, std(colors[index % colors.length]));
    flower.position.set(x, groundY(x, z) + 0.16, z);
    flower.scale.y = 0.7;
    group.add(flower);
  });
  scene.add(group);
  return group;
}

function buildClouds(scene: THREE.Scene, keep: <T extends { dispose: () => void }>(item: T) => T) {
  const puff = keep(new THREE.SphereGeometry(1, 12, 10));
  const mat = new THREE.MeshStandardMaterial({ color: "#fffaf6", roughness: 1 });
  const clouds: THREE.Group[] = [];
  const spots = [
    [-18, 22, -8],
    [16, 26, 6],
    [4, 24, 24],
    [-22, 20, 14],
  ];
  for (const [x, y, z] of spots) {
    const cloud = new THREE.Group();
    for (const offset of [
      [0, 0, 0],
      [1.3, -0.2, 0.2],
      [-1.2, -0.15, 0.1],
    ]) {
      const mesh = new THREE.Mesh(puff, mat);
      mesh.position.set(offset[0], offset[1], offset[2]);
      mesh.scale.setScalar(offset[0] === 0 ? 1.3 : 1);
      cloud.add(mesh);
    }
    cloud.position.set(x, y, z);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

function addSigns(scene: THREE.Scene) {
  const postMat = std(WOOD_DARK);
  for (const place of PLACES) {
    const y = groundY(place.x, place.z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), postMat);
    post.position.set(place.x, y + 0.45, place.z);
    scene.add(post);
    const board = document.createElement("div");
    board.className = "place-sign";
    board.textContent = place.label;
    const label = new CSS2DObject(board);
    label.position.set(place.x + 1.15, y + 1.7, place.z);
    scene.add(label);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.045, 8, 24),
      new THREE.MeshStandardMaterial({ color: CORAL, emissive: CORAL, emissiveIntensity: 0.2 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(place.x, y + 0.08, place.z);
    ring.name = `ring-${place.id}`;
    scene.add(ring);
  }
}

function nearPlace(x: number, z: number, radius: number) {
  return PLACES.some((place) => {
    const dx = x - place.x;
    const dz = z - place.z;
    return dx * dx + dz * dz < radius * radius;
  });
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
