import { useState } from 'react'

/** Flores que alternan con cada click (también son el mouse). Guardá (Cmd+S) y recargá. */
const FLOWERS = ['✿', '❀']

function isImage(src: string) {
  return src.startsWith('/') || src.startsWith('http')
}

type Point = {
  x: number
  y: number
}

type Flower = Point & {
  id: number
  mark: string
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
  const [active, setActive] = useState(0)
  const current = FLOWERS[active] ?? FLOWERS[0]

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const point = pointFromEvent(event)
    const id = Date.now() + Math.random()
    const mark = current
    setFlowers((items) => [...items, { id, mark, ...point }])
    setActive((index) => (index + 1) % FLOWERS.length)

    window.setTimeout(() => {
      setFlowers((items) => items.filter((item) => item.id !== id))
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
          {current}
        </span>
      ) : null}
      {flowers.map((flower) =>
        isImage(flower.mark) ? (
          <img
            key={flower.id}
            src={flower.mark}
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
            {flower.mark}
          </span>
        ),
      )}
    </div>
  )
}
