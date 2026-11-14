import type { CSSProperties } from 'react'

type Props = {
  src: string
  mime: string | null
  scale: number
}

function isVideo(mime: string | null) {
  return mime?.startsWith('video/') ?? false
}

/** Hero 2. El archivo queda centrado y el tamaño sale siempre del centro. */
export function HeroFit({ src, mime, scale }: Props) {
  const style = { '--hero-fit-scale': String(scale) } as CSSProperties
  if (isVideo(mime)) {
    return (
      <div className="hero-fit" style={style}>
        <video
          className="hero-fit__media"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
        />
      </div>
    )
  }
  return (
    <div className="hero-fit" style={style}>
      <img className="hero-fit__media" src={src} alt="Painting by Alei" draggable={false} />
    </div>
  )
}
