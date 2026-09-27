import type { MediaRecord } from "@/lib/cms";

function srcsetOf(media: MediaRecord) {
  const widths =
    media.variants && "widths" in media.variants ? media.variants.widths : [];
  if (!widths.length) return undefined;
  return widths.map((item) => `${item.url} ${item.w}w`).join(", ");
}

export function Picture({
  media,
  alt = "",
  sizes = "100vw",
}: {
  media: MediaRecord;
  alt?: string;
  sizes?: string;
}) {
  const srcset = srcsetOf(media);
  return (
    <img
      src={media.url}
      srcSet={srcset}
      sizes={srcset ? sizes : undefined}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
