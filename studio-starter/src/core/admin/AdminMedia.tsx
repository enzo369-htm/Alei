import { useEffect, useState } from 'react'
import { apiDeleteMedia, apiListMedia, apiUploadMedia } from '../api/media.ts'
import { Picture } from '../images/Picture.tsx'
import { prepareVariants } from '../images/prepareVariants.ts'
import type { MediaRecord } from '../images/types.ts'

export function AdminMedia() {
  const [items, setItems] = useState<MediaRecord[]>([])
  const [status, setStatus] = useState('')
  const [percent, setPercent] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function reload() {
    const data = await apiListMedia()
    setItems(data.items)
  }

  useEffect(() => {
    void reload().catch((err) => {
      setError(err instanceof Error ? err.message : 'No se pudo listar')
    })
  }, [])

  async function onPick(file: File | undefined) {
    if (!file || busy) return
    setBusy(true)
    setError('')
    setPercent(0)
    setStatus('Leyendo la imagen…')
    try {
      const prepared = await prepareVariants(file, (progress) => {
        if (progress.stage === 'decode') {
          setStatus('Leyendo la imagen…')
          setPercent(5)
          return
        }
        if (progress.stage === 'encode') {
          setStatus(`Preparando variantes ${progress.current}/${progress.total}…`)
          setPercent(10 + Math.round((progress.current / progress.total) * 50))
        }
      })
      setStatus('Subiendo…')
      const saved = await apiUploadMedia(prepared, (progress) => {
        setPercent(60 + Math.round(progress.percent * 0.4))
      })
      setItems((prev) => [saved, ...prev])
      setStatus('Listo')
      setPercent(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setStatus('')
      setPercent(null)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (busy) return
    if (!window.confirm('¿Borrar esta imagen de R2 y de la base? No se puede deshacer.')) return
    setBusy(true)
    setError('')
    try {
      await apiDeleteMedia(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-page admin-page--wide">
      <h1 className="admin-page__title">Media</h1>
      <p className="admin-page__copy">
        Archivo de todas las fotos (hero, works, colabs). No hace falta pasar por acá
        para publicar: subís desde cada sección. Acá se ve todo junto y se puede borrar.
        Borrar acá también la saca del sitio.
      </p>

      <label className={`admin-upload${busy ? ' is-busy' : ''}`}>
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
        {busy ? 'Trabajando…' : 'Elegir imagen'}
      </label>

      {percent !== null && (
        <div className="admin-progress" aria-live="polite">
          <div className="admin-progress__track">
            <div className="admin-progress__bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="admin-progress__label">
            {status} {percent}%
          </p>
        </div>
      )}
      {error && <p className="admin-login__error">{error}</p>}

      {items.length === 0 && !busy && !error && (
        <p className="admin-page__hint">Todavía no hay fotos.</p>
      )}

      <ul className="admin-media-grid">
        {items.map((item) => (
          <li key={item.id} className="admin-media-grid__item">
            <Picture media={item} sizes="220px" alt="" />
            <p>
              {item.width}×{item.height}
              {' · '}
              {'format' in item.variants ? item.variants.format : '—'}
            </p>
            <button
              type="button"
              className="admin-media-grid__delete"
              disabled={busy}
              onClick={() => void onDelete(item.id)}
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
