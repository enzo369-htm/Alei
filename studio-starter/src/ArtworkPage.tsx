import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetCanvas, type CanvasPiece } from './core/api/canvas'
import { Picture } from './core/images/Picture'
import { site } from './site.config'
import '@fontsource-variable/inter/wght-italic.css'

const WORKS_TEST_EMAIL = 'prueba@alei.com'
const MEASURE_RE = /\d[\d.,]*\s*(?:x|×|X)\s*\d|\d[\d.,]*\s*cm\b/i

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
  const rest = lines.filter((line) => !MEASURE_RE.test(line))
  if (rest.length === 0) return { measures: measures.join('\n'), technique: '', text: '' }
  if (rest.length === 1 && rest[0].length > 80) {
    return { measures: measures.join('\n'), technique: '', text: rest[0] }
  }
  return {
    measures: measures.join('\n'),
    technique: rest[0] ?? '',
    text: rest.slice(1).join('\n'),
  }
}

function WorkImage({ piece }: { piece: CanvasPiece }) {
  const [index, setIndex] = useState(0)
  const slides = piece.media?.url || piece.src ? [piece] : []

  useEffect(() => {
    setIndex(0)
  }, [piece.id])

  function step(delta: number) {
    if (slides.length < 2) return
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  return (
    <div className="artwork__frame">
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.id}
          className={`artwork__slide${slideIndex === index ? ' is-active' : ''}`}
          aria-hidden={slideIndex !== index}
        >
          {slide.media ? (
            <Picture media={slide.media} sizes="(max-width: 800px) 100vw, 750px" alt={slide.title} />
          ) : (
            <img src={slide.src} alt={slide.title} />
          )}
        </div>
      ))}
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
        {sheet.technique ? <p className="artwork__technique">{sheet.technique}</p> : null}
        {sheet.text ? <p className="artwork__text">{sheet.text}</p> : null}
      </div>
      <p className="artwork__foot">
        {sold ? (
          <span className="artwork__status">sold</span>
        ) : (
          <a className="artwork__mail" href={mailHref(piece.title, email)}>
            {email}
          </a>
        )}
      </p>
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
    void apiGetCanvas(scope)
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
