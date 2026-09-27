import { useEffect, useState } from 'react'
import { apiGetCanvas, type CanvasBlock } from './core/api/canvas'
import { CanvasViewer } from './core/modules/free-canvas/CanvasViewer'
import './core/modules/free-canvas/canvas.css'

function piecesOf(block: CanvasBlock) {
  return block.pieces.map((piece) => ({
    id: piece.id,
    imageUrl: piece.src,
    media: piece.media,
    x: piece.x,
    y: piece.y,
    width: piece.width,
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
      {loaded && !error && blocks.length === 0 ? (
        <p className="canvas-page__note">Nothing here yet.</p>
      ) : null}
      {blocks.map((block) =>
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
            items={piecesOf(block)}
            heightRatio={block.heightRatio}
            zoomOnClick
          />
        ),
      )}
    </div>
  )
}
