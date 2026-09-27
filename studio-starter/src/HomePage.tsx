import { useState } from 'react'
import { Hero } from './Hero'
import { pickHeroSrc } from './heroRotation'

export function HomePage() {
  const [src] = useState(pickHeroSrc)

  return (
    <div className="site-home">
      <Hero src={src} />
    </div>
  )
}
