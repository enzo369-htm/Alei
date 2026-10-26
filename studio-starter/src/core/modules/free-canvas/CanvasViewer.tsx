import { Link } from 'react-router-dom'
import { useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { Picture } from '../../images/Picture.tsx'
import { readingOrder, withDefaultPositions } from './layout.ts'
import type { CanvasItem, CanvasItemInput } from './types.ts'

const NARROW = '(max-width: 800px)'

function subscribeNarrow(onChange: () => void) {
  const media = window.matchMedia(NARROW)
  media.addEventListener('change', onChange)
  window.addEventListener('resize', onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener('resize', onChange)
  }
}

function useNarrow() {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false)
}

export type CanvasViewerProps = {
  items: CanvasItemInput[]
  heightRatio?: number | null
  renderCaption?: (item: CanvasItem) => ReactNode
  /** Works: the hover label is only “sold”. Available stays blank. */
  hideAvailable?: boolean
  /** Works: title above the painting, sold below, both on hover. */
  hoverChrome?: boolean
  previousLabel?: string
  nextLabel?: string
}

/** Mismo lienzo que el admin: posiciones en %, alto = ancho × ratio. */
export function CanvasViewer({
  items,
  heightRatio,
  renderCaption,
  hideAvailable = false,
  hoverChrome = false,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: CanvasViewerProps) {
  const narrow = useNarrow()
  const positioned = withDefaultPositions(items)
  const ratio = heightRatio ?? 1.2

  if (positioned.length === 0) return null

  if (narrow) {
    return (
      <MobileReel
        items={positioned}
        renderCaption={renderCaption}
        hideAvailable={hideAvailable}
        hoverChrome={hoverChrome}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
      />
    )
  }

  return (
    <div className="studio-viewer">
      <div className="studio-viewer__desktop" style={{ paddingTop: `${ratio * 100}%` }}>
        {positioned.map((item) => (
          <DesktopItem
            key={item.id}
            item={item}
            renderCaption={renderCaption}
            hideAvailable={hideAvailable}
            hoverChrome={hoverChrome}
          />
        ))}
      </div>
    </div>
  )
}

function MobileReel({
  items,
  renderCaption,
  hideAvailable,
  hoverChrome,
  previousLabel,
  nextLabel,
}: {
  items: CanvasItem[]
  renderCaption?: (item: CanvasItem) => ReactNode
  hideAvailable: boolean
  hoverChrome: boolean
  previousLabel: string
  nextLabel: string
}) {
  const ordered = readingOrder(items)
  const ids = ordered.map((item) => item.id).join('\0')
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState(ids)
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  if (seen !== ids) {
    setSeen(ids)
    setIndex(0)
  }

  const count = ordered.length
  const item = ordered[count === 0 ? 0 : ((index % count) + count) % count]
  if (!item) return null

  function step(delta: number) {
    setIndex((current) => (current + delta + count) % count)
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0]
    if (!touch) return
    start.current = { x: touch.clientX, y: touch.clientY }
    dragged.current = false
  }

  function onTouchEnd(event: TouchEvent) {
    const origin = start.current
    start.current = null
    const touch = event.changedTouches[0]
    if (!origin || !touch || count < 2) return
    const dx = touch.clientX - origin.x
    const dy = touch.clientY - origin.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    dragged.current = true
    step(dx < 0 ? 1 : -1)
  }

  function onClickCapture(event: MouseEvent) {
    if (!dragged.current) return
    dragged.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const width = item.media?.width
  const height = item.media?.height
  const frameStyle: CSSProperties | undefined =
    width && height ? { ['--frame-ratio' as string]: String(width / height) } : undefined
  const title = hoverChrome ? item.label?.trim() ?? '' : ''
  const status = statusOf(item, hideAvailable)
  const soldDot = hoverChrome && status === 'sold'
  const image = item.media ? (
    <Picture media={item.media} sizes="100vw" alt={item.label || ''} loading="eager" />
  ) : (
    <img src={item.imageUrl} alt={item.label || ''} />
  )

  return (
    <div
      className="studio-viewer studio-viewer__mobile"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClickCapture={onClickCapture}
    >
      {count > 1 ? (
        <button type="button" className="studio-viewer__step studio-viewer__step--prev" aria-label={previousLabel} onClick={() => step(-1)}>
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}
      <div className="studio-viewer__frame" style={frameStyle}>
        {item.href ? <Link to={item.href} className="studio-viewer__hit">{image}</Link> : image}
        {hoverChrome && (title || soldDot) ? (
          <span className="studio-viewer__meta">
            {title ? <span className="studio-viewer__title">{title}</span> : null}
            {soldDot ? <span className="studio-viewer__sold" aria-label="sold" /> : null}
          </span>
        ) : null}
        {!hoverChrome && status ? <span className="studio-viewer__status">{status}</span> : null}
        {renderCaption ? <div className="studio-viewer__caption">{renderCaption(item)}</div> : null}
      </div>
      {count > 1 ? (
        <button type="button" className="studio-viewer__step studio-viewer__step--next" aria-label={nextLabel} onClick={() => step(1)}>
          <span aria-hidden="true">›</span>
        </button>
      ) : null}
    </div>
  )
}

function statusOf(item: CanvasItem, hideAvailable: boolean) {
  if (item.availability === 'sold') return hideAvailable ? 'sold' : 'Sold'
  if (hideAvailable || !item.availability) return ''
  return 'Available'
}

function DesktopItem({
  item,
  renderCaption,
  hideAvailable,
  hoverChrome,
}: {
  item: CanvasItem
  renderCaption?: (item: CanvasItem) => ReactNode
  hideAvailable: boolean
  hoverChrome: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const caption = renderCaption?.(item)
  const status = statusOf(item, hideAvailable)
  const title = hoverChrome ? item.label?.trim() ?? '' : ''
  const statusClass = hoverChrome ? 'studio-viewer__status studio-viewer__status--edge' : 'studio-viewer__status'
  const image = item.media ? (
    <Picture media={item.media} sizes={`${Math.round(item.width)}vw`} alt={item.label || ''} />
  ) : (
    <img src={item.imageUrl} alt={item.label || ''} />
  )

  const body = item.href ? (
    <Link to={item.href} className="studio-viewer__hit">
      {image}
      {!hoverChrome && status ? <span className={statusClass}>{status}</span> : null}
    </Link>
  ) : (
    <>
      {image}
      {!hoverChrome && status ? <span className={statusClass}>{status}</span> : null}
    </>
  )
  const soldDot = hoverChrome && status === 'sold'

  return (
    <div
      className={`studio-viewer__item${item.href ? ' is-openable' : ''}`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}%`,
        zIndex: hovered ? 20 : 10,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hoverChrome && (title || soldDot) ? (
        <span className="studio-viewer__meta">
          {title ? <span className="studio-viewer__title">{title}</span> : null}
          {soldDot ? <span className="studio-viewer__sold" aria-label="sold" /> : null}
        </span>
      ) : null}
      {body}
      {caption && hovered && <div className="studio-viewer__caption">{caption}</div>}
    </div>
  )
}
