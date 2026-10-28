import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetCanvas, type CanvasPiece, type PieceSlide } from './core/api/canvas'
import type { MediaRecord } from './core/images/types'
import { Picture } from './core/images/Picture'
import { textOf, useLocale, type CopyKey } from './locale'
import { site } from './site.config'
import '@fontsource-variable/inter/wght-italic.css'

const WORKS_TEST_EMAIL = 'prueba@alei.com'

function isDateLine(line: string) {
  return /^(?:ene(?:ro)?|feb(?:ruary|rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|jan(?:uary)?|apr(?:il)?|aug(?:ust)?|dec(?:ember)?|march|june|july|september|october|november)\s*\d{4}$/i.test(
    line.trim(),
  )
}

function sheetLabel(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/\s*\(\s*enmarcado\s*\)/gi, '').replace(/[ \t]{2,}/g, ' ').trimEnd())
    .filter((line) => !isDateLine(line))
    .join('\n')
    .trim()
}

function mailHref(email: string, subjectLine: string, bodyLine: string) {
  const clean = email.trim()
  if (!clean) return ''
  const subject = encodeURIComponent(subjectLine)
  const body = encodeURIComponent(bodyLine)
  return `mailto:${clean}?subject=${subject}&body=${body}`
}

function interestLines(title: string, t: (key: CopyKey) => string) {
  const work = title.trim()
  if (!work) return { subject: t('interestEmptySubject'), body: t('interestEmptyBody') }
  return {
    subject: t('interestSubject').replaceAll('{work}', work),
    body: t('interestBody').replaceAll('{work}', work),
  }
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
  const { lang, t } = useLocale()
  const alt = textOf(piece.title, piece.titleEn, lang)
  const slides = frameSlides(piece)
  const [index, setIndex] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const onMeasureRef = useRef(onMeasure)

  useEffect(() => {
    onMeasureRef.current = onMeasure
  }, [onMeasure])

  useEffect(() => {
    setIndex(0)
  }, [piece.id])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const measure = () => {
      if (!frame.clientWidth || !frame.clientHeight) {
        onMeasureRef.current(null)
        return
      }
      const sheet = frame.closest('.artwork--works')
      const copy = sheet?.querySelector('.artwork__copy')
      const foot = sheet?.querySelector('.artwork__foot')
      const frameRect = frame.getBoundingClientRect()
      const copyRect = copy?.getBoundingClientRect()
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
      const gap = sheet ? Number.parseFloat(getComputedStyle(sheet).columnGap) || 0 : 0
      const footTop = copyRect ? frameRect.bottom - copyRect.top - bottomInFoot : 0
      const footLeft = copyRect ? frameRect.right + gap - copyRect.left : 0
      onMeasureRef.current({ footTop, footLeft })
    }

    measure()
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
      document.fonts?.removeEventListener('loadingdone', onFonts)
      observer.disconnect()
    }
  }, [piece.id])

  function step(delta: number) {
    if (slides.length < 2) return
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  const current = slides[index]
  const ratio =
    current?.media?.width && current?.media?.height ? `${current.media.width} / ${current.media.height}` : undefined

  return (
    <>
      <div className="artwork__frame" ref={frameRef} style={ratio ? { aspectRatio: ratio } : undefined}>
        <div className="artwork__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, slideIndex) => (
            <div key={slide.id} className="artwork__slide">
              {slide.media ? (
                <Picture
                  media={slide.media}
                  sizes="(max-width: 800px) 100vw, 58vw"
                  alt={alt}
                  loading={slideIndex === index ? 'eager' : 'lazy'}
                />
              ) : (
                <img src={slide.src} alt={alt} loading={slideIndex === index ? 'eager' : 'lazy'} />
              )}
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 ? (
        <button type="button" className="artwork__nav artwork__nav--prev" aria-label={t('previousImage')} onClick={() => step(-1)}>
          <span className="artwork__arrow" aria-hidden="true">
            ‹
          </span>
        </button>
      ) : null}
      {slides.length > 1 ? (
        <button type="button" className="artwork__nav artwork__nav--next" aria-label={t('nextImage')} onClick={() => step(1)}>
          <span className="artwork__arrow" aria-hidden="true">
            ›
          </span>
        </button>
      ) : null}
    </>
  )
}

function letterInk(el: HTMLElement) {
  const style = getComputedStyle(el)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = style.font
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
  const metrics = ctx.measureText(el.textContent ?? '')
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left - metrics.actualBoundingBoxLeft,
    right: rect.left + metrics.actualBoundingBoxRight,
  }
}

function WorksSheet({ piece }: { piece: CanvasPiece }) {
  const { lang, t } = useLocale()
  const title = textOf(piece.title, piece.titleEn, lang)
  const sheet = sheetLabel(textOf(piece.ficha, piece.fichaEn, lang))
  const text = textOf(piece.text, piece.textEn, lang).trim()
  const email = site.contactEmail.trim() || WORKS_TEST_EMAIL
  const sold = piece.availability === 'sold'
  const interest = interestLines(title, t)
  const [measure, setMeasure] = useState<ImageMeasure | null>(null)
  const [edges, setEdges] = useState<{ imageLeft: number; textEdge: number } | null>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const align = () => {
      const alei = document.querySelector<HTMLElement>('.site-nav__brand')
      const about = document.querySelector<HTMLElement>('.site-nav a[href="/about"]')
      if (!alei || !about) return
      const a = letterInk(alei)
      const t = letterInk(about)
      const pageRight = sheetRef.current?.getBoundingClientRect().right
      if (!a || !t || pageRight == null) return
      const next = { imageLeft: a.left, textEdge: pageRight - t.right }
      setEdges((current) =>
        current && Math.abs(current.imageLeft - next.imageLeft) < 0.1 && Math.abs(current.textEdge - next.textEdge) < 0.1
          ? current
          : next,
      )
    }
    align()
    window.addEventListener('resize', align)
    void document.fonts?.ready.then(align)
    return () => window.removeEventListener('resize', align)
  }, [])

  return (
    <article
      ref={sheetRef}
      className={measure ? 'artwork artwork--works artwork--placed' : 'artwork artwork--works'}
      style={{
        ...(edges
          ? {
              ['--image-left' as string]: `${edges.imageLeft}px`,
              ['--text-edge' as string]: `${edges.textEdge}px`,
            }
          : null),
        ...(measure
          ? {
              ['--foot-top' as string]: `${measure.footTop}px`,
              ['--foot-left' as string]: `${measure.footLeft}px`,
            }
          : null),
      }}
    >
      <div className="artwork__stage">
        <WorkImage piece={piece} onMeasure={setMeasure} />
      </div>
      <div className="artwork__copy">
        {title.trim() ? <h1 className="artwork__title">{title}</h1> : null}
        {sheet ? <p className="artwork__sheet">{sheet}</p> : null}
        {text ? <p className="artwork__text">{text}</p> : null}
        <p className="artwork__foot">
          {sold ? (
            <span className="artwork__status">{t('sold')}</span>
          ) : (
            <a className="artwork__mail" href={mailHref(email, interest.subject, interest.body)}>
              {email}
            </a>
          )}
        </p>
      </div>
    </article>
  )
}

export function ArtworkPage({ scope, label }: { scope: string; label: string }) {
  const { lang, t } = useLocale()
  const { pieceId } = useParams()
  const [piece, setPiece] = useState<CanvasPiece | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setPiece(undefined)
    setFailed(false)
    void apiGetCanvas(scope, { slides: true })
      .then((data) => {
        const found = data.blocks
          .filter((block) => (scope !== 'works' && scope !== 'colabs') || block.kind !== 'canvas' || block.visible !== false)
          .flatMap((block) => block.pieces)
          .find((item) => item.id === pieceId)
        setPiece(found ?? null)
      })
      .catch(() => setFailed(true))
  }, [scope, pieceId])

  if (failed) {
    return (
      <div className="artwork">
        <p className="artwork__note">{t('unavailable')}</p>
      </div>
    )
  }

  if (piece === undefined) return <div className="artwork" />

  if (!piece) {
    return (
      <div className="artwork">
        <p className="artwork__note">
          {t('workUnavailable')} <Link to={`/${scope}`}>{label}</Link>
        </p>
      </div>
    )
  }

  if (scope === 'works' || scope === 'colabs') return <WorksSheet piece={piece} />

  const title = textOf(piece.title, piece.titleEn, lang)
  const ficha = textOf(piece.ficha, piece.fichaEn, lang)
  const text = textOf(piece.text, piece.textEn, lang)
  const interest = interestLines(title, t)
  const mail = mailHref(site.contactEmail, interest.subject, interest.body)
  const status = piece.availability === 'sold' ? t('sold') : 'Available'

  return (
    <article className="artwork">
      <div className="artwork__image">
        {piece.media ? (
          <Picture media={piece.media} sizes="(max-width: 800px) 100vw, 62vw" alt={title} />
        ) : (
          <img src={piece.src} alt={title} />
        )}
      </div>
      <div className="artwork__meta">
        {title.trim() ? <h1 className="artwork__title">{title}</h1> : null}
        {ficha.trim() ? <p className="artwork__ficha">{ficha}</p> : null}
        {text.trim() ? <p className="artwork__ficha">{text}</p> : null}
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
