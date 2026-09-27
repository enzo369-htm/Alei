export const HERO_IMAGES = ["/hero/hero-01.jpg"] as const;

export const HERO_COOKIE = "alei-hero-index";

export function nextHeroIndex(
  lastIndex: number | undefined,
  count: number = HERO_IMAGES.length,
): number {
  if (lastIndex === undefined || !Number.isFinite(lastIndex) || lastIndex < 0) {
    return 0;
  }
  return (lastIndex + 1) % count;
}
