import { useEffect, useState } from 'react'
import {
  apiCreateEditorial,
  apiDeleteEditorial,
  apiGetEditorial,
  apiListEditorial,
  apiMoveEditorial,
  apiSaveEditorial,
  type EditorialItem,
} from '../../api/editorial.ts'
import { apiUploadMedia } from '../../api/media.ts'
import { Picture } from '../../images/Picture.tsx'
import { prepareVariants } from '../../images/prepareVariants.ts'

type Draft = {
  title: string
  excerpt: string
  body: string
  cover: EditorialItem['cover']
}

const emptyDraft = (): Draft => ({ title: '', excerpt: '', body: '', cover: null })

export function AdminEditorial() {
  const [items, setItems] = useState<EditorialItem[]>([])
  const [editing, setEditing] = useState<EditorialItem | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function reload() {
    const data = await apiListEditorial()
    setItems(data.items)
  }

  useEffect(() => {
    void reload().catch((err) => {
      setError(err instanceof Error ? err.message : 'No se pudo listar')
    })
  }, [])

  function openNew() {
    setEditing('new')
    setDraft(emptyDraft())
    setError('')
    setStatus('')
  }

  async function openEdit(item: EditorialItem) {
    setError('')
    setStatus('Abriendo…')
    try {
      const full = await apiGetEditorial(item.id)
      setEditing(full)
      setDraft({
        title: full.title,
        excerpt: full.excerpt,
        body: full.body ?? '',
        cover: full.cover,
      })
      setStatus('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir')
    }
  }

  async function onSave() {
    if (!draft.title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setBusy(true)
    setError('')
    setStatus('Guardando…')
    const payload = {
      title: draft.title.trim(),
      excerpt: draft.excerpt,
      body: draft.body,
      coverMediaId: draft.cover?.id ?? null,
    }
    try {
      if (editing === 'new') await apiCreateEditorial(payload)
      else if (editing) await apiSaveEditorial(editing.id, payload)
      await reload()
      setEditing(null)
      setStatus('Guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  async function onCover(file: File | undefined) {
    if (!file || busy) return
    setBusy(true)
    setError('')
    setStatus('Preparando portada…')
    try {
      const prepared = await prepareVariants(file)
      setStatus('Subiendo portada…')
      const media = await apiUploadMedia(prepared)
      setDraft((prev) => ({ ...prev, cover: media }))
      setStatus('Portada lista. Guardá para publicar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la portada')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  async function onMove(id: string, dir: 'up' | 'down') {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await apiMoveEditorial(id, dir)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reordenar')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (busy) return
    if (!window.confirm('¿Borrar este ítem?')) return
    setBusy(true)
    setError('')
    try {
      await apiDeleteEditorial(id)
      if (editing && editing !== 'new' && editing.id === id) setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <main className="admin-page">
        <h1 className="admin-page__title">{editing === 'new' ? 'Nuevo ítem' : 'Editar ítem'}</h1>
        <p className="admin-page__copy">
          Título y bajada se ven en la lista. El cuerpo se lee al entrar.
        </p>

        <label className="admin-login__label" htmlFor="editorial-title">
          Título
        </label>
        <input
          id="editorial-title"
          className="admin-login__input"
          value={draft.title}
          disabled={busy}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
        />

        <label className="admin-login__label" htmlFor="editorial-excerpt">
          Bajada (lista)
        </label>
        <textarea
          id="editorial-excerpt"
          className="admin-login__input admin-textarea"
          rows={3}
          value={draft.excerpt}
          disabled={busy}
          onChange={(event) => setDraft((prev) => ({ ...prev, excerpt: event.target.value }))}
        />

        <label className="admin-login__label" htmlFor="editorial-body">
          Texto completo
        </label>
        <textarea
          id="editorial-body"
          className="admin-login__input admin-textarea"
          rows={12}
          value={draft.body}
          disabled={busy}
          onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
        />

        <p className="admin-login__label">Portada</p>
        {draft.cover && (
          <div className="admin-cover-preview">
            <Picture media={draft.cover} sizes="220px" alt="" />
            <button
              type="button"
              className="admin-media-grid__delete"
              disabled={busy}
              onClick={() => setDraft((prev) => ({ ...prev, cover: null }))}
            >
              Quitar portada
            </button>
          </div>
        )}
        <label className={`admin-upload${busy ? ' is-busy' : ''}`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void onCover(file)
            }}
          />
          {draft.cover ? 'Cambiar portada' : 'Subir portada'}
        </label>

        {status && <p className="admin-page__copy">{status}</p>}
        {error && <p className="admin-login__error">{error}</p>}

        <div className="admin-actions">
          <button type="button" className="admin-login__submit" disabled={busy} onClick={() => void onSave()}>
            Guardar
          </button>
          <button
            type="button"
            className="admin-nav__button"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            Volver a la lista
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page admin-page--wide">
      <h1 className="admin-page__title">Editorial</h1>
      <p className="admin-page__copy">
        Receta <code>base-editorial</code>: lista + ficha. En un cliente renombrá la tabla
        y las rutas (textos, series, muestras…).
      </p>

      <button type="button" className="admin-login__submit" disabled={busy} onClick={openNew}>
        Nuevo ítem
      </button>

      {error && <p className="admin-login__error">{error}</p>}
      {status && <p className="admin-page__copy">{status}</p>}
      {items.length === 0 && !error && (
        <p className="admin-page__hint">Todavía no hay ítems.</p>
      )}

      <ul className="admin-editorial-list">
        {items.map((item, index) => (
          <li key={item.id} className="admin-editorial-list__item">
            {item.cover ? (
              <Picture media={item.cover} sizes="80px" alt="" />
            ) : (
              <span className="admin-editorial-list__ph" />
            )}
            <div>
              <strong>{item.title}</strong>
              {item.excerpt ? <p>{item.excerpt}</p> : null}
            </div>
            <div className="admin-editorial-list__ops">
              <button type="button" disabled={busy || index === 0} onClick={() => void onMove(item.id, 'up')}>
                Subir
              </button>
              <button
                type="button"
                disabled={busy || index === items.length - 1}
                onClick={() => void onMove(item.id, 'down')}
              >
                Bajar
              </button>
              <button type="button" disabled={busy} onClick={() => void openEdit(item)}>
                Editar
              </button>
              <button type="button" disabled={busy} onClick={() => void onDelete(item.id)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
