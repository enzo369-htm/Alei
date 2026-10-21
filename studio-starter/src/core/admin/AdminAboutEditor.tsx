import { useEffect, useRef, useState } from 'react'
import { apiGetPage, apiSavePage, type PageRecord } from '../api/pages.ts'
import { apiUploadMedia } from '../api/media.ts'
import { Picture } from '../images/Picture.tsx'
import { prepareVariants } from '../images/prepareVariants.ts'
import {
  aboutBlockLabel,
  parseAboutBlocks,
  publishAboutUpdated,
  serializeAboutBlocks,
  type AboutBlock,
  type AboutBlockKind,
} from '../../about-blocks.ts'

const SLUG = 'about'

function blankBlock(kind: AboutBlockKind): AboutBlock {
  return { id: crypto.randomUUID(), kind, title: '', titleEn: '', plain: '', plainEn: '', body: '', bodyEn: '' }
}

function headingFrom(list: AboutBlock[], fallback: string) {
  const titleBlock = list.find((block) => block.kind === 'title' && (block.title.trim() || block.plain.trim()))
  const heading = [titleBlock?.title.trim(), titleBlock?.plain.trim()].filter(Boolean).join(' ')
  return heading || fallback
}

export function AdminAboutEditor() {
  const [pageTitle, setPageTitle] = useState('')
  const [blocks, setBlocks] = useState<AboutBlock[]>([])
  const [image, setImage] = useState<PageRecord['image']>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [imageNote, setImageNote] = useState('')
  const [english, setEnglish] = useState(false)
  const imageTouched = useRef(false)

  useEffect(() => {
    let cancelled = false
    setError('')
    void apiGetPage(SLUG)
      .then((page) => {
        if (cancelled) return
        const next = parseAboutBlocks(page.body)
        setPageTitle(page.title)
        if (!imageTouched.current) setImage(page.image)
        if (!next) {
          setError('El texto guardado de About no se reconoce. No se ha sustituido, y Guardar sigue desactivado para no pisarlo.')
          return
        }
        setBlocks(next)
        setReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'No se pudo cargar'
        if (message === 'No encontrado') {
          setPageTitle('')
          setBlocks(parseAboutBlocks('') ?? [])
          if (!imageTouched.current) setImage(null)
          setReady(true)
          return
        }
        setError(message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateBlock(id: string, patch: Partial<AboutBlock>) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)))
  }

  async function onSave() {
    if (!ready) return
    const nextBlocks = blocks
    const nextImage = image
    setBusy(true)
    setError('')
    setStatus('Guardando…')
    try {
      await apiSavePage(SLUG, {
        title: headingFrom(nextBlocks, pageTitle),
        body: serializeAboutBlocks(nextBlocks),
        imageMediaId: nextImage?.id ?? null,
      })
      publishAboutUpdated()
      setImageNote('')
      setStatus('Guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  async function onImage(file: File | undefined) {
    if (!file || uploading || busy) return
    setUploading(true)
    setError('')
    setImageNote('Preparando imagen…')
    try {
      const prepared = await prepareVariants(file)
      setImageNote('Subiendo imagen…')
      const media = await apiUploadMedia(prepared)
      imageTouched.current = true
      setImage(media)
      setImageNote('Imagen lista. Guardá para publicar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setImageNote('')
    } finally {
      setUploading(false)
    }
  }

  const locked = busy || uploading

  return (
    <main className="admin-page">
      <h1 className="admin-page__title">About</h1>

      <div className="admin-about-add">
        <button type="button" disabled={!ready || locked} onClick={() => setBlocks((current) => [...current, blankBlock('title')])}>
          Agregar título
        </button>
        <button type="button" disabled={!ready || locked} onClick={() => setBlocks((current) => [...current, blankBlock('secondary')])}>
          Agregar bloque secundario
        </button>
        <button type="button" aria-pressed={english} onClick={() => setEnglish((open) => !open)}>
          {english ? 'Ocultar inglés' : 'Inglés'}
        </button>
      </div>

      <ol className="admin-about-blocks">
        {blocks.map((block, index) => (
          <li key={block.id} className="admin-about-block">
            <div className="admin-about-block__head">
              <p>
                Bloque {index + 1} · {aboutBlockLabel(block.kind)}
              </p>
              <button type="button" disabled={locked} onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}>
                Quitar
              </button>
            </div>
            {block.kind === 'preserved' ? (
              <p className="admin-page__copy">Este bloque no se reconoce. Se conserva al guardar.</p>
            ) : (
              <>
                {block.kind === 'title' ? (
                  <>
                    <label className="admin-login__label" htmlFor={`about-title-${block.id}`}>
                      negrita
                      <input
                        id={`about-title-${block.id}`}
                        className="admin-login__input"
                        value={block.title}
                        disabled={locked}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      />
                    </label>
                    {english ? (
                      <label className="admin-login__label" htmlFor={`about-title-en-${block.id}`}>
                        negrita · inglés
                        <input
                          id={`about-title-en-${block.id}`}
                          className="admin-login__input"
                          value={block.titleEn}
                          disabled={locked}
                          onChange={(event) => updateBlock(block.id, { titleEn: event.target.value })}
                        />
                      </label>
                    ) : null}
                    <label className="admin-login__label" htmlFor={`about-plain-${block.id}`}>
                      texto normal
                      <input
                        id={`about-plain-${block.id}`}
                        className="admin-login__input"
                        value={block.plain}
                        disabled={locked}
                        onChange={(event) => updateBlock(block.id, { plain: event.target.value })}
                      />
                    </label>
                    {english ? (
                      <label className="admin-login__label" htmlFor={`about-plain-en-${block.id}`}>
                        texto normal · inglés
                        <input
                          id={`about-plain-en-${block.id}`}
                          className="admin-login__input"
                          value={block.plainEn}
                          disabled={locked}
                          onChange={(event) => updateBlock(block.id, { plainEn: event.target.value })}
                        />
                      </label>
                    ) : null}
                  </>
                ) : (
                  <label className="admin-login__label" htmlFor={`about-title-${block.id}`}>
                    Título
                    <input
                      id={`about-title-${block.id}`}
                      className="admin-login__input"
                      value={block.title}
                      disabled={locked}
                      onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                    />
                  </label>
                )}
                {english && block.kind === 'secondary' ? (
                  <label className="admin-login__label" htmlFor={`about-title-en-${block.id}`}>
                    Título · inglés
                    <input
                      id={`about-title-en-${block.id}`}
                      className="admin-login__input"
                      value={block.titleEn}
                      disabled={locked}
                      onChange={(event) => updateBlock(block.id, { titleEn: event.target.value })}
                    />
                  </label>
                ) : null}
                <label className="admin-login__label" htmlFor={`about-body-${block.id}`}>
                  Descripción
                  <textarea
                    id={`about-body-${block.id}`}
                    className="admin-login__input admin-textarea"
                    rows={block.kind === 'title' ? 8 : 4}
                    value={block.body}
                    disabled={locked}
                    onChange={(event) => updateBlock(block.id, { body: event.target.value })}
                  />
                </label>
                {english ? (
                  <label className="admin-login__label" htmlFor={`about-body-en-${block.id}`}>
                    Descripción · inglés
                    <textarea
                      id={`about-body-en-${block.id}`}
                      className="admin-login__input admin-textarea"
                      rows={block.kind === 'title' ? 8 : 4}
                      value={block.bodyEn}
                      disabled={locked}
                      onChange={(event) => updateBlock(block.id, { bodyEn: event.target.value })}
                    />
                  </label>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ol>

      <section className="admin-about-block admin-about-image">
        <p className="admin-login__label">Imagen</p>
        {image && (
          <div className="admin-cover-preview">
            <Picture media={image} sizes="220px" alt="" />
            <button
              type="button"
              className="admin-media-grid__delete"
              disabled={locked}
              onClick={() => {
                imageTouched.current = true
                setImage(null)
              }}
            >
              Quitar imagen
            </button>
          </div>
        )}
        <label className={`admin-upload${uploading ? ' is-busy' : ''}`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!ready || locked}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void onImage(file)
            }}
          />
          {image ? 'Cambiar imagen' : 'Subir imagen'}
        </label>
        {imageNote ? <p className="admin-page__copy">{imageNote}</p> : null}
      </section>

      {error && <p className="admin-login__error">{error}</p>}

      <div className="admin-actions">
        <button type="button" className="admin-login__submit" disabled={!ready || locked} onClick={() => void onSave()}>
          Guardar
        </button>
        {status ? <p className="admin-page__copy">{status}</p> : null}
      </div>
    </main>
  )
}
