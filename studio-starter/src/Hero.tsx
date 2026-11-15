import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

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

/** Cuánto tarda el cuadro en frenar después de soltar. Más alto = sigue más. */
const GLIDE_TAU = 380
/** Tope de la velocidad del desliz, igual en cualquier dirección. */
const GLIDE_SPEED = 1.6

type Sample = { x: number; y: number; t: number }

function capVelocity(x: number, y: number) {
  const speed = Math.hypot(x, y)
  if (speed <= GLIDE_SPEED || speed === 0) return { x, y }
  const scale = GLIDE_SPEED / speed
  return { x: x * scale, y: y * scale }
}

/**
 * La velocidad es la del desliz, no la del instante en que el dedo se levanta.
 * Ese último tramo casi siempre frena y, si se usa, a veces el cuadro se para en seco.
 */
function swipeVelocity(samples: Sample[]) {
  if (samples.length < 2) return { x: 0, y: 0 }
  const releaseT = samples[samples.length - 1].t
  let end = samples.length - 1
  while (end > 0) {
    const previous = samples[end - 1]
    const point = samples[end]
    const dt = point.t - previous.t
    const speed = dt > 0 ? Math.hypot(point.x - previous.x, point.y - previous.y) / dt : 0
    if (speed > 0.05) break
    end -= 1
  }
  if (end < 1) return { x: 0, y: 0 }
  const age = releaseT - samples[end].t
  if (age > 100) return { x: 0, y: 0 }

  const last = samples[end]
  const windowStart = last.t - 110
  const segments: { x: number; y: number; dt: number; t: number }[] = []
  for (let index = 1; index <= end; index += 1) {
    const previous = samples[index - 1]
    const point = samples[index]
    const dt = point.t - previous.t
    if (dt < 2 || point.t < windowStart) continue
    segments.push({
      x: (point.x - previous.x) / dt,
      y: (point.y - previous.y) / dt,
      dt,
      t: point.t,
    })
  }
  if (segments.length === 0) return { x: 0, y: 0 }

  let peak = 0
  for (const segment of segments) peak = Math.max(peak, Math.hypot(segment.x, segment.y))
  const moving = segments.filter((segment) => Math.hypot(segment.x, segment.y) >= peak * 0.55)
  const used = moving.length > 0 ? moving : segments

  let vx = 0
  let vy = 0
  let weight = 0
  for (const segment of used) {
    const recency = Math.exp(-(last.t - segment.t) / 70)
    const w = recency * segment.dt
    vx += segment.x * w
    vy += segment.y * w
    weight += w
  }
  if (weight <= 0) return { x: 0, y: 0 }
  const fade = age <= 40 ? 1 : Math.exp(-(age - 40) / 45)
  return capVelocity((vx / weight) * fade, (vy / weight) * fade)
}

function roomToward(position: number, velocity: number, limit: number) {
  if (velocity > 0) return -position
  if (velocity < 0) return limit + position
  return Number.POSITIVE_INFINITY
}

/** Si no queda tanto cuadro, frena con la misma curva en vez de cortar contra el borde. */
function fitEdge(velocity: number, room: number) {
  if (!(room > 0)) return 0
  const limit = room / GLIDE_TAU
  return Math.abs(velocity) <= limit ? velocity : Math.sign(velocity) * limit
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
  const shiftRef = useRef({ x: 0, y: 0, ready: false })
  const boundsRef = useRef({ overflowX: 0, overflowY: 0 })
  const samplesRef = useRef<{ x: number; y: number; t: number }[]>([])
  const glideRef = useRef(0)
  const current = flowerSrc(step)
  const size = paintedSize(frame, natural)
  const overflowX = size ? Math.max(0, size.w - frame.w) : 0
  const overflowY = size ? Math.max(0, size.h - frame.h) : 0
  const shiftX = size ? -pan.x * overflowX : 0
  const shiftY = size ? -pan.y * overflowY : 0
  boundsRef.current = { overflowX, overflowY }

  function stopGlide() {
    if (!glideRef.current) return
    cancelAnimationFrame(glideRef.current)
    glideRef.current = 0
  }

  function paintShift(x: number, y: number) {
    const stage = paintingRef.current?.parentElement
    if (stage) stage.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }

  function placeShift(x: number, y: number) {
    const { overflowX: maxX, overflowY: maxY } = boundsRef.current
    const nextX = clamp(x, -maxX, 0)
    const nextY = clamp(y, -maxY, 0)
    shiftRef.current = { x: nextX, y: nextY, ready: true }
    paintShift(nextX, nextY)
    return { x: nextX, y: nextY, hitX: nextX !== x, hitY: nextY !== y }
  }

  function commitShift() {
    const { overflowX: maxX, overflowY: maxY } = boundsRef.current
    const { x, y } = shiftRef.current
    setPan({
      x: maxX ? -x / maxX : 0.5,
      y: maxY ? -y / maxY : 0.5,
    })
  }

  function rememberSample(x: number, y: number, t = performance.now()) {
    const samples = samplesRef.current
    const time = t > 0 ? t : performance.now()
    samples.push({ x, y, t: time })
    const cutoff = time - 160
    while (samples.length > 2 && samples[0].t < cutoff) samples.shift()
  }

  function glide(vx: number, vy: number) {
    stopGlide()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commitShift()
      return
    }
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      const current = shiftRef.current
      const { overflowX: maxX, overflowY: maxY } = boundsRef.current
      vx = fitEdge(vx, roomToward(current.x, vx, maxX))
      vy = fitEdge(vy, roomToward(current.y, vy, maxY))
      const moved = placeShift(current.x + vx * dt, current.y + vy * dt)
      if (moved.hitX) vx = 0
      if (moved.hitY) vy = 0
      const decay = Math.exp(-dt / GLIDE_TAU)
      vx *= decay
      vy *= decay
      if (Math.hypot(vx, vy) < 0.008) {
        glideRef.current = 0
        commitShift()
        return
      }
      glideRef.current = requestAnimationFrame(step)
    }
    glideRef.current = requestAnimationFrame(step)
  }

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

  useLayoutEffect(() => {
    if (!shiftRef.current.ready) return
    paintShift(shiftRef.current.x, shiftRef.current.y)
  })

  useEffect(() => {
    if (narrow) setCursor(null)
    else {
      stopGlide()
      shiftRef.current.ready = false
    }
  }, [narrow])

  useEffect(() => {
    return () => stopGlide()
  }, [])

  useEffect(() => {
    stopGlide()
    shiftRef.current.ready = false
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
    stopGlide()
    const origin = shiftRef.current.ready ? shiftRef.current : { x: shiftX, y: shiftY }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    }
    samplesRef.current = [{ x: event.clientX, y: event.clientY, t: event.timeStamp || performance.now() }]
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Untrusted events cannot capture the pointer.
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!narrow || !drag || drag.pointerId !== event.pointerId) return
    const points = event.nativeEvent.getCoalescedEvents?.() ?? []
    if (points.length === 0) rememberSample(event.clientX, event.clientY, event.timeStamp)
    else for (const point of points) rememberSample(point.clientX, point.clientY, point.timeStamp)
    placeShift(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY))
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    rememberSample(event.clientX, event.clientY, event.timeStamp)
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const velocity = swipeVelocity(samplesRef.current)
    if (Math.hypot(velocity.x, velocity.y) >= 0.05) glide(velocity.x, velocity.y)
    else commitShift()
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
            ? { width: size.w, height: size.h, transform: `translate3d(${shiftX}px, ${shiftY}px, 0)` }
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
