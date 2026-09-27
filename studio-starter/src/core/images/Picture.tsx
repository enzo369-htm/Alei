import type { MediaRecord } from './types.ts'

type Props = {
  media: MediaRecord
  alt?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  className?: string
}

function srcsetOf(media: MediaRecord) {
  const widths = media.variants && 'widths' in media.variants ? media.variants.widths : []
  if (!widths.length) return undefined
  return widths.map((item) => `${item.url} ${item.w}w`).join(', ')
}

/**
 * Una imagen del motor: srcset de las variantes, width/height para no saltar layout.
 * `sizes` lo pone el host según el contexto (grilla, hero, retrato).
 */
export function Picture({
  media,
  alt = '',
  sizes = '100vw',
  loading = 'lazy',
  className,
}: Props) {
  const srcset = srcsetOf(media)
  return (
    <img
      className={className}
      src={media.url}
      srcSet={srcset}
      sizes={srcset ? sizes : undefined}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={alt}
      loading={loading}
      decoding="async"
    />
  )
}
