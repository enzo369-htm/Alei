import { useEffect, useState } from 'react'
import { apiGetHero, type HeroFitSettings } from './core/api/hero'
import { Hero } from './Hero'
import { HeroFit } from './HeroFit'
import { HERO_FALLBACK, pickHeroSrc } from './heroRotation'

type View =
  | { kind: 'motion'; src: string }
  | { kind: 'fit'; src: string; mime: string | null; scale: number }

function viewFrom(slides: { media: { url: string } }[], fit: HeroFitSettings): View {
  if (fit.mode === 'fit' && fit.media) {
    return { kind: 'fit', src: fit.media.url, mime: fit.media.mime, scale: fit.scale }
  }
  return { kind: 'motion', src: pickHeroSrc(slides.map((slide) => slide.media.url)) }
}

export function HomePage() {
  const [view, setView] = useState<View | null>(null)

  useEffect(() => {
    void apiGetHero()
      .then((data) => setView(viewFrom(data.slides, data.fit)))
      .catch(() => setView({ kind: 'motion', src: HERO_FALLBACK }))
  }, [])

  if (!view) return <div className="site-home" />

  return (
    <div className="site-home">
      {view.kind === 'fit' ? (
        <HeroFit src={view.src} mime={view.mime} scale={view.scale} />
      ) : (
        <Hero src={view.src} />
      )}
    </div>
  )
}
