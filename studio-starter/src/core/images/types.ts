export type MediaFormat = 'webp' | 'jpeg'

export type MediaVariant = {
  w: number
  h: number
  key: string
  url: string
}

export type MediaVariants = {
  format: MediaFormat
  widths: MediaVariant[]
}

export type VideoVariants = {
  format: 'mp4' | 'gif'
  duration: number
}

export type MediaRecord = {
  id: string
  url: string
  width: number | null
  height: number | null
  mime: string | null
  variants: MediaVariants | VideoVariants | Record<string, never>
  createdAt?: string
}
