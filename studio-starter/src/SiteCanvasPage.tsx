import { useEffect, useState } from 'react'
import { apiGetCanvas, type CanvasBlock } from './core/api/canvas'
import { CanvasViewer } from './core/modules/free-canvas/CanvasViewer'
import './core/modules/free-canvas/canvas.css'

function isPublicBlock(block: CanvasBlock, scope: string) {
  if (scope !== 'works' || block.kind !== 'canvas') return true
  return block.visible !== false
}

function piecesOf(block: CanvasBlock, scope: string) {
  return block.pieces.map((piece) => ({
    id: piece.id,
    imageUrl: piece.src,
    media: piece.media,
    x: piece.x,
    y: piece.y,
    width: piece.width,
    href: `/${scope}/${piece.id}`,
    availability: piece.availability,
    label: piece.title,
  }))
}

export function SiteCanvasPage({ scope, label }: { scope: string; label: string }) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setBlocks([])
    setError('')
    setLoaded(false)
    void apiGetCanvas(scope)
      .then((data) => setBlocks(data.blocks))
      .catch(() => setError(`${label} is not available.`))
      .finally(() => setLoaded(true))
  }, [scope, label])

  return (
    <div className="canvas-page">
      {error ? <p className="canvas-page__note">{error}</p> : null}
      {loaded && !error && blocks.filter((block) => isPublicBlock(block, scope)).length === 0 ? (
        <p className="canvas-page__note">Nothing here yet.</p>
      ) : null}
      {blocks.filter((block) => isPublicBlock(block, scope)).map((block) =>
        block.kind === 'text' ? (
          <article key={block.id} className="canvas-page__text">
            {block.title ? <h1>{block.title}</h1> : null}
            {block.body
              ? block.body.split('\n\n').map((para, index) => <p key={index}>{para}</p>)
              : null}
          </article>
        ) : (
          <CanvasViewer
            key={block.id}
            items={piecesOf(block, scope)}
            heightRatio={block.heightRatio}
          />
        ),
      )}
    </div>
  )
}
