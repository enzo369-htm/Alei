import { useEffect, useRef, useState } from 'react'
import { HeroFit } from '../../HeroFit.tsx'
import {
  apiGetHero,
  apiSaveHero,
  apiSaveHeroFit,
  apiUploadHeroFitFile,
  type HeroFitSettings,
  type HeroMode,
  type HeroSlide,
} from '../api/hero.ts'
import { apiUploadMedia } from '../api/media.ts'
import { Picture } from '../images/Picture.tsx'
import { prepareVariants } from '../images/prepareVariants.ts'

const FIT_MAX_BYTES = 4_000_000

function isMotionFile(file: File) {
  const name = file.name.toLowerCase()
  return (
    file.type === 'image/gif' ||
    file.type === 'video/mp4' ||
    file.type === 'video/webm' ||
    name.endsWith('.gif') ||
    name.endsWith('.mp4') ||
    name.endsWith('.webm')
  )
}

export function AdminHero() {
  const [panel, setPanel] = useState<HeroMode>('motion')
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [fit, setFit] = useState<HeroFitSettings>({ mode: 'motion', scale: 60, media: null })
  const [status, setStatus] = useState('Listo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scaleTimer = useRef<number | null>(null)
  const saveSeq = useRef(0)
  const live: HeroMode = fit.mode === 'fit' && fit.media ? 'fit' : 'motion'

  function clearScaleTimer() {
    if (scaleTimer.current) window.clearTimeout(scaleTimer.current)
    scaleTimer.current = null
  }

  useEffect(() => {
    void apiGetHero()
      .then((data) => {
        setSlides(data.slides)
        setFit(data.fit)
        setPanel(data.fit.mode === 'fit' && data.fit.media ? 'fit' : 'motion')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
    return () => {
      if (scaleTimer.current) window.clearTimeout(scaleTimer.current)
    }
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

  async function saveFit(
    patch: { mode?: HeroMode; scale?: number; mediaId?: string | null },
    message: string,
  ) {
    const seq = saveSeq.current + 1
    saveSeq.current = seq
    setBusy(true)
    setError('')
    try {
      const saved = await apiSaveHeroFit(patch)
      if (seq !== saveSeq.current) return
      setFit((current) => ({
        ...saved.fit,
        scale: patch.scale === undefined ? saved.fit.scale : current.scale,
      }))
      setStatus(message)
    } catch (err) {
      if (seq !== saveSeq.current) return
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      if (seq === saveSeq.current) setBusy(false)
    }
  }

  function onScale(value: number) {
    setFit((current) => ({ ...current, scale: value }))
    if (scaleTimer.current) window.clearTimeout(scaleTimer.current)
    scaleTimer.current = window.setTimeout(() => {
      void saveFit({ scale: value }, 'Tamaño guardado')
    }, 250)
  }

  async function onPickFit(file: File | undefined) {
    if (!file || busy) return
    if (file.size > FIT_MAX_BYTES) {
      setError('El archivo pasa de 4 MB. Usá una imagen, un GIF o un video más corto.')
      return
    }
    clearScaleTimer()
    setBusy(true)
    setError('')
    setStatus('Subiendo…')
    try {
      const media = isMotionFile(file)
        ? await apiUploadHeroFitFile(file)
        : await apiUploadMedia(await prepareVariants(file))
      const saved = await apiSaveHeroFit({ mediaId: media.id })
      setFit(saved.fit)
      setPanel('fit')
      setStatus('Hero 2 activo — se ve en Home al recargar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-page admin-page--wide">
      <div className="admin-canvas-head">
        <h1 className="admin-page__title">Hero</h1>
        <div className="admin-actions">
          <span className="admin-page__copy">{status}</span>
          {panel === 'motion' ? (
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
          ) : (
            <label className={`admin-btn admin-upload${busy ? ' is-busy' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  void onPickFit(file)
                }}
              />
              Subir archivo
            </label>
          )}
        </div>
      </div>

      <div className="admin-hero-modes" role="group" aria-label="Opción de hero">
        <button
          type="button"
          className={`admin-btn${live === 'motion' ? ' is-on' : ''}${panel === 'motion' ? ' is-open' : ''}`}
          aria-pressed={live === 'motion'}
          disabled={busy}
          onClick={() => {
            setPanel('motion')
            if (live !== 'motion') void saveFit({ mode: 'motion' }, 'Hero 1 activo')
          }}
        >
          {live === 'motion' ? 'Hero 1 · activo' : 'Hero 1'}
        </button>
        <button
          type="button"
          className={`admin-btn${live === 'fit' ? ' is-on' : ''}${panel === 'fit' ? ' is-open' : ''}`}
          aria-pressed={live === 'fit'}
          disabled={busy}
          onClick={() => {
            setPanel('fit')
            if (fit.media && live !== 'fit') void saveFit({ mode: 'fit' }, 'Hero 2 activo')
          }}
        >
          {live === 'fit' ? 'Hero 2 · activo' : 'Hero 2'}
        </button>
      </div>
      <p className="admin-page__copy">
        {live === 'fit'
          ? 'En la home se ve Hero 2.'
          : 'En la home se ve Hero 1. Hero 2 pasa a verse cuando tiene un archivo.'}
      </p>

      {error && <p className="admin-login__error">{error}</p>}

      {panel === 'motion' ? (
        <>
          <p className="admin-page__copy">
            Estas pinturas rotan en Home cada vez que alguien entra. Se ven enteras, sin recorte,
            con el movimiento y las flores.
          </p>
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
        </>
      ) : (
        <>
          <p className="admin-page__copy">
            Una imagen, un GIF o un video corto, centrado. El tamaño crece y achica desde el centro.
            Al subir el archivo, Hero 2 queda activo. Al quitarlo, vuelve Hero 1. El video suena mudo
            y se repite. Máximo 4 MB.
          </p>
          <label className="admin-hero-scale">
            <span>Tamaño {fit.scale}%</span>
            <input
              type="range"
              min={20}
              max={100}
              value={fit.scale}
              onChange={(event) => onScale(Number(event.target.value))}
            />
          </label>
          {fit.media ? (
            <>
              <div className="admin-hero-fit__stage">
                <HeroFit src={fit.media.url} mime={fit.media.mime} scale={fit.scale} />
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={busy}
                onClick={() => void saveFit({ mediaId: null }, 'Hero 1 activo')}
              >
                Quitar archivo
              </button>
            </>
          ) : (
            <p className="admin-page__hint">
              Todavía no hay archivo. Cuando subas una imagen, un GIF o un video, Hero 2 queda activo.
            </p>
          )}
        </>
      )}
    </main>
  )
}
