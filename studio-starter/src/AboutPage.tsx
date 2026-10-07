import { useEffect, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import type { MediaRecord } from './core/images/types'

type AboutSlide = {
  id: string
  media: MediaRecord
}

function aboutSlides(image: MediaRecord | null): AboutSlide[] {
  if (!image?.url) return []
  return [{ id: `main-${image.id}`, media: image }]
}

function AboutImage({ image, title }: { image: MediaRecord | null; title: string }) {
  const slides = aboutSlides(image)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [image?.id])

  function step(delta: number) {
    if (slides.length < 2) return
    setIndex((current) => (current + delta + slides.length) % slides.length)
  }

  return (
    <div className="artwork__frame">
      <div className="artwork__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, slideIndex) => (
          <div key={slide.id} className="artwork__slide">
            <Picture
              media={slide.media}
              sizes="(max-width: 800px) 100vw, 850px"
              alt={title}
              loading={slideIndex === index ? 'eager' : 'lazy'}
            />
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

function AboutSheet({ page }: { page: PageRecord }) {
  const text = page.body.trim()

  return (
    <article className="artwork artwork--works artwork--about">
      <div className="artwork__stage">
        <AboutImage image={page.image} title={page.title} />
      </div>
      <div className="artwork__copy">
        {page.title ? <h1 className="artwork__title">{page.title}</h1> : null}
        {text ? <p className="artwork__text">{text}</p> : null}
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
      <div className="artwork artwork--works">
        <p className="artwork__note">{error}</p>
      </div>
    )
  }

  if (page === undefined) return <div className="artwork artwork--works" />

  if (!page) return <div className="artwork artwork--works" />

  return <AboutSheet page={page} />
}
