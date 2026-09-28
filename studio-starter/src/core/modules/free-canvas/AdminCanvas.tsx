import { useCallback, useEffect, useRef, useState } from 'react'
import {
  apiAddCanvasBlock,
  apiDeleteCanvasBlock,
  apiGetCanvas,
  apiSaveCanvas,
  type CanvasBlock,
  type CanvasPiece,
  type PieceAvailability,
} from '../../api/canvas.ts'
import { apiUploadMedia } from '../../api/media.ts'
import { prepareVariants } from '../../images/prepareVariants.ts'
import { defaultPositionForIndex } from './layout.ts'
import { FreeCanvas } from './FreeCanvas.tsx'
import './canvas.css'

const MAX_PER_KIND = 4

type Props = {
  scope: string
  heading?: string
}

function pieceOf(blocks: CanvasBlock[], selected: { canvasId: string; pieceId: string } | null) {
  if (!selected) return null
  return (
    blocks.find((block) => block.id === selected.canvasId)?.pieces.find((piece) => piece.id === selected.pieceId) ??
    null
  )
}

function remapSelected(
  previous: CanvasBlock[],
  next: CanvasBlock[],
  selected: { canvasId: string; pieceId: string } | null,
) {
  if (!selected) return null
  const old = pieceOf(previous, selected)
  const host = next.find((block) => block.id === selected.canvasId)
  if (!old || !host) return null
  const match =
    host.pieces.find((piece) => piece.id === old.id) ??
    host.pieces.find((piece) => piece.mediaId === old.mediaId && piece.x === old.x && piece.y === old.y) ??
    host.pieces.find((piece) => piece.mediaId === old.mediaId)
  return match ? { canvasId: selected.canvasId, pieceId: match.id } : null
}

export function AdminCanvas({ scope, heading = 'Canvas' }: Props) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([])
  const [selected, setSelected] = useState<{ canvasId: string; pieceId: string } | null>(null)
  const [status, setStatus] = useState('Listo')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const fileForCanvas = useRef<string | null>(null)

  const textCount = blocks.filter((block) => block.kind === 'text').length
  const canvasCount = blocks.filter((block) => block.kind === 'canvas').length
  const selectedPiece = pieceOf(blocks, selected)

  function patchSelected(patch: Partial<Pick<CanvasPiece, 'title' | 'ficha' | 'availability'>>) {
    if (!selected) return
    markDirty(
      blocks.map((block) =>
        block.id !== selected.canvasId
          ? block
          : {
              ...block,
              pieces: block.pieces.map((piece) =>
                piece.id === selected.pieceId ? { ...piece, ...patch } : piece,
              ),
            },
      ),
    )
  }

  function setAvailability(availability: PieceAvailability) {
    patchSelected({ availability })
  }

  const refresh = useCallback(async () => {
    const data = await apiGetCanvas(scope)
    setBlocks(data.blocks)
    setDirty(false)
    setSelected(null)
  }, [scope])

  useEffect(() => {
    void refresh()
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar')
      })
      .finally(() => setLoaded(true))
  }, [refresh])

  function markDirty(next: CanvasBlock[]) {
    setBlocks(next)
    setDirty(true)
    setStatus('Sin guardar')
  }

  async function onSave() {
    if (!loaded || !dirty) return
    setSaving(true)
    setError('')
    setStatus('Guardando…')
    try {
      const saved = await apiSaveCanvas(scope, blocks)
      setSelected((current) => remapSelected(blocks, saved.blocks, current))
      setBlocks(saved.blocks)
      setDirty(false)
      setStatus('Guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('')
    } finally {
      setSaving(false)
    }
  }

  async function onAdd(kind: 'text' | 'canvas') {
    const count = kind === 'text' ? textCount : canvasCount
    if (count >= MAX_PER_KIND) return
    setStatus(kind === 'text' ? 'Agregando texto…' : 'Agregando lienzo…')
    setError('')
    try {
      const { block } = await apiAddCanvasBlock(scope, kind)
      setBlocks((prev) => [...prev, block])
      setStatus(kind === 'text' ? 'Texto agregado — guardá cuando lo edites' : 'Lienzo agregado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar')
      setStatus('')
    }
  }

  async function onRemove(canvasId: string) {
    if (!window.confirm('¿Quitar este bloque?')) return
    setStatus('Quitando…')
    setError('')
    try {
      await apiDeleteCanvasBlock(scope, canvasId)
      setBlocks((prev) => prev.filter((block) => block.id !== canvasId))
      if (selected?.canvasId === canvasId) setSelected(null)
      setStatus('Quitado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar')
      setStatus('')
    }
  }

  function onRemoveSelected() {
    if (!selected) return
    markDirty(
      blocks.map((block) =>
        block.id === selected.canvasId
          ? { ...block, pieces: block.pieces.filter((piece) => piece.id !== selected.pieceId) }
          : block,
      ),
    )
    setSelected(null)
    setStatus('Imagen quitada — guardá para confirmar')
  }

  async function onUpload(file: File, canvasId: string) {
    setUploading(true)
    setError('')
    setStatus('Preparando imagen…')
    try {
      const prepared = await prepareVariants(file)
      setStatus('Subiendo…')
      const media = await apiUploadMedia(prepared)
      let pieceId = ''
      setBlocks((prev) => {
        const host = prev.find((block) => block.id === canvasId)
        const pos = defaultPositionForIndex(host?.pieces.length ?? 0)
        const piece: CanvasPiece = {
          id: `tmp-${Date.now()}`,
          mediaId: media.id,
          src: media.url,
          media,
          x: pos.x,
          y: pos.y,
          width: pos.width,
          z: host?.pieces.length ?? 0,
          title: '',
          ficha: '',
          availability: 'available',
        }
        pieceId = piece.id
        return prev.map((block) =>
          block.id === canvasId ? { ...block, pieces: [...block.pieces, piece] } : block,
        )
      })
      setDirty(true)
      if (pieceId) setSelected({ canvasId, pieceId })
      setStatus('Imagen agregada — acordate de guardar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
      setStatus('')
    } finally {
      setUploading(false)
      fileForCanvas.current = null
    }
  }

  return (
    <main className="admin-page admin-page--wide admin-page--canvas">
      <div className="admin-canvas-head">
        <h1 className="admin-page__title">{heading}</h1>
        <div className="admin-actions">
          <span className="admin-page__copy">{status}</span>
          {selected && (
            <button type="button" className="admin-btn admin-btn--danger" onClick={onRemoveSelected}>
              Quitar imagen
            </button>
          )}
          <button
            type="button"
            className="admin-btn"
            disabled={textCount >= MAX_PER_KIND}
            onClick={() => void onAdd('text')}
          >
            Agregar texto
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={canvasCount >= MAX_PER_KIND}
            onClick={() => void onAdd('canvas')}
          >
            Agregar lienzo
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={saving || !loaded || !dirty}
            onClick={() => void onSave()}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {selectedPiece && (
        <div className="admin-piece-sheet">
          <label className="admin-login__label" htmlFor="piece-title">
            Título
            <input
              id="piece-title"
              className="admin-login__input"
              value={selectedPiece.title}
              onChange={(event) => patchSelected({ title: event.target.value })}
            />
          </label>
          <label className="admin-login__label" htmlFor="piece-ficha">
            Ficha técnica
            <textarea
              id="piece-ficha"
              className="admin-login__input admin-textarea"
              rows={4}
              value={selectedPiece.ficha}
              onChange={(event) => patchSelected({ ficha: event.target.value })}
            />
          </label>
          <div className="admin-piece-sheet__avail">
            <p className="admin-login__label">Estado</p>
            <div className="admin-actions">
              <button
                type="button"
                className={`admin-btn${selectedPiece.availability === 'available' ? ' admin-btn--primary' : ''}`}
                onClick={() => setAvailability('available')}
              >
                Available
              </button>
              <button
                type="button"
                className={`admin-btn${selectedPiece.availability === 'sold' ? ' admin-btn--primary' : ''}`}
                onClick={() => setAvailability('sold')}
              >
                Sold
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="admin-login__error">{error}</p>}

      {loaded && blocks.length === 0 && !error && (
        <p className="admin-page__hint">Todavía no hay nada. Agregá un texto o un lienzo.</p>
      )}

      {blocks.map((block, index) =>
        block.kind === 'text' ? (
          <article key={block.id} className="admin-canvas-block admin-canvas-block--text">
            <div className="admin-canvas-block__bar">
              <p className="admin-login__kicker">Texto {index + 1}</p>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => void onRemove(block.id)}
              >
                Quitar
              </button>
            </div>
            <label className="admin-login__label" htmlFor={`canvas-title-${block.id}`}>
              Título
              <input
                id={`canvas-title-${block.id}`}
                className="admin-login__input"
                value={block.title}
                onChange={(event) =>
                  markDirty(
                    blocks.map((item) =>
                      item.id === block.id ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label className="admin-login__label" htmlFor={`canvas-body-${block.id}`}>
              Texto
              <textarea
                id={`canvas-body-${block.id}`}
                className="admin-login__input admin-textarea"
                rows={8}
                value={block.body}
                onChange={(event) =>
                  markDirty(
                    blocks.map((item) =>
                      item.id === block.id ? { ...item, body: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
          </article>
        ) : (
          <article
            key={block.id}
            className={`admin-canvas-block${scope === 'works' && block.visible === false ? ' is-hidden' : ''}`}
          >
            <div className="admin-canvas-block__bar">
              <p className="admin-login__kicker">Lienzo {index + 1}</p>
              <div className="admin-actions">
                {scope === 'works' && (
                  <button
                    type="button"
                    className={`admin-btn${block.visible !== false ? ' admin-btn--primary' : ''}`}
                    onClick={() =>
                      markDirty(
                        blocks.map((item) =>
                          item.id === block.id ? { ...item, visible: item.visible === false } : item,
                        ),
                      )
                    }
                  >
                    {block.visible === false ? 'Oculto' : 'Visible'}
                  </button>
                )}
                <label className={`admin-btn admin-upload${uploading ? ' is-busy' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      fileForCanvas.current = block.id
                      event.target.value = ''
                      if (file) void onUpload(file, block.id)
                    }}
                  />
                  {uploading && fileForCanvas.current === block.id ? 'Subiendo…' : 'Subir imagen'}
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={() => void onRemove(block.id)}
                >
                  Quitar lienzo
                </button>
              </div>
            </div>
            <FreeCanvas
              pieces={block.pieces}
              heightRatio={block.heightRatio}
              heightInputId={`canvas-height-${block.id}`}
              selectedId={selected?.canvasId === block.id ? selected.pieceId : null}
              onSelect={(pieceId) =>
                setSelected(pieceId ? { canvasId: block.id, pieceId } : null)
              }
              onChange={(pieces) =>
                markDirty(
                  blocks.map((item) => (item.id === block.id ? { ...item, pieces } : item)),
                )
              }
              onHeightRatioChange={(heightRatio) =>
                markDirty(
                  blocks.map((item) =>
                    item.id === block.id ? { ...item, heightRatio } : item,
                  ),
                )
              }
            />
          </article>
        ),
      )}
    </main>
  )
}
