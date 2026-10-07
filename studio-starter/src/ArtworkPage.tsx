import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetCanvas, type CanvasPiece, type PieceSlide } from './core/api/canvas'
import type { MediaRecord } from './core/images/types'
import { Picture } from './core/images/Picture'
import { site } from './site.config'
import '@fontsource-variable/inter/wght-italic.css'

const WORKS_TEST_EMAIL = 'prueba@alei.com'
const WORKS_TEST_TEXT = 'pon texto prueba'
const MEASURE_RE = /\d[\d.,]*\s*(?:x|×|X)\s*\d|\d[\d.,]*\s*cm\b/i
const DATE_RE = /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|ene|abr|ago|dic)[a-z]*\s*\d{2,4}$/i

function techniqueLabel(line: string) {
  return line.replace(/\s*\(\s*enmarcado\s*\)/gi, '').replace(/\s{2,}/g, ' ').trim()
}

function mailHref(title: string, email: string) {
  const clean = email.trim()
  if (!clean) return ''
  const work = title.trim() || 'the work'
  const subject = encodeURIComponent(`I'm interested in the work ${work}`)
  const body = encodeURIComponent(`I'm interested in the work ${work}.`)
  return `mailto:${clean}?subject=${subject}&body=${body}`
}

/** The admin stores one ficha. Size lines are medidas, the next line is técnica, the rest is the text. */
function sheetOf(ficha: string) {
  const lines = ficha
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) =>
      MEASURE_RE.test(line) && line.includes(',')
        ? line.split(',').map((part) => part.trim()).filter(Boolean)
        : [line],
    )
  const measures = lines.filter((line) => MEASURE_RE.test(line))
  const date = lines.filter((line) => DATE_RE.test(line)).join('\n')
  const rest = lines.filter((line) => !MEASURE_RE.test(line) && !DATE_RE.test(line))
  const sized = { measures: measures.join('\n'), date }
  if (rest.length === 0) return { ...sized, technique: '', text: '' }
  if (rest.length === 1 && rest[0].length > 80) {
    return { ...sized, technique: '', text: rest[0] }
  }
  return {
    ...sized,
    technique: rest[0] ?? '',
    text: rest.slice(1).join('\n'),
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
  return [...main, ...extra]
}

function WorkImage({ piece }: { piece: CanvasPiece }) {
  const slides = frameSlides(piece)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [piece.id])

  function step(delta: number) {
    if (slides.length < 2) return
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  return (
    <div className="artwork__frame">
      <div className="artwork__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, slideIndex) => (
          <div key={slide.id} className="artwork__slide">
            {slide.media ? (
              <Picture
                media={slide.media}
                sizes="(max-width: 800px) 100vw, 850px"
                alt={piece.title}
                loading={slideIndex === index ? 'eager' : 'lazy'}
              />
            ) : (
              <img src={slide.src} alt={piece.title} loading={slideIndex === index ? 'eager' : 'lazy'} />
            )}
          </div>
        ))}
      </div>
      <button type="button" className="artwork__nav artwork__nav--prev" aria-label="Previous image" onClick={() => step(-1)}>
        <span className="artwork__arrow" aria-hidden="true">
          ‹
        </span>
      </button>
      <button type="button" className="artwork__nav artwork__nav--next" aria-label="Next image" onClick={() => step(1)}>
        <span className="artwork__arrow" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  )
}

function WorksSheet({ piece }: { piece: CanvasPiece }) {
  const sheet = sheetOf(piece.ficha)
  const technique = techniqueLabel(sheet.technique)
  const email = site.contactEmail.trim() || WORKS_TEST_EMAIL
  const sold = piece.availability === 'sold'

  return (
    <article className="artwork artwork--works">
      <div className="artwork__stage">
        <WorkImage piece={piece} />
      </div>
      <div className="artwork__copy">
        {piece.title ? <h1 className="artwork__title">{piece.title}</h1> : null}
        {sheet.measures ? <p className="artwork__measures">{sheet.measures}</p> : null}
        {technique ? <p className="artwork__technique">{technique}</p> : null}
        {sheet.date ? <p className="artwork__date">{sheet.date}</p> : null}
        <p className="artwork__text">{sheet.text || WORKS_TEST_TEXT}</p>
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
