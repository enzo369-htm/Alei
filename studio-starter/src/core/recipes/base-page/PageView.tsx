import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGetPage, type PageRecord } from '../../api/pages.ts'
import { Picture } from '../../images/Picture.tsx'
import './page.css'

type Props = {
  slug: string
}

export function PageView({ slug }: Props) {
  const [page, setPage] = useState<PageRecord | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    void apiGetPage(slug)
      .then(setPage)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
  }, [slug])

  return (
    <article className="page-view">
      <p className="page-view__kicker">
        <Link to="/">Inicio</Link>
      </p>
      {error && <p className="page-view__note">{error}</p>}
      {page && (
        <div className="page-view__grid">
          {page.image && (
            <div className="page-view__image">
              <Picture media={page.image} sizes="(max-width: 800px) 100vw, 360px" alt="" />
            </div>
          )}
          <div>
            <h1 className="page-view__title">{page.title || slug}</h1>
            {page.body ? (
              <div className="page-view__body">
                {page.body.split('\n\n').map((para, index) => (
                  <p key={index}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="page-view__note">Sin texto todavía.</p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
