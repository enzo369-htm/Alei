export const HERO_IMAGES = ['/hero/hero-01.jpg'] as const

export const HERO_COOKIE = 'alei-hero-index'

export function nextHeroIndex(
  lastIndex: number | undefined,
  count: number = HERO_IMAGES.length,
): number {
  if (lastIndex === undefined || !Number.isFinite(lastIndex) || lastIndex < 0) {
    return 0
  }
  return (lastIndex + 1) % count
}

export function readHeroIndex(): number | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${HERO_COOKIE}=([^;]*)`))
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

export function writeHeroIndex(index: number) {
  document.cookie = `${HERO_COOKIE}=${index}; path=/; max-age=31536000; SameSite=Lax`
}

export function pickHeroSrc() {
  const index = nextHeroIndex(readHeroIndex())
  writeHeroIndex(index)
  return HERO_IMAGES[index]
}
