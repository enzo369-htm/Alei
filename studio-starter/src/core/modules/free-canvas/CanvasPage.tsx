import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGetCanvas, type CanvasBlock } from '../../api/canvas.ts'
import { CanvasViewer } from './CanvasViewer.tsx'
import './canvas.css'

type Props = {
  scope: string
}

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

export function CanvasPage({ scope }: Props) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setBlocks([])
    setError('')
    setLoaded(false)
    void apiGetCanvas(scope)
      .then((data) => setBlocks(data.blocks))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoaded(true))
  }, [scope])

  return (
    <main className="canvas-page">
      <p className="canvas-page__kicker">
        <Link to="/">Inicio</Link>
      </p>
      {error && <p className="canvas-page__note">{error}</p>}
      {loaded && !error && blocks.length === 0 && (
        <p className="canvas-page__note">Todavía no hay bloques en este lienzo.</p>
      )}
      {blocks
        .filter((block) => scope !== 'works' || block.kind !== 'canvas' || block.visible !== false)
        .map((block) =>
          block.kind === 'text' ? (
            <article key={block.id} className="canvas-page__text">
              {block.title ? <h1>{block.title}</h1> : null}
              {block.body
                ? block.body.split('\n\n').map((para, index) => <p key={index}>{para}</p>)
                : null}
            </article>
          ) : (
            <CanvasViewer key={block.id} items={piecesOf(block)} heightRatio={block.heightRatio} />
          ),
        )}
    </main>
  )
}
