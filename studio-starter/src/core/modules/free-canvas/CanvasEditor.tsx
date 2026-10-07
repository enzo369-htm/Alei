import { useRef, useState, type PointerEvent } from 'react'
import { Picture } from '../../images/Picture.tsx'
import { clamp } from './layout.ts'
import { applyAxis, pickAxis, snapPosition, snapWidth, type Axis, type Rect, type SnapGuides } from './snap.ts'
import type { CanvasItem } from './types.ts'

type Interaction =
  | {
      type: 'drag'
      id: string
      startPx: number
      startPy: number
      originX: number
      originY: number
      widthPx: number
      heightPx: number
      aspect: number
      rectW: number
      rectH: number
      axis: Axis | null
      axisChosen: boolean
      others: Rect[]
    }
  | {
      type: 'resize'
      id: string
      startPx: number
      originWidth: number
      rectW: number
      leftPx: number
      aspect: number
      others: Rect[]
    }
  | null

export type CanvasEditorProps = {
  items: CanvasItem[]
  heightRatio: number
  onChange: (items: CanvasItem[]) => void
  onHeightRatioChange?: (ratio: number) => void
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  showHeightControl?: boolean
  heightInputId?: string
}

function measure(board: HTMLDivElement) {
  const boardRect = board.getBoundingClientRect()
  const originX = boardRect.left + board.clientLeft
  const originY = boardRect.top + board.clientTop
  const rects = new Map<string, Rect>()

  for (const el of board.querySelectorAll<HTMLElement>('[data-piece-id]')) {
    const id = el.dataset.pieceId
    if (!id) continue
    const rect = el.getBoundingClientRect()
    const img = el.querySelector('img')
    const aspect =
      img && img.naturalWidth > 0
        ? img.naturalHeight / img.naturalWidth
        : rect.width > 0
          ? rect.height / rect.width
          : 0
    rects.set(id, {
      x: rect.left - originX,
      y: rect.top - originY,
      w: rect.width,
      h: rect.height > 1 ? rect.height : rect.width * aspect,
    })
  }

  return { rectW: board.clientWidth, rectH: board.clientHeight, rects }
}

export function CanvasEditor({
  items,
  heightRatio,
  onChange,
  onHeightRatioChange,
  selectedId = null,
  onSelect,
  showHeightControl = true,
  heightInputId = 'canvas-height',
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const interaction = useRef<Interaction>(null)
  const magnetOnRef = useRef(true)
  const [magnetOn, setMagnetOn] = useState(true)
  const [guides, setGuides] = useState<SnapGuides | null>(null)
  magnetOnRef.current = magnetOn

  function updateItem(id: string, patch: Partial<CanvasItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function onPointerDownItem(e: PointerEvent, item: CanvasItem) {
    e.preventDefault()
    onSelect?.(item.id)
    const board = canvasRef.current
    if (!board) return
    const { rectW, rectH, rects } = measure(board)
    const self = rects.get(item.id)
    const aspect = self && self.w > 0 ? self.h / self.w : 0
    interaction.current = {
      type: 'drag',
      id: item.id,
      startPx: e.clientX,
      startPy: e.clientY,
      originX: item.x,
      originY: item.y,
      widthPx: self?.w ?? (item.width / 100) * rectW,
      heightPx: self?.h ?? 0,
      aspect,
      rectW,
      rectH,
      axis: null,
      axisChosen: false,
      others: [...rects.entries()].filter(([id]) => id !== item.id).map(([, rect]) => rect),
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerDownResize(e: PointerEvent, item: CanvasItem) {
    e.preventDefault()
    e.stopPropagation()
    onSelect?.(item.id)
    const board = canvasRef.current
    if (!board) return
    const { rectW, rects } = measure(board)
    const self = rects.get(item.id)
    const aspect = self && self.w > 0 ? self.h / self.w : 0
    interaction.current = {
      type: 'resize',
      id: item.id,
      startPx: e.clientX,
      originWidth: item.width,
      rectW,
      leftPx: self?.x ?? (item.x / 100) * rectW,
      aspect,
      others: [...rects.entries()].filter(([id]) => id !== item.id).map(([, rect]) => rect),
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    const act = interaction.current
    if (!act) return
    const magnet = magnetOnRef.current

    if (act.type === 'drag') {
      if (act.rectW < 1 || act.rectH < 1) return
      const dxPx = e.clientX - act.startPx
      const dyPx = e.clientY - act.startPy
      let x = act.originX + (dxPx / act.rectW) * 100
      let y = act.originY + (dyPx / act.rectH) * 100

      if (!magnet) {
        updateItem(act.id, { x: clamp(x, 0, 95), y: clamp(y, 0, 98) })
        return
      }

      if (!act.axisChosen) {
        const picked = pickAxis(dxPx, dyPx)
        if (picked) {
          act.axis = picked
          act.axisChosen = true
        }
      }
      const locked = applyAxis(act.originX, act.originY, x, y, act.axis)
      x = locked.x
      y = locked.y

      const raw = {
        x: (x / 100) * act.rectW,
        y: (y / 100) * act.rectH,
        w: act.widthPx,
        h: act.heightPx > 1 ? act.heightPx : act.widthPx * act.aspect,
      }
      const snapped = snapPosition(raw, act.others, { w: act.rectW, h: act.rectH })
      const snappedX = (snapped.x / act.rectW) * 100
      const snappedY = (snapped.y / act.rectH) * 100
      const nextX = clamp(snappedX, 0, 95)
      const nextY = clamp(snappedY, 0, 98)
      updateItem(act.id, { x: nextX, y: nextY })
      setGuides({
        vertical: Math.abs(nextX - snappedX) < 0.05 ? snapped.guides.vertical : null,
        horizontal: Math.abs(nextY - snappedY) < 0.05 ? snapped.guides.horizontal : null,
        gaps: snapped.guides.gaps,
      })
      return
    }

    if (act.rectW < 1) return
    const dw = ((e.clientX - act.startPx) / act.rectW) * 100
    let width = act.originWidth + dw
    if (!magnet) {
      updateItem(act.id, { width: clamp(width, 5, 90) })
      return
    }

    const rawPx = (width / 100) * act.rectW
    const snapped = snapWidth(rawPx, act.leftPx, act.aspect, act.others, act.rectW)
    width = (snapped.width / act.rectW) * 100
    const nextWidth = clamp(width, 5, 90)
    updateItem(act.id, { width: nextWidth })
    setGuides({
      vertical: Math.abs(nextWidth - width) < 0.05 ? snapped.line : null,
      horizontal: null,
      gaps: [],
    })
  }

  function onPointerUp() {
    interaction.current = null
    setGuides(null)
  }

  return (
    <div className="studio-canvas">
      <div className="studio-canvas__tools">
        {showHeightControl && onHeightRatioChange && (
          <div className="studio-canvas__height">
            <label htmlFor={heightInputId}>Alto del lienzo</label>
            <input
              id={heightInputId}
              type="range"
              min={0.6}
              max={2.5}
              step={0.1}
              value={heightRatio}
              onChange={(e) => onHeightRatioChange(Number.parseFloat(e.target.value))}
            />
            <span>{heightRatio.toFixed(1)}×</span>
          </div>
        )}
        <button
          type="button"
          className={`studio-canvas__magnet${magnetOn ? ' is-on' : ''}`}
          aria-pressed={magnetOn}
          onClick={() => {
            setMagnetOn((value) => !value)
            setGuides(null)
          }}
        >
          Imán
        </button>
      </div>

      <p className="studio-canvas__hint">
        {magnetOn
          ? 'Imán activo: el arrastre va en línea recta, horizontal o vertical, y se engancha al borde, al centro y a la misma distancia. Desde la esquina, el tamaño se engancha al ancho o al alto de otra imagen. Apagalo para mover en diagonal.'
          : 'Imán apagado: arrastrá libre, también en diagonal. Esquina inferior derecha: tamaño.'}
      </p>

      <div
        ref={canvasRef}
        className="studio-canvas__board"
        style={{ paddingTop: `${heightRatio * 100}%` }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelect?.(null)
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.length === 0 && (
          <p className="studio-canvas__empty">Subí imágenes para acomodarlas acá.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            data-piece-id={item.id}
            className={`studio-canvas__item${selectedId === item.id ? ' is-selected' : ''}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.width}%`,
            }}
            onPointerDown={(e) => onPointerDownItem(e, item)}
          >
            {item.media ? (
              <Picture media={item.media} sizes={`${Math.round(item.width)}vw`} alt={item.label || ''} />
            ) : (
              <img src={item.imageUrl} alt={item.label || ''} draggable={false} />
            )}
            {selectedId === item.id && (
              <div
                className="studio-canvas__resize"
                onPointerDown={(e) => onPointerDownResize(e, item)}
              />
            )}
          </div>
        ))}
        {guides?.vertical != null && (
          <div className="studio-canvas__guide studio-canvas__guide--v" style={{ left: guides.vertical }} />
        )}
        {guides?.horizontal != null && (
          <div className="studio-canvas__guide studio-canvas__guide--h" style={{ top: guides.horizontal }} />
        )}
        {guides?.gaps.map((gap, index) =>
          gap.axis === 'x' ? (
            <div
              key={`gap-${index}`}
              className="studio-canvas__gap studio-canvas__gap--x"
              style={{ left: gap.start, width: gap.end - gap.start, top: gap.cross }}
            />
          ) : (
            <div
              key={`gap-${index}`}
              className="studio-canvas__gap studio-canvas__gap--y"
              style={{ top: gap.start, height: gap.end - gap.start, left: gap.cross }}
            />
          ),
        )}
      </div>
    </div>
  )
}
