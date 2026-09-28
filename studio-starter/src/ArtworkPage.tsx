import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetCanvas, type CanvasPiece } from './core/api/canvas'
import { Picture } from './core/images/Picture'
import { site } from './site.config'

function mailHref(title: string) {
  const email = site.contactEmail.trim()
  if (!email) return ''
  const work = title.trim() || 'the work'
  const subject = encodeURIComponent(`I'm interested in the work ${work}`)
  const body = encodeURIComponent(`I'm interested in the work ${work}.`)
  return `mailto:${email}?subject=${subject}&body=${body}`
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

  const mail = mailHref(piece.title)
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
