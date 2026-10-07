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
}

/** Mismo lienzo que el admin: posiciones en %, alto = ancho × ratio. */
export function CanvasViewer({ items, heightRatio, renderCaption, hideAvailable = false }: CanvasViewerProps) {
  const positioned = withDefaultPositions(items)
  const ratio = heightRatio ?? 1.2

  if (positioned.length === 0) return null

  return (
    <div className="studio-viewer">
      <div className="studio-viewer__desktop" style={{ paddingTop: `${ratio * 100}%` }}>
        {positioned.map((item) => (
          <DesktopItem key={item.id} item={item} renderCaption={renderCaption} hideAvailable={hideAvailable} />
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
}: {
  item: CanvasItem
  renderCaption?: (item: CanvasItem) => ReactNode
  hideAvailable: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const caption = renderCaption?.(item)
  const status = statusOf(item, hideAvailable)
  const image = item.media ? (
    <Picture media={item.media} sizes={`${Math.round(item.width)}vw`} alt={item.label || ''} />
  ) : (
    <img src={item.imageUrl} alt={item.label || ''} />
  )

  const body = item.href ? (
    <Link to={item.href} className="studio-viewer__hit">
      {image}
      {status ? <span className="studio-viewer__status">{status}</span> : null}
    </Link>
  ) : (
    <>
      {image}
      {status ? <span className="studio-viewer__status">{status}</span> : null}
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
      {body}
      {caption && hovered && <div className="studio-viewer__caption">{caption}</div>}
    </div>
  )
}
