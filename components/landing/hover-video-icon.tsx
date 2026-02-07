"use client";

import { useRef, useState } from "react";

type HoverVideoIconProps = {
  src: string;
  poster: string;
  label?: string;
  size?: number; // px
  className?: string;
};

export function HoverVideoIcon({
  src,
  poster,
  label = "App icon preview",
  size = 90,
  className,
}: HoverVideoIconProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      // ensure it starts from beginning for consistent UX
      v.currentTime = 0;
      await v.play();
      setIsPlaying(true);
    } catch {
      // autoplay policies can still block in some cases
      setIsPlaying(false);
    }
  };

  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setIsPlaying(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerEnter={play}
      onPointerLeave={stop}
      onFocus={play}
      onBlur={stop}
      className={[
        "group relative overflow-clip rounded-[24px] bg-[#0b0d10]",
        "ring-1 ring-white/10",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.65)]",
        "transition duration-200 hover:ring-white/20",
        "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.75)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        className ?? "",
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      {/* subtle hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_60%)]" />
      </div>

      <video
        ref={videoRef}
        className={[
          "h-full w-full object-cover scale-[1.12] contrast-[1.12] brightness-[0.92]",
          "transition-opacity duration-200",
          isPlaying ? "opacity-100" : "opacity-95",
        ].join(" ")}
        playsInline
        muted
        loop={false}          // important: Codex-like “preview”, not infinite
        preload="metadata"    // fast poster, minimal network
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* optional gloss highlight */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-6 left-0 right-0 h-10 bg-white/5 blur-xl opacity-60" />
      </div>
    </div>
  );
}