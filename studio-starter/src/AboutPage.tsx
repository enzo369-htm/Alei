import { useEffect, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import { site } from './site.config'

const ABOUT_EMAIL = 'prueba@alei.com'
const ABOUT_INSTAGRAM = '@alei'
const ABOUT_INSTAGRAM_URL = 'https://www.instagram.com/alei/'

function AboutSheet({ page }: { page: PageRecord }) {
  const text = page.body.trim()
  const email = site.contactEmail.trim() || ABOUT_EMAIL

  return (
    <article className="about-page">
      <div className="about-page__copy">
        {page.title ? <h1 className="about-page__title">{page.title}</h1> : null}
        {text ? <p className="about-page__text">{text}</p> : null}
      </div>
      <div className="about-page__visual">
        <div className="about-page__photo">
          {page.image ? (
            <Picture
              media={page.image}
              sizes="(max-width: 800px) 37vw, 17vw"
              alt={page.title}
              loading="eager"
            />
          ) : null}
        </div>
        <div className="about-page__info">
          <a className="about-page__mail" href={`mailto:${email}`}>
            {email}
          </a>
          <a className="about-page__social" href={ABOUT_INSTAGRAM_URL}>
            {ABOUT_INSTAGRAM}
          </a>
        </div>
      </div>
    </article>
  )
}

export function AboutPage() {
  const [page, setPage] = useState<PageRecord | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(undefined)
    setError('')
    void apiGetPage('about')
      .then(setPage)
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'About is not available.'
        if (message === 'No encontrado') {
          setPage(null)
          return
        }
        setError(message)
      })
  }, [])

  if (error) {
    return (
      <div className="about-page">
        <p className="about-page__note">{error}</p>
      </div>
    )
  }

  if (page === undefined) return <div className="about-page" />

  if (!page) return <div className="about-page" />

  return <AboutSheet page={page} />
}
