import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiGetCanvas, type CanvasBlock } from './core/api/canvas'
import { CanvasViewer } from './core/modules/free-canvas/CanvasViewer'
import { textOf, useLocale } from './locale'
import './core/modules/free-canvas/canvas.css'

function isPublicBlock(block: CanvasBlock, scope: string) {
  if ((scope !== 'works' && scope !== 'colabs') || block.kind !== 'canvas') return true
  return block.visible !== false
}

function letterInk(el: HTMLElement) {
  const style = getComputedStyle(el)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = style.font
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
  const metrics = ctx.measureText(el.textContent ?? '')
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left - metrics.actualBoundingBoxLeft,
    right: rect.left + metrics.actualBoundingBoxRight,
  }
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
  const pageRef = useRef<HTMLDivElement>(null)
  const [blocks, setBlocks] = useState<CanvasBlock[]>([])
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [edges, setEdges] = useState<{ left: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (scope !== 'works') return
    const align = () => {
      const page = pageRef.current
      const alei = document.querySelector<HTMLElement>('.site-nav__brand')
      const about = document.querySelector<HTMLElement>('.site-nav a[href="/about"]')
      if (!page || !alei || !about) return
      if (alei.getBoundingClientRect().width === 0 || about.getBoundingClientRect().width === 0) return
      const a = letterInk(alei)
      const t = letterInk(about)
      if (!a || !t) return
      const box = page.getBoundingClientRect()
      const next = { left: a.left - box.left, right: box.right - t.right }
      setEdges((current) =>
        current && Math.abs(current.left - next.left) < 0.1 && Math.abs(current.right - next.right) < 0.1
          ? current
          : next,
      )
    }
    align()
    window.addEventListener('resize', align)
    void document.fonts?.ready.then(align)
    return () => window.removeEventListener('resize', align)
  }, [scope])

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
    <div
      ref={pageRef}
      className={scope === 'works' ? 'canvas-page canvas-page--works' : 'canvas-page'}
      style={
        scope === 'works' && edges
          ? {
              ['--canvas-edge-left' as string]: `${edges.left}px`,
              ['--canvas-edge-right' as string]: `${edges.right}px`,
            }
          : undefined
      }
    >
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
