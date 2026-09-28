export const HERO_FALLBACK = '/hero/hero-01.jpg'

export const HERO_COOKIE = 'alei-hero-index'

export function nextHeroIndex(
  lastIndex: number | undefined,
  count: number,
): number {
  if (count <= 0) return 0
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

export function pickHeroSrc(urls: string[]) {
  if (urls.length === 0) return HERO_FALLBACK
  const index = nextHeroIndex(readHeroIndex(), urls.length)
  writeHeroIndex(index)
  return urls[index] ?? HERO_FALLBACK
}
