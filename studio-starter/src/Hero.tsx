import { useEffect, useRef, useState } from 'react'

/** Flores que alternan con cada click (también son el mouse). Guardá (Cmd+S) y recargá. */
const FLOWERS = ['✿', '❀']

/**
 * Cada flor nueva gira esto respecto de la anterior.
 * 15° no cae en los ejes de ✿/❀ (se repiten cada 45° o 60°), así que no se ven iguales.
 */
const FLOWER_TURN = 15

/** Del más grande al más chico, en px. El 18 es el tamaño del medio. */
const FLOWER_PX = [28, 18, 15, 10] as const

/**
 * Ocho órdenes. Cada una repite un tamaño y no va de grande a chico.
 * Al terminar una, sigue la siguiente; después de la octava vuelve a empezar.
 */
const SIZE_SEQUENCES = [
  [1, 0, 3, 2, 1],
  [0, 3, 1, 2, 0],
  [2, 0, 3, 1, 2],
  [3, 1, 0, 2, 3],
  [1, 3, 0, 2, 1],
  [0, 2, 3, 1, 0],
  [2, 1, 0, 3, 2],
  [3, 0, 2, 1, 3],
] as const

/** Tamaño 2, el actual. Los otros tres salen de este. */
const FLOWER_MARK = 18
const FLOWER_IMAGE = 65

/** Cuánto más grande que la pantalla se ve el cuadro. 1 = entero, 1.8 = zoom. */
const ZOOM = 1.8

function isImage(src: string) {
  return src.startsWith('/') || src.startsWith('http')
}

function flowerPx(step: number) {
  const length = SIZE_SEQUENCES[0].length
  const sequence = SIZE_SEQUENCES[Math.floor(step / length) % SIZE_SEQUENCES.length]
  return FLOWER_PX[sequence[step % length] ?? 1]
}

type Point = {
  x: number
  y: number
}

type Size = {
  w: number
  h: number
}

type Flower = {
  id: number
  mark: string
  turn: number
  px: number
  /** Posición sobre el cuadro, de 0 a 1, no sobre la pantalla. */
  u: number
  v: number
}

function flowerBox(px: number, image: boolean): React.CSSProperties {
  if (image) return { height: (FLOWER_IMAGE * px) / FLOWER_MARK }
  return { fontSize: px }
}

function cursorStyle(point: Point, rotation: number, px: number): React.CSSProperties {
  return {
    left: point.x,
    top: point.y,
    fontSize: px,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  }
}

function sealedStyle(flower: Flower): React.CSSProperties {
  return {
    left: `${flower.u * 100}%`,
    top: `${flower.v * 100}%`,
    ...flowerBox(flower.px, isImage(flower.mark)),
    transform: `translate(-50%, -50%) rotate(${flower.turn}deg)`,
  }
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

function rememberSize(img: HTMLImageElement, setNatural: (size: Size) => void) {
  if (!img.naturalWidth || !img.naturalHeight) return
  setNatural({ w: img.naturalWidth, h: img.naturalHeight })
}

export function Hero({ src }: { src: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const paintingRef = useRef<HTMLImageElement>(null)
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [cursor, setCursor] = useState<Point | null>(null)
  const [active, setActive] = useState(0)
  const [turn, setTurn] = useState(0)
  const [sizeStep, setSizeStep] = useState(0)
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<Size>({ w: 0, h: 0 })
  const [pan, setPan] = useState<Point>({ x: 0.5, y: 0.5 })
  const current = FLOWERS[active] ?? FLOWERS[0]
  const px = flowerPx(sizeStep)
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
    setPan({ x: 0.5, y: 0.5 })
    const img = paintingRef.current
    if (img?.complete) rememberSize(img, setNatural)
    else setNatural({ w: 0, h: 0 })
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
    if (!size) return
    const point = pointFromEvent(event)
    const id = Date.now() + Math.random()
    const mark = current
    const stamp = turn
    const stampedPx = px
    setFlowers((items) => [
      ...items,
      {
        id,
        mark,
        turn: stamp,
        px: stampedPx,
        u: (point.x - shiftX) / size.w,
        v: (point.y - shiftY) / size.h,
      },
    ])
    setTurn((value) => value + FLOWER_TURN)
    setSizeStep((value) => value + 1)
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
      <div
        className="hero__stage"
        style={
          size
            ? { width: size.w, height: size.h, transform: `translate(${shiftX}px, ${shiftY}px)` }
            : { visibility: 'hidden' }
        }
      >
        <img
          ref={paintingRef}
          src={src}
          alt="Painting by Alei"
          className="hero__painting"
          draggable={false}
          decoding="sync"
          onLoad={(event) => rememberSize(event.currentTarget, setNatural)}
        />
        {flowers.map((flower) =>
          isImage(flower.mark) ? (
            <img
              key={flower.id}
              src={flower.mark}
              alt=""
              aria-hidden
              className="hero__flower hero__flower--img"
              draggable={false}
              style={sealedStyle(flower)}
            />
          ) : (
            <span
              key={flower.id}
              aria-hidden
              className="hero__flower hero__flower--mark"
              style={sealedStyle(flower)}
            >
              {flower.mark}
            </span>
          ),
        )}
      </div>
      {cursor ? (
        <span aria-hidden className="hero__cursor" style={cursorStyle(cursor, turn, px)}>
          {current}
        </span>
      ) : null}
    </div>
  )
}
