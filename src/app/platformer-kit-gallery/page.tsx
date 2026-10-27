"use client";

import { useMemo, useState } from "react";
import { PLATFORMER_KIT_ASSETS, type PlatformerKitCategory } from "@/game/platformerKit/registry";

const categories: Array<"all" | PlatformerKitCategory> = [
  "all", "terrain", "snow", "cliff", "platform", "tree", "rock", "fence", "ladder",
  "decoration", "collectible", "interactive", "character",
];

export default function PlatformerKitGalleryPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const assets = useMemo(
    () => category === "all" ? PLATFORMER_KIT_ASSETS : PLATFORMER_KIT_ASSETS.filter((asset) => asset.category === category),
    [category],
  );

  return (
    <main className="kit-gallery">
      <div className="kit-gallery__header">
        <div>
          <p className="eyebrow">KENNEY PLATFORMER KIT</p>
          <h1>Asset Gallery</h1>
          <p>{assets.length} 個實際掃描到的 GLB 模型，點選分類查看可用素材。</p>
        </div>
        <a href="/">返回遊戲</a>
      </div>
      <nav className="kit-gallery__filters" aria-label="Asset categories">
        {categories.map((item) => (
          <button key={item} type="button" className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </nav>
      <section className="kit-gallery__grid">
        {assets.map((asset) => (
          <article className="kit-card" key={asset.id}>
            <div className="kit-card__preview">
              <img src={`/assets/platformer-kit/Previews/${asset.id}.png`} alt={asset.id} loading="lazy" />
            </div>
            <div className="kit-card__meta">
              <strong>{asset.id}</strong>
              <span>{asset.category}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

