"use client";

export type CameraAdjustment = {
  yaw?: number;
  pitch?: number;
  distance?: number;
};

type Props = {
  onAdjust: (change: CameraAdjustment) => void;
  onReset: () => void;
  className?: string;
  label?: string;
};

export default function CameraControls({ onAdjust, onReset, className, label = "視角控制" }: Props) {
  return (
    <div className={`camera-controls${className ? ` ${className}` : ""}`} aria-label={label}>
      <button type="button" aria-label="視角向上" onClick={() => onAdjust({ pitch: 0.16 })}>▲</button>
      <div className="camera-controls-row">
        <button type="button" aria-label="視角向左" onClick={() => onAdjust({ yaw: -0.24 })}>◀</button>
        <button type="button" className="camera-controls-reset" aria-label="重設視角" onClick={onReset}>●</button>
        <button type="button" aria-label="視角向右" onClick={() => onAdjust({ yaw: 0.24 })}>▶</button>
      </div>
      <button type="button" aria-label="視角向下" onClick={() => onAdjust({ pitch: -0.16 })}>▼</button>
      <div className="camera-zoom-controls" aria-label="縮放">
        <button type="button" aria-label="放大" onClick={() => onAdjust({ distance: -0.8 })}>＋</button>
        <span aria-hidden="true">縮放</span>
        <button type="button" aria-label="縮小" onClick={() => onAdjust({ distance: 0.8 })}>－</button>
      </div>
    </div>
  );
}
