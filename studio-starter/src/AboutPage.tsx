import { useEffect, useRef, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import { site } from './site.config'

const ABOUT_EMAIL = 'aleidraws@gmail.com'
const ABOUT_INSTAGRAM = '@aleidraws'
const ABOUT_INSTAGRAM_URL = 'https://www.instagram.com/aleidraws/'

const ABOUT_BIO = [
  'His work is based on a layering strategy of superimposed stratums and mixed paint compositions coming from organic abstracted shapes.',
  'Through the use of modulation and materiality, he aims to reach a poetic and naked essence. Meanwhile, these compositions follow a path of silence in between the heights of paint reaching out to the essential.',
  'Space and time or physics and memory are concepts that hide along the subtle cracks on the canvas surface. Subdued tones fight against proportion to achieve harmony.',
]

const ABOUT_SHOWS = ['expo conjunta ACID FAIR (Tenerife, 2025)', 'expo irfof woefn (Madrid, 2026)']

const ABOUT_PRESS = ['ACERO MAGAZINE.', 'Faro de Vigo']

function letterRight(el: HTMLElement) {
  const style = getComputedStyle(el)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = style.font
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
  const metrics = ctx.measureText(el.textContent ?? '')
  return el.getBoundingClientRect().left + metrics.actualBoundingBoxRight
}

function AboutSheet({ page }: { page: PageRecord }) {
  const email = site.contactEmail.trim() || ABOUT_EMAIL
  const [textEdge, setTextEdge] = useState<number | null>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const align = () => {
      const about = [...document.querySelectorAll<HTMLElement>('.site-nav a')].find((link) => link.textContent?.trim() === 'about')
      const pageRight = sheetRef.current?.getBoundingClientRect().right
      if (!about || pageRight == null) return
      const right = letterRight(about)
      if (right == null) return
      const next = pageRight - right
      setTextEdge((current) => (current != null && Math.abs(current - next) < 0.1 ? current : next))
    }
    align()
    window.addEventListener('resize', align)
    void document.fonts?.ready.then(align)
    return () => window.removeEventListener('resize', align)
  }, [])

  return (
    <article ref={sheetRef} className="about-page" style={textEdge != null ? { ['--text-edge' as string]: `${textEdge}px` } : undefined}>
      <div className="about-page__photo">
        {page.image ? (
          <Picture
            media={page.image}
            sizes="(max-width: 800px) 37vw, 17vw"
            alt="alei"
            loading="eager"
          />
        ) : null}
      </div>
      <div className="about-page__copy">
        <h1 className="about-page__title">
          <strong>alei</strong> (alejandro rodríguez lópez)
        </h1>
        <div className="about-page__bio">
          {ABOUT_BIO.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <section className="about-page__block">
          <h2 className="about-page__label">exposiciones</h2>
          <ul className="about-page__list">
            {ABOUT_SHOWS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="about-page__block">
          <h2 className="about-page__label">prensa</h2>
          <ul className="about-page__list">
            {ABOUT_PRESS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="about-page__contact">
        <a className="about-page__mail" href={`mailto:${email}`}>
          {email}
        </a>
        <a className="about-page__social" href={ABOUT_INSTAGRAM_URL}>
          {ABOUT_INSTAGRAM}
        </a>
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
