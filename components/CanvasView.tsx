"use client";

import { useEffect, useState } from "react";
import { Picture } from "@/components/Picture";
import type { CanvasBlock, CanvasPiece, MediaRecord } from "@/lib/cms";

type Item = {
  id: string;
  imageUrl: string;
  media: MediaRecord | null;
  x: number;
  y: number;
  width: number;
};

function itemsOf(block: CanvasBlock): Item[] {
  return block.pieces.map((piece: CanvasPiece) => ({
    id: piece.id,
    imageUrl: piece.src,
    media: piece.media,
    x: piece.x,
    y: piece.y,
    width: piece.width,
  }));
}

export function CanvasView({ blocks }: { blocks: CanvasBlock[] }) {
  if (blocks.length === 0) {
    return <p className="canvas-note">Nothing here yet.</p>;
  }

  return (
    <div className="canvas-page">
      {blocks.map((block) =>
        block.kind === "text" ? (
          <article key={block.id} className="canvas-text">
            {block.title ? <h1>{block.title}</h1> : null}
            {block.body
              ? block.body.split("\n\n").map((para, index) => (
                  <p key={index}>{para}</p>
                ))
              : null}
          </article>
        ) : (
          <CanvasBoard
            key={block.id}
            items={itemsOf(block)}
            heightRatio={block.heightRatio}
          />
        ),
      )}
    </div>
  );
}

function CanvasBoard({
  items,
  heightRatio,
}: {
  items: Item[];
  heightRatio: number;
}) {
  const [open, setOpen] = useState<Item | null>(null);
  const ratio = heightRatio || 1.2;

  if (items.length === 0) return null;

  return (
    <div className="canvas-board" style={{ paddingTop: `${ratio * 100}%` }}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="canvas-item"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.width}%`,
          }}
          onClick={() => setOpen(item)}
          aria-label="View work"
        >
          {item.media ? (
            <Picture
              media={item.media}
              sizes={`${Math.round(item.width)}vw`}
            />
          ) : (
            <img src={item.imageUrl} alt="" />
          )}
        </button>
      ))}
      {open ? <Lightbox item={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function Lightbox({ item, onClose }: { item: Item; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="canvas-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>
        {item.media ? (
          <Picture media={item.media} sizes="96vw" />
        ) : (
          <img src={item.imageUrl} alt="" />
        )}
      </div>
    </div>
  );
}
