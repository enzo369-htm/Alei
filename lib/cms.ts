const CMS_ORIGIN = process.env.CMS_ORIGIN ?? "http://localhost:5173";

export type MediaRecord = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  variants: {
    format: "webp" | "jpeg";
    widths: { w: number; h: number; key: string; url: string }[];
  } | Record<string, never>;
};

export type CanvasPiece = {
  id: string;
  mediaId: string;
  src: string;
  x: number;
  y: number;
  width: number;
  z: number;
  media: MediaRecord | null;
};

export type CanvasBlock = {
  id: string;
  kind: "canvas" | "text";
  title: string;
  body: string;
  sortOrder: number;
  heightRatio: number;
  pieces: CanvasPiece[];
};

export async function getCanvas(scope: "works" | "colabs") {
  const response = await fetch(`${CMS_ORIGIN}/api/canvas/${scope}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CMS ${response.status}`);
  }

  return (await response.json()) as { scope: string; blocks: CanvasBlock[] };
}
