import { useState } from 'react'

/** Para cambiar la flor: copiá una de estas rutas, guardá (Cmd+S) y recargá.
 *  '/hero/flower-red.png?v=3'
 *  '/hero/flower-pink.png?v=3'
 *  '/hero/flower.png?v=3'
 */
const FLOWER_SRC = '/hero/flower.png?v=3'

type Flower = {
  id: number
  x: number
  y: number
}

export function Hero({ src }: { src: string }) {
  const [flowers, setFlowers] = useState<Flower[]>([])

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const id = Date.now() + Math.random()
    const flower: Flower = {
      id,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    setFlowers((current) => [...current, flower])

    window.setTimeout(() => {
      setFlowers((current) => current.filter((item) => item.id !== id))
    }, 10_000)
  }

  return (
    <div className="hero" onClick={handleClick}>
      <img src={src} alt="Painting by Alei" className="hero__painting" draggable={false} decoding="sync" />
      <p className="hero__hint">clickea el cuadro</p>
      {flowers.map((flower) => (
        <img
          key={flower.id}
          src={FLOWER_SRC}
          alt=""
          aria-hidden
          className="hero__flower"
          draggable={false}
          style={{ left: flower.x, top: flower.y }}
        />
      ))}
    </div>
  )
}
