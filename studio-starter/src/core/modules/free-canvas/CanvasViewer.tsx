import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { Picture } from '../../images/Picture.tsx'
import { withDefaultPositions } from './layout.ts'
import type { CanvasItem, CanvasItemInput } from './types.ts'

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
  const positioned = withDefaultPositions(items)
  const ratio = heightRatio ?? 1.2

  if (positioned.length === 0) return null

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
      {status ? <span className={statusClass}>{status}</span> : null}
    </Link>
  ) : (
    <>
      {image}
      {status ? <span className={statusClass}>{status}</span> : null}
    </>
  )

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
      {title ? <span className="studio-viewer__title">{title}</span> : null}
      {body}
      {caption && hovered && <div className="studio-viewer__caption">{caption}</div>}
    </div>
  )
}
