import { useEffect, useState } from 'react'
import { apiGetHero, apiSaveHero, type HeroSlide } from '../api/hero.ts'
import { apiUploadMedia } from '../api/media.ts'
import { Picture } from '../images/Picture.tsx'
import { prepareVariants } from '../images/prepareVariants.ts'

export function AdminHero() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [status, setStatus] = useState('Listo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void apiGetHero()
      .then((data) => setSlides(data.slides))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
  }, [])

  async function persist(next: HeroSlide[], message: string) {
    setBusy(true)
    setError('')
    try {
      const saved = await apiSaveHero(next.map((slide) => slide.media.id))
      setSlides(saved.slides)
      setStatus(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  async function onPick(file: File | undefined) {
    if (!file || busy) return
    if (slides.length >= 12) {
      setError('Máximo 12 pinturas en el hero')
      return
    }
    setBusy(true)
    setError('')
    setStatus('Subiendo…')
    try {
      const prepared = await prepareVariants(file)
      const media = await apiUploadMedia(prepared)
      const saved = await apiSaveHero([...slides.map((slide) => slide.media.id), media.id])
      setSlides(saved.slides)
      setStatus('Agregada — se ve en Home al recargar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...slides]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    const a = next[index]
    const b = next[swap]
    if (!a || !b) return
    next[index] = b
    next[swap] = a
    void persist(next, 'Orden guardado')
  }

  return (
    <main className="admin-page admin-page--wide">
      <div className="admin-canvas-head">
        <h1 className="admin-page__title">Hero</h1>
        <div className="admin-actions">
          <span className="admin-page__copy">{status}</span>
          <label className={`admin-btn admin-upload${busy ? ' is-busy' : ''}`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void onPick(file)
              }}
            />
            Subir pintura
          </label>
        </div>
      </div>
      <p className="admin-page__copy">
        Estas pinturas rotan en Home cada vez que alguien entra. Se ven enteras, sin recorte.
      </p>
      {error && <p className="admin-login__error">{error}</p>}
      {slides.length === 0 && !error && (
        <p className="admin-page__hint">Todavía no hay pinturas. Subí la primera.</p>
      )}
      <ul className="admin-media-grid">
        {slides.map((slide, index) => (
          <li key={slide.id} className="admin-media-grid__item">
            <Picture media={slide.media} sizes="220px" alt="" />
            <p>
              {index + 1} / {slides.length}
            </p>
            <div className="admin-editorial-list__ops">
              <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                Subir
              </button>
              <button
                type="button"
                disabled={busy || index === slides.length - 1}
                onClick={() => move(index, 1)}
              >
                Bajar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void persist(
                    slides.filter((item) => item.id !== slide.id),
                    'Quitada del hero',
                  )
                }
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
