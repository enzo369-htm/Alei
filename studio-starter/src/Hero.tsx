import { useEffect, useRef, useState } from 'react'

/** Flores que alternan con cada click (también son el mouse). Guardá (Cmd+S) y recargá. */
const FLOWERS = ['✿', '❀']

/** Cuánto más grande que la pantalla se ve el cuadro. 1 = entero, 1.8 = zoom. */
const ZOOM = 1.8

function isImage(src: string) {
  return src.startsWith('/') || src.startsWith('http')
}

type Point = {
  x: number
  y: number
}

type Size = {
  w: number
  h: number
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

function paintedSize(frame: Size, natural: Size): Size | null {
  if (!frame.w || !frame.h || !natural.w || !natural.h) return null
  const scale = Math.max(frame.w / natural.w, frame.h / natural.h) * ZOOM
  return { w: natural.w * scale, h: natural.h * scale }
}

export function Hero({ src }: { src: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [cursor, setCursor] = useState<Point | null>(null)
  const [active, setActive] = useState(0)
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<Size>({ w: 0, h: 0 })
  const [pan, setPan] = useState<Point>({ x: 0.5, y: 0.5 })
  const current = FLOWERS[active] ?? FLOWERS[0]
  const size = paintedSize(frame, natural)
  const shiftX = size ? -pan.x * Math.max(0, size.w - frame.w) : 0
  const shiftY = size ? -pan.y * Math.max(0, size.h - frame.h) : 0

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setNatural({ w: 0, h: 0 })
    setPan({ x: 0.5, y: 0.5 })
  }, [src])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const point = pointFromEvent(event)
    const rect = event.currentTarget.getBoundingClientRect()
    setCursor(point)
    setPan({
      x: rect.width ? point.x / rect.width : 0.5,
      y: rect.height ? point.y / rect.height : 0.5,
    })
  }

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
      ref={frameRef}
      className="hero"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursor(null)}
    >
      <img
        src={src}
        alt="Painting by Alei"
        className="hero__painting"
        draggable={false}
        decoding="sync"
        onLoad={(event) => {
          const img = event.currentTarget
          setNatural({ w: img.naturalWidth, h: img.naturalHeight })
        }}
        style={
          size
            ? { width: size.w, height: size.h, transform: `translate(${shiftX}px, ${shiftY}px)` }
            : { visibility: 'hidden' }
        }
      />
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
