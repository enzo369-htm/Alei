import { useEffect, useState } from 'react'
import { apiGetPage, apiSavePage, type PageRecord } from '../../api/pages.ts'
import { apiUploadMedia } from '../../api/media.ts'
import { Picture } from '../../images/Picture.tsx'
import { prepareVariants } from '../../images/prepareVariants.ts'

type Props = {
  slug: string
  heading: string
}

export function AdminPageEditor({ slug, heading }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<PageRecord['image']>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    setStatus('')
    void apiGetPage(slug)
      .then((page) => {
        setTitle(page.title)
        setBody(page.body)
        setImage(page.image)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudo cargar'
        if (message === 'No encontrado') {
          setTitle('')
          setBody('')
          setImage(null)
          return
        }
        setError(message)
      })
  }, [slug])

  async function onSave() {
    setBusy(true)
    setError('')
    setStatus('Guardando…')
    try {
      await apiSavePage(slug, {
        title,
        body,
        imageMediaId: image?.id ?? null,
      })
      setStatus('Guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  async function onImage(file: File | undefined) {
    if (!file || busy) return
    setBusy(true)
    setError('')
    setStatus('Preparando imagen…')
    try {
      const prepared = await prepareVariants(file)
      setStatus('Subiendo imagen…')
      const media = await apiUploadMedia(prepared)
      setImage(media)
      setStatus('Imagen lista. Guardá para publicar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-page">
      <h1 className="admin-page__title">{heading}</h1>
      <p className="admin-page__copy">
        Receta <code>base-page</code>: una sola pantalla (slug <code>{slug}</code>). No es
        una lista.
      </p>

      <label className="admin-login__label" htmlFor="page-title">
        Título
        <input
          id="page-title"
          className="admin-login__input"
          value={title}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="admin-login__label" htmlFor="page-body">
        Texto
        <textarea
          id="page-body"
          className="admin-login__input admin-textarea"
          rows={16}
          value={body}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <p className="admin-login__label">Imagen (opcional)</p>
      {image && (
        <div className="admin-cover-preview">
          <Picture media={image} sizes="220px" alt="" />
          <button
            type="button"
            className="admin-media-grid__delete"
            disabled={busy}
            onClick={() => setImage(null)}
          >
            Quitar imagen
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
            void onImage(file)
          }}
        />
        {image ? 'Cambiar imagen' : 'Subir imagen'}
      </label>

      {status && <p className="admin-page__copy">{status}</p>}
      {error && <p className="admin-login__error">{error}</p>}

      <div className="admin-actions">
        <button type="button" className="admin-login__submit" disabled={busy} onClick={() => void onSave()}>
          Guardar
        </button>
      </div>
    </main>
  )
}
