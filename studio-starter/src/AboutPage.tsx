import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { apiGetPage, type PageRecord } from './core/api/pages'
import { Picture } from './core/images/Picture'
import { site } from './site.config'
import { ABOUT_UPDATED, parseAboutBlocks, type AboutBlock } from './about-blocks'
import { textOf, useLocale } from './locale'

const ABOUT_EMAIL = 'aleidraws@gmail.com'
const ABOUT_INSTAGRAM = '@aleidraws'
const ABOUT_INSTAGRAM_URL = 'https://www.instagram.com/aleidraws/'

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
    <section className="about-page__block">
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

function letterRight(el: HTMLElement) {
  const style = getComputedStyle(el)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = style.font
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing
  const metrics = ctx.measureText(el.textContent ?? '')
  return el.getBoundingClientRect().left + metrics.actualBoundingBoxRight
}

function AboutSheet({ page }: { page: PageRecord }) {
  const email = site.contactEmail.trim() || ABOUT_EMAIL
  const blocks = useMemo(() => parseAboutBlocks(page.body), [page.body])
  const [textEdge, setTextEdge] = useState<number | null>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (sheetRef.current) fitBlockInk(sheetRef.current)
  })

  useEffect(() => {
    const align = () => {
      if (sheetRef.current) fitBlockInk(sheetRef.current)
      const about = document.querySelector<HTMLElement>('.site-nav a[href="/about"]')
      const pageRight = sheetRef.current?.getBoundingClientRect().right
      if (!about || pageRight == null) return
      const right = letterRight(about)
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
    <article ref={sheetRef} className="about-page" style={textEdge != null ? { ['--text-edge' as string]: `${textEdge}px` } : undefined}>
      <div className="about-page__photo">
        {page.image ? (
          <Picture
            media={page.image}
            sizes="(max-width: 800px) 37vw, 17vw"
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
      <div className="about-page__contact">
        <a className="about-page__mail" href={`mailto:${email}`}>
          {email}
        </a>
        <a className="about-page__social" href={ABOUT_INSTAGRAM_URL}>
          {ABOUT_INSTAGRAM}
        </a>
      </div>
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
