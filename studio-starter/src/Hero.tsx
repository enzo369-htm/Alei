import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Todas se igualan al mismo alto de dibujo, sea cual sea el margen del PNG. */
const FLOWERS = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `/flowers/${n}.png`),
  '/flowers/2.1.png',
  '/flowers/2.2.png',
  '/flowers/2.3.png',
]

/** Cada dibujo, sea cual sea el margen del PNG, se ve de este alto. */
const FLOWER_INK_PX = 14.5

/** Hasta medir los archivos: el lote actual, 104 px de tinta en un lienzo de 1530. */
const FLOWER_HEIGHT_FALLBACK = (FLOWER_INK_PX * 1530) / 104

/** Cuánto más grande que la pantalla se ve el cuadro. 1 = entero, 1.8 = zoom. */
const ZOOM = 1.8
const NARROW = '(max-width: 800px)'

function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(NARROW)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function flowerSrc(step: number) {
  return FLOWERS[step % FLOWERS.length] ?? FLOWERS[0]
}

function flowerBoxHeight(inkRatio: number) {
  return inkRatio > 0 ? FLOWER_INK_PX / inkRatio : FLOWER_HEIGHT_FALLBACK
}

function inkRatio(image: HTMLImageElement) {
  const width = Math.max(1, Math.round(image.naturalWidth / 4))
  const height = Math.max(1, Math.round(image.naturalHeight / 4))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return 0
  context.drawImage(image, 0, 0, width, height)
  const data = context.getImageData(0, 0, width, height).data
  let minY = height
  let maxY = 0
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index] ?? 0
    if (alpha <= 16) continue
    const y = Math.floor(index / 4 / width)
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  if (maxY < minY) return 0
  return (maxY - minY + 1) / height
}

function loadFlowerHeight(src: string) {
  return new Promise<number>((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve(flowerBoxHeight(inkRatio(image)))
    }
    image.onerror = () => resolve(FLOWER_HEIGHT_FALLBACK)
    image.src = src
  })
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
  src: string
  /** Posición sobre el cuadro, de 0 a 1, no sobre la pantalla. */
  u: number
  v: number
}

function cursorStyle(point: Point, height: number): React.CSSProperties {
  return {
    left: point.x,
    top: point.y,
    height,
    transform: 'translate(-50%, -50%)',
  }
}

function sealedStyle(flower: Flower, height: number): React.CSSProperties {
  return {
    left: `${flower.u * 100}%`,
    top: `${flower.v * 100}%`,
    height,
    transform: 'translate(-50%, -50%)',
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
  const [step, setStep] = useState(0)
  const [flowerHeights, setFlowerHeights] = useState<Record<string, number>>({})
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<Size>({ w: 0, h: 0 })
  const [pan, setPan] = useState<Point>({ x: 0.5, y: 0.5 })
  const narrow = useNarrow()
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const current = flowerSrc(step)
  const size = paintedSize(frame, natural)
  const overflowX = size ? Math.max(0, size.w - frame.w) : 0
  const overflowY = size ? Math.max(0, size.h - frame.h) : 0
  const shiftX = size ? -pan.x * overflowX : 0
  const shiftY = size ? -pan.y * overflowY : 0

  useEffect(() => {
    let cancelled = false
    void Promise.all(FLOWERS.map(async (src) => [src, await loadFlowerHeight(src)] as const)).then((pairs) => {
      if (!cancelled) setFlowerHeights(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [])

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
    if (narrow) setCursor(null)
  }, [narrow])

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

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!narrow || !size) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: shiftX,
      originY: shiftY,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Untrusted events cannot capture the pointer.
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!narrow || !drag || drag.pointerId !== event.pointerId) return
    const nextX = clamp(drag.originX + (event.clientX - drag.startX), -overflowX, 0)
    const nextY = clamp(drag.originY + (event.clientY - drag.startY), -overflowY, 0)
    setPan({
      x: overflowX ? -nextX / overflowX : 0.5,
      y: overflowY ? -nextY / overflowY : 0.5,
    })
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!size) return
    const point = pointFromEvent(event)
    const id = Date.now() + Math.random()
    const stampSrc = current
    setFlowers((items) => [
      ...items,
      {
        id,
        src: stampSrc,
        u: (point.x - shiftX) / size.w,
        v: (point.y - shiftY) / size.h,
      },
    ])
    setStep((value) => value + 1)

    window.setTimeout(() => {
      setFlowers((items) => items.filter((item) => item.id !== id))
    }, 4_000)
  }

  return (
    <div
      ref={frameRef}
      className="hero"
      onClick={narrow ? undefined : handleClick}
      onMouseMove={narrow ? undefined : handleMouseMove}
      onMouseLeave={narrow ? undefined : () => setCursor(null)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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
        {!narrow && flowers.map((flower) => (
          <img
            key={flower.id}
            src={flower.src}
            alt=""
            aria-hidden
            className="hero__flower hero__flower--img"
            draggable={false}
            style={sealedStyle(flower, flowerHeights[flower.src] ?? FLOWER_HEIGHT_FALLBACK)}
          />
        ))}
      </div>
      {!narrow && cursor ? (
        <img
          src={current}
          alt=""
          aria-hidden
          className="hero__cursor"
          draggable={false}
          style={cursorStyle(cursor, flowerHeights[current] ?? FLOWER_HEIGHT_FALLBACK)}
        />
      ) : null}
    </div>
  )
}
