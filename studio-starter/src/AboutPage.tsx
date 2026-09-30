import { useEffect, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import './core/recipes/base-page/page.css'

export function AboutPage() {
  const [page, setPage] = useState<PageRecord | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    void apiGetPage('about')
      .then(setPage)
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'About is not available.'
        if (message === 'No encontrado') return
        setError(message)
      })
  }, [])

  if (error) return <p className="page-view__note">{error}</p>
  if (!page) return null

  return (
    <article className="page-view">
      <div className="page-view__grid">
        {page.image ? (
          <div className="page-view__image">
            <Picture media={page.image} sizes="(max-width: 800px) 100vw, 322px" alt="" />
          </div>
        ) : null}
          <div className="page-view__copy">
            {page.title ? <h1 className="page-view__title">{page.title}</h1> : null}
            {page.body ? (
              <div className="page-view__body">
                {page.body.split('\n\n').map((para, index) => (
                  <p key={index}>{para}</p>
                ))}
              </div>
            ) : null}
          </div>
      </div>
    </article>
  )
}
