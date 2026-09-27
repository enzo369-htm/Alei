/** Lado mayor de cada variante. Cambiar acá solo afecta subidas nuevas. */
export const VARIANT_TARGETS = [3000, 1400, 480] as const

export const WEBP_QUALITY = 0.8
export const JPEG_QUALITY = 0.82

/** Tope del body (Vercel ~4.5 MB). Las 3 variantes juntas no pueden pasarlo. */
export const UPLOAD_MAX_BYTES = 4_000_000

export type VariantSize = {
  w: number
  h: number
}

/**
 * Tamaños a emitir. Nunca agranda. Si la foto es más chica que un target,
 * ese target se colapsa al lado mayor real y los duplicados se tiran.
 */
export function pickVariantSizes(
  srcW: number,
  srcH: number,
  targets: readonly number[] = VARIANT_TARGETS,
): VariantSize[] {
  const long = Math.max(srcW, srcH)
  if (long <= 0 || srcW <= 0 || srcH <= 0) return []

  const seen = new Set<number>()
  const out: VariantSize[] = []

  for (const target of targets) {
    const dim = Math.min(target, long)
    if (seen.has(dim)) continue
    seen.add(dim)
    const scale = dim / long
    out.push({
      w: Math.max(1, Math.round(srcW * scale)),
      h: Math.max(1, Math.round(srcH * scale)),
    })
  }

  return out.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h))
}

/** Tope de decode/encode. Nunca agranda. */
export function capLongSide(srcW: number, srcH: number, max = VARIANT_TARGETS[0]): VariantSize {
  const long = Math.max(srcW, srcH)
  if (long <= 0 || srcW <= 0 || srcH <= 0) return { w: 0, h: 0 }
  if (long <= max) return { w: srcW, h: srcH }
  const scale = max / long
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  }
}
