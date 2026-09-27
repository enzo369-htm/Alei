"use client";

import { useState } from "react";

type Flower = {
  id: number;
  x: number;
  y: number;
};

export function Hero({ src }: { src: string }) {
  const [flowers, setFlowers] = useState<Flower[]>([]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    const flower: Flower = {
      id,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setFlowers((current) => [...current, flower]);

    window.setTimeout(() => {
      setFlowers((current) => current.filter((item) => item.id !== id));
    }, 10_000);
  }

  return (
    <div
      className="relative flex h-full w-full cursor-default items-center justify-center overflow-hidden bg-white select-none"
      onClick={handleClick}
    >
      <img
        src={src}
        alt="Painting by Alei"
        draggable={false}
        decoding="sync"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
        }}
      />
      {flowers.map((flower) => (
        <span
          key={flower.id}
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[14px] leading-none text-white"
          style={{ left: flower.x, top: flower.y }}
        >
          ✿
        </span>
      ))}
    </div>
  );
}
