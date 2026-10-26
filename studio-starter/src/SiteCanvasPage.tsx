import { useEffect, useState } from 'react'
import { apiGetCanvas, type CanvasBlock } from './core/api/canvas'
import { CanvasViewer } from './core/modules/free-canvas/CanvasViewer'
import { textOf, useLocale } from './locale'
import './core/modules/free-canvas/canvas.css'

function isPublicBlock(block: CanvasBlock, scope: string) {
  if ((scope !== 'works' && scope !== 'colabs') || block.kind !== 'canvas') return true
  return block.visible !== false
}

function piecesOf(block: CanvasBlock, scope: string, lang: 'es' | 'en') {
  return block.pieces.map((piece) => ({
    id: piece.id,
    imageUrl: piece.src,
    media: piece.media,
    x: piece.x,
    y: piece.y,
    width: piece.width,
    href: `/${scope}/${piece.id}`,
    availability: piece.availability,
    label: textOf(piece.title, piece.titleEn, lang),
  }))
}

export function SiteCanvasPage({ scope }: { scope: string }) {
  const { lang, t } = useLocale()
  const [blocks, setBlocks] = useState<CanvasBlock[]>([])
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setBlocks([])
    setFailed(false)
    setLoaded(false)
    void apiGetCanvas(scope)
      .then((data) => setBlocks(data.blocks))
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [scope])

  return (
    <div className="canvas-page">
      {failed ? <p className="canvas-page__note">{t('unavailable')}</p> : null}
      {loaded && !failed && blocks.filter((block) => isPublicBlock(block, scope)).length === 0 ? (
        <p className="canvas-page__note">{t('empty')}</p>
      ) : null}
      {blocks.filter((block) => isPublicBlock(block, scope)).map((block) => {
        const title = textOf(block.title, block.titleEn, lang)
        const body = textOf(block.body, block.bodyEn, lang)
        return block.kind === 'text' ? (
          <article key={block.id} className="canvas-page__text">
            {title.trim() ? <h1>{title}</h1> : null}
            {body.trim()
              ? body.split('\n\n').map((para, index) => <p key={index}>{para}</p>)
              : null}
          </article>
        ) : (
          <CanvasViewer
            key={block.id}
            items={piecesOf(block, scope, lang)}
            heightRatio={block.heightRatio}
            hideAvailable={scope === 'works' || scope === 'colabs'}
            hoverChrome={scope === 'works' || scope === 'colabs'}
          />
        )
      })}
    </div>
  )
}
