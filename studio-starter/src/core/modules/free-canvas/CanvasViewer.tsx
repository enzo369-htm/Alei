import { Link } from 'react-router-dom'
import { useState, useSyncExternalStore, type ReactNode } from 'react'
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
}

/** Mismo lienzo que el admin: posiciones en %, alto = ancho × ratio. */
export function CanvasViewer({
  items,
  heightRatio,
  renderCaption,
  hideAvailable = false,
  hoverChrome = false,
}: CanvasViewerProps) {
  const narrow = useNarrow()
  const positioned = withDefaultPositions(items)
  const ratio = heightRatio ?? 1.2

  if (positioned.length === 0) return null

  if (narrow) {
    return (
      <MobileList
        items={positioned}
        renderCaption={renderCaption}
        hideAvailable={hideAvailable}
        hoverChrome={hoverChrome}
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

function MobileList({
  items,
  renderCaption,
  hideAvailable,
  hoverChrome,
}: {
  items: CanvasItem[]
  renderCaption?: (item: CanvasItem) => ReactNode
  hideAvailable: boolean
  hoverChrome: boolean
}) {
  const ordered = readingOrder(items)

  return (
    <div className="studio-viewer studio-viewer__mobile">
      {ordered.map((item, index) => (
        <MobilePiece
          key={item.id}
          item={item}
          renderCaption={renderCaption}
          hideAvailable={hideAvailable}
          hoverChrome={hoverChrome}
          eager={index === 0}
        />
      ))}
    </div>
  )
}

function MobilePiece({
  item,
  renderCaption,
  hideAvailable,
  hoverChrome,
  eager,
}: {
  item: CanvasItem
  renderCaption?: (item: CanvasItem) => ReactNode
  hideAvailable: boolean
  hoverChrome: boolean
  eager: boolean
}) {
  const title = hoverChrome ? item.label?.trim() ?? '' : ''
  const status = statusOf(item, hideAvailable)
  const soldDot = hoverChrome && status === 'sold'
  const image = item.media ? (
    <Picture media={item.media} sizes="100vw" alt={item.label || ''} loading={eager ? 'eager' : 'lazy'} />
  ) : (
    <img src={item.imageUrl} alt={item.label || ''} />
  )

  return (
    <div className="studio-viewer__frame">
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
