import { useState } from 'react'

/** Para cambiar la flor: poné UNA de estas opciones, guardá (Cmd+S) y recargá.
 *  Emoji / carácter:
 *    '✿'
 *    '💮'
 *  Imagen:
 *    '/hero/flower-red.png?v=3'
 *    '/hero/flower-pink.png?v=3'
 *    '/hero/flower.png?v=3'
 */
const FLOWER = '✿'
const CURSOR = '✿'

const FLOWER_IS_IMAGE = FLOWER.startsWith('/') || FLOWER.startsWith('http')

type Point = {
  x: number
  y: number
}

type Flower = Point & {
  id: number
}

function pointFromEvent(event: React.MouseEvent<HTMLDivElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

export function Hero({ src }: { src: string }) {
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [cursor, setCursor] = useState<Point | null>(null)

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const point = pointFromEvent(event)
    const id = Date.now() + Math.random()
    setFlowers((current) => [...current, { id, ...point }])

    window.setTimeout(() => {
      setFlowers((current) => current.filter((item) => item.id !== id))
    }, 10_000)
  }

  return (
    <div
      className="hero"
      onClick={handleClick}
      onMouseMove={(event) => setCursor(pointFromEvent(event))}
      onMouseLeave={() => setCursor(null)}
    >
      <img src={src} alt="Painting by Alei" className="hero__painting" draggable={false} decoding="sync" />
      {cursor ? (
        <span aria-hidden className="hero__cursor" style={{ left: cursor.x, top: cursor.y }}>
          {CURSOR}
        </span>
      ) : null}
      {flowers.map((flower) =>
        FLOWER_IS_IMAGE ? (
          <img
            key={flower.id}
            src={FLOWER}
            alt=""
            aria-hidden
            className="hero__flower hero__flower--img"
            draggable={false}
            style={{ left: flower.x, top: flower.y }}
          />
        ) : (
          <span
            key={flower.id}
            aria-hidden
            className="hero__flower hero__flower--mark"
            style={{ left: flower.x, top: flower.y }}
          >
            {FLOWER}
          </span>
        ),
      )}
    </div>
  )
}
