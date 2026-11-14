import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import { ABOUT_UPDATED, instagramHref, parseAboutBlocks, parseAboutContact, type AboutBlock } from './about-blocks'
import { textOf, useLocale } from './locale'

function TitleText({ bold, plain }: { bold: string; plain: string }) {
  return (
    <>
      {bold ? <strong>{bold}</strong> : null}
      {bold && plain ? ' ' : null}
      {plain}
    </>
  )
}

function AboutInk({ text }: { text: string }) {
  const parts = text.split(/\n{2,}/).filter((part) => part.length > 0)
  if (parts.length < 2) return <span className="about-page__ink">{text}</span>
  return (
    <span className="about-page__ink">
      {parts.map((part, index) => (
        <span key={index} className="about-page__para">
          {part}
        </span>
      ))}
    </span>
  )
}

function AboutBlockView({ block }: { block: AboutBlock }) {
  const { lang } = useLocale()
  if (block.kind === 'preserved') return null
  const bold = textOf(block.title, block.titleEn, lang)
  const plain = textOf(block.plain, block.plainEn, lang)
  const body = textOf(block.body, block.bodyEn, lang)
  if (!bold.trim() && !plain.trim() && !body.trim()) return null
  return (
    <section className={block.kind === 'title' ? 'about-page__block about-page__block--lead' : 'about-page__block'}>
      {block.kind === 'title' && (bold.trim() || plain.trim()) ? (
        <h1 className="about-page__title">
          <span className="about-page__ink">
            <TitleText bold={bold.trim() ? bold : ''} plain={plain.trim() ? plain : ''} />
          </span>
        </h1>
      ) : null}
      {block.kind === 'secondary' && bold.trim() ? (
        <h2 className="about-page__label">
          <span className="about-page__ink">{bold}</span>
        </h2>
      ) : null}
      {body.trim() ? (
        <div className={block.kind === 'title' ? 'about-page__bio' : 'about-page__text'}>
          <AboutInk text={body} />
        </div>
      ) : null}
    </section>
  )
}

function fitBlockInk(root: HTMLElement) {
  const probeCss = 'display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;padding:0;margin:0;border:0;'
  for (const outer of root.querySelectorAll<HTMLElement>('.about-page__title, .about-page__label, .about-page__bio, .about-page__text')) {
    const ink = outer.querySelector<HTMLElement>(':scope > .about-page__ink')
    if (!ink) continue
    ink.style.transform = ''
    outer.style.height = ''
    const paras = [...ink.querySelectorAll<HTMLElement>(':scope > .about-page__para')]
    const startHost = paras[0] ?? ink
    const endHost = paras[paras.length - 1] ?? ink
    const start = document.createElement('span')
    const end = document.createElement('span')
    start.style.cssText = probeCss
    end.style.cssText = probeCss
    startHost.insertBefore(start, startHost.firstChild)
    endHost.appendChild(end)
    const firstBase = start.getBoundingClientRect().bottom
    const lastBase = end.getBoundingClientRect().bottom
    start.remove()
    end.remove()
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) continue
    const style = getComputedStyle(ink)
    ctx.font = style.font
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
    const metrics = ctx.measureText(ink.innerText.replace(/\s+/g, ' ').trim())
    if (!metrics.actualBoundingBoxAscent && !metrics.actualBoundingBoxDescent) continue
    const rect = outer.getBoundingClientRect()
    const top = firstBase - metrics.actualBoundingBoxAscent - rect.top
    const bottom = rect.bottom - (lastBase + metrics.actualBoundingBoxDescent)
    ink.style.transform = `translateY(${-top}px)`
    outer.style.height = `${rect.height - top - bottom}px`
  }
}

function letterEdge(el: HTMLElement, edge: 'left' | 'right') {
  const style = getComputedStyle(el)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = style.font
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
  const metrics = ctx.measureText(el.textContent ?? '')
  const left = el.getBoundingClientRect().left
  return edge === 'left' ? left - metrics.actualBoundingBoxLeft : left + metrics.actualBoundingBoxRight
}

function AboutSheet({ page }: { page: PageRecord }) {
  const contact = useMemo(() => parseAboutContact(page.body), [page.body])
  const email = contact.email.trim()
  const instagram = contact.instagram.trim()
  const instagramUrl = instagramHref(instagram)
  const blocks = useMemo(() => parseAboutBlocks(page.body), [page.body])
  const [textEdge, setTextEdge] = useState<number | null>(null)
  const [sideEdges, setSideEdges] = useState<{ left: number; right: number } | null>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (sheetRef.current) fitBlockInk(sheetRef.current)
  })

  useEffect(() => {
    const align = () => {
      const sheet = sheetRef.current
      if (sheet) fitBlockInk(sheet)
      const mobile = window.matchMedia('(max-width: 800px)').matches
      if (mobile && sheet) {
        const alei = document.querySelector<HTMLElement>('.site-nav__brand')
        const bars = document.querySelector<HTMLElement>('.site-nav__bars')
        const inkLeft = alei ? letterEdge(alei, 'left') : null
        const barsBox = bars?.getBoundingClientRect()
        const box = sheet.getBoundingClientRect()
        if (inkLeft == null || !barsBox || barsBox.width === 0) {
          setSideEdges((current) => (current == null ? current : null))
          return
        }
        const next = {
          left: Math.max(0, inkLeft - box.left),
          right: Math.max(0, box.right - barsBox.right),
        }
        setSideEdges((current) =>
          current && Math.abs(current.left - next.left) < 0.1 && Math.abs(current.right - next.right) < 0.1
            ? current
            : next,
        )
        return
      }
      setSideEdges((current) => (current == null ? current : null))
      const about = document.querySelector<HTMLElement>('.site-nav a[href="/about"]')
      const pageRight = sheet?.getBoundingClientRect().right
      if (!about || pageRight == null) return
      const right = letterEdge(about, 'right')
      if (right == null) return
      const next = pageRight - right
      setTextEdge((current) => (current != null && Math.abs(current - next) < 0.1 ? current : next))
    }
    align()
    window.addEventListener('resize', align)
    void document.fonts?.ready.then(align)
    return () => window.removeEventListener('resize', align)
  }, [])

  return (
    <article
      ref={sheetRef}
      className="about-page"
      style={{
        ...(textEdge != null ? { ['--text-edge' as string]: `${textEdge}px` } : null),
        ...(sideEdges
          ? {
              ['--about-edge-left' as string]: `${sideEdges.left}px`,
              ['--about-edge-right' as string]: `${sideEdges.right}px`,
            }
          : null),
      }}
    >
      <div className="about-page__photo">
        {page.image ? (
          <Picture
            media={page.image}
            sizes="(max-width: 800px) calc(100vw - 40px), 17vw"
            alt="alei"
            loading="eager"
          />
        ) : null}
      </div>
      <div className="about-page__copy">
        {blocks?.map((block) => (
          <AboutBlockView key={block.id} block={block} />
        ))}
      </div>
      {email || instagramUrl ? (
        <div className="about-page__contact">
          {email ? (
            <a
              className="about-page__mail"
              href={`https://mail.google.com/mail/?${new URLSearchParams({ view: 'cm', fs: '1', to: email }).toString()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {email}
            </a>
          ) : null}
          {instagramUrl ? (
            <a className="about-page__social" href={instagramUrl}>
              {instagram}
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function AboutPage() {
  const { t } = useLocale()
  const [page, setPage] = useState<PageRecord | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let shown = false
    let request = 0
    const load = () => {
      const current = ++request
      void apiGetPage('about')
        .then((next) => {
          if (!active || current !== request) return
          shown = true
          setPage(next)
          setFailed(false)
        })
        .catch((err) => {
          if (!active || current !== request || shown) return
          const message = err instanceof Error ? err.message : ''
          if (message === 'No encontrado') {
            shown = true
            setPage(null)
            setFailed(false)
            return
          }
          setFailed(true)
        })
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === ABOUT_UPDATED) load()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(ABOUT_UPDATED)
      channel.onmessage = () => load()
    } catch {
      channel = null
    }
    load()
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      channel?.close()
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (failed) {
    return (
      <div className="about-page">
        <p className="about-page__note">{t('aboutUnavailable')}</p>
      </div>
    )
  }

  if (page === undefined) return <div className="about-page" />

  if (!page) return <div className="about-page" />

  return <AboutSheet page={page} />
}
