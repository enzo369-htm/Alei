import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetCanvas, type CanvasPiece, type PieceSlide } from './core/api/canvas'
import type { MediaRecord } from './core/images/types'
import { Picture } from './core/images/Picture'
import { site } from './site.config'
import '@fontsource-variable/inter/wght-italic.css'

const WORKS_TEST_EMAIL = 'prueba@alei.com'

function sheetLabel(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/\s*\(\s*enmarcado\s*\)/gi, '').replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim()
}

function mailHref(title: string, email: string) {
  const clean = email.trim()
  if (!clean) return ''
  const work = title.trim() || 'the work'
  const subject = encodeURIComponent(`I'm interested in the work ${work}`)
  const body = encodeURIComponent(`I'm interested in the work ${work}.`)
  return `mailto:${clean}?subject=${subject}&body=${body}`
}

type FrameSlide = {
  id: string
  media: MediaRecord | null
  src: string
}

function frameSlides(piece: CanvasPiece): FrameSlide[] {
  const main: FrameSlide[] =
    piece.media?.url || piece.src
      ? [{ id: `main-${piece.id}`, media: piece.media, src: piece.src }]
      : []
  const extra = (piece.slides ?? [])
    .filter((slide): slide is PieceSlide => Boolean(slide.media?.url || slide.src))
    .map((slide) => ({ id: slide.id, media: slide.media, src: slide.src }))
  return [...extra, ...main]
}

type ImageMeasure = {
  edge: number
  frame: number
  gap: number
  footTop: number
  footLeft: number
}

function WorkImage({
  piece,
  onMeasure,
}: {
  piece: CanvasPiece
  onMeasure: (measure: ImageMeasure | null) => void
}) {
  const slides = frameSlides(piece)
  const [index, setIndex] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const onMeasureRef = useRef(onMeasure)
  const shownIndex = useRef<number | null>(null)
  const [imageEdge, setImageEdge] = useState<number | null>(null)

  useEffect(() => {
    onMeasureRef.current = onMeasure
  }, [onMeasure])

  useEffect(() => {
    setIndex(0)
  }, [piece.id])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const track = frame.querySelector('.artwork__track')
    const durationValue = track ? getComputedStyle(track).transitionDuration : '0s'
    const durationNumber = Number.parseFloat(durationValue) || 0
    const duration = durationValue.trim().endsWith('ms') ? durationNumber / 1000 : durationNumber
    let defer = shownIndex.current !== null && shownIndex.current !== index && duration > 0

    const measure = () => {
      const img = frame.querySelectorAll('.artwork__slide img')[index] as HTMLImageElement | undefined
      if (!img?.naturalWidth || !img.naturalHeight || !frame.clientWidth || !frame.clientHeight) {
        if (!defer) {
          setImageEdge(null)
          onMeasureRef.current(null)
        }
        return
      }
      const scale = Math.min(frame.clientWidth / img.naturalWidth, frame.clientHeight / img.naturalHeight)
      const edge = img.naturalWidth * scale
      const paintedH = img.naturalHeight * scale
      const sheet = frame.closest('.artwork--works')
      const gap = sheet ? Number.parseFloat(getComputedStyle(sheet).columnGap) || 0 : 0
      const copy = sheet?.querySelector('.artwork__copy')
      const foot = sheet?.querySelector('.artwork__foot')
      const frameRect = frame.getBoundingClientRect()
      const copyRect = copy?.getBoundingClientRect()
      const paintedBottom = frameRect.top + (frame.clientHeight - paintedH) / 2 + paintedH
      const label = foot?.querySelector('.artwork__status, .artwork__mail')
      const labelNode = label ?? foot
      let bottomInFoot = foot?.getBoundingClientRect().height ?? 0
      if (labelNode && foot) {
        const probe = document.createElement('span')
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;'
        labelNode.appendChild(probe)
        try {
          bottomInFoot = probe.getBoundingClientRect().top - foot.getBoundingClientRect().top
        } finally {
          probe.remove()
        }
      }
      const footTop = copyRect ? paintedBottom - copyRect.top - bottomInFoot : 0
      const footLeft = copyRect ? frameRect.left + edge + 8 - copyRect.left : 0
      if (defer) return
      shownIndex.current = index
      setImageEdge(edge)
      onMeasureRef.current({ edge, frame: frame.clientWidth, gap, footTop, footLeft })
    }

    const onSlideEnd = (event: Event) => {
      const transition = event as TransitionEvent
      if (transition.propertyName !== 'transform') return
      defer = false
      measure()
    }

    measure()
    const img = frame.querySelectorAll('.artwork__slide img')[index] as HTMLImageElement | undefined
    img?.addEventListener('load', measure)
    if (defer) track?.addEventListener('transitionend', onSlideEnd)
    const fallback = defer ? window.setTimeout(() => onSlideEnd(new TransitionEvent('transitionend', { propertyName: 'transform' })), duration * 1000 + 80) : 0
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    const sheet = frame.closest('.artwork--works')
    const copy = sheet?.querySelector('.artwork__copy')
    const foot = sheet?.querySelector('.artwork__foot')
    if (copy) observer.observe(copy)
    if (foot) observer.observe(foot)
    let cancelled = false
    const onFonts = () => {
      if (!cancelled) measure()
    }
    void document.fonts?.ready.then(onFonts)
    document.fonts?.addEventListener('loadingdone', onFonts)
    return () => {
      cancelled = true
      img?.removeEventListener('load', measure)
      track?.removeEventListener('transitionend', onSlideEnd)
      window.clearTimeout(fallback)
      document.fonts?.removeEventListener('loadingdone', onFonts)
      observer.disconnect()
    }
  }, [index, piece.id])

  function step(delta: number) {
    if (slides.length < 2) return
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  return (
    <>
      <div className="artwork__frame" ref={frameRef}>
        <div className="artwork__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, slideIndex) => (
            <div key={slide.id} className="artwork__slide">
              {slide.media ? (
                <Picture
                  media={slide.media}
                  sizes="(max-width: 800px) 100vw, 48vw"
                  alt={piece.title}
                  loading={slideIndex === index ? 'eager' : 'lazy'}
                />
              ) : (
                <img src={slide.src} alt={piece.title} loading={slideIndex === index ? 'eager' : 'lazy'} />
              )}
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 ? (
        <button type="button" className="artwork__nav artwork__nav--prev" aria-label="Previous image" onClick={() => step(-1)}>
          <span className="artwork__arrow" aria-hidden="true">
            ‹
          </span>
        </button>
      ) : null}
      {slides.length > 1 ? (
        <button
          type="button"
          className="artwork__nav artwork__nav--next"
          aria-label="Next image"
          style={imageEdge != null ? { left: `${imageEdge}px` } : undefined}
          onClick={() => step(1)}
        >
          <span className="artwork__arrow" aria-hidden="true">
            ›
          </span>
        </button>
      ) : null}
    </>
  )
}

function WorksSheet({ piece }: { piece: CanvasPiece }) {
  const sheet = sheetLabel(piece.ficha)
  const text = piece.text.trim()
  const email = site.contactEmail.trim() || WORKS_TEST_EMAIL
  const sold = piece.availability === 'sold'
  const [measure, setMeasure] = useState<ImageMeasure | null>(null)

  return (
    <article
      className={measure ? 'artwork artwork--works artwork--placed' : 'artwork artwork--works'}
      style={
        measure
          ? {
              ['--foot-top' as string]: `${measure.footTop}px`,
              ['--foot-left' as string]: `${measure.footLeft}px`,
            }
          : undefined
      }
    >
      <div className="artwork__stage">
        <WorkImage piece={piece} onMeasure={setMeasure} />
      </div>
      <div className="artwork__copy">
        {piece.title ? <h1 className="artwork__title">{piece.title}</h1> : null}
        {sheet ? <p className="artwork__sheet">{sheet}</p> : null}
        {text ? <p className="artwork__text">{text}</p> : null}
        <p className="artwork__foot">
          {sold ? (
            <span className="artwork__status">sold</span>
          ) : (
            <a className="artwork__mail" href={mailHref(piece.title, email)}>
              {email}
            </a>
          )}
        </p>
      </div>
    </article>
  )
}

export function ArtworkPage({ scope, label }: { scope: string; label: string }) {
  const { pieceId } = useParams()
  const [piece, setPiece] = useState<CanvasPiece | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    setPiece(undefined)
    setError('')
    void apiGetCanvas(scope, { slides: true })
      .then((data) => {
        const found = data.blocks
          .filter((block) => scope !== 'works' || block.kind !== 'canvas' || block.visible !== false)
          .flatMap((block) => block.pieces)
          .find((item) => item.id === pieceId)
        setPiece(found ?? null)
      })
      .catch(() => setError(`${label} is not available.`))
  }, [scope, label, pieceId])

  if (error) {
    return (
      <div className="artwork">
        <p className="artwork__note">{error}</p>
      </div>
    )
  }

  if (piece === undefined) return <div className="artwork" />

  if (!piece) {
    return (
      <div className="artwork">
        <p className="artwork__note">
          This work is not available. <Link to={`/${scope}`}>{label}</Link>
        </p>
      </div>
    )
  }

  if (scope === 'works') return <WorksSheet piece={piece} />

  const mail = mailHref(piece.title, site.contactEmail)
  const status = piece.availability === 'sold' ? 'Sold' : 'Available'

  return (
    <article className="artwork">
      <div className="artwork__image">
        {piece.media ? (
          <Picture media={piece.media} sizes="(max-width: 800px) 100vw, 62vw" alt={piece.title} />
        ) : (
          <img src={piece.src} alt={piece.title} />
        )}
      </div>
      <div className="artwork__meta">
        {piece.title ? <h1 className="artwork__title">{piece.title}</h1> : null}
        {piece.ficha ? <p className="artwork__ficha">{piece.ficha}</p> : null}
        {piece.text ? <p className="artwork__ficha">{piece.text}</p> : null}
        <p className="artwork__status">{status}</p>
        {mail ? (
          <a className="artwork__mail" href={mail}>
            {site.contactEmail}
          </a>
        ) : null}
      </div>
    </article>
  )
}
