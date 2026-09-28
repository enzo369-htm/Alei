import { useEffect, useState } from 'react'
import { apiGetHero } from './core/api/hero'
import { Hero } from './Hero'
import { HERO_FALLBACK, pickHeroSrc } from './heroRotation'

export function HomePage() {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    void apiGetHero()
      .then((data) => {
        const urls = data.slides.map((slide) => slide.media.url)
        setSrc(pickHeroSrc(urls))
      })
      .catch(() => setSrc(HERO_FALLBACK))
  }, [])

  if (!src) return <div className="site-home" />

  return (
    <div className="site-home">
      <Hero src={src} />
    </div>
  )
}
