export type AboutBlockKind = 'title' | 'secondary'

export type AboutBlock = {
  id: string
  kind: AboutBlockKind | 'preserved'
  title: string
  titleEn: string
  plain: string
  plainEn: string
  body: string
  bodyEn: string
  raw?: Record<string, unknown>
}

const DEFAULT_BIO = [
  'His work is based on a layering strategy of superimposed stratums and mixed paint compositions coming from organic abstracted shapes.',
  'Through the use of modulation and materiality, he aims to reach a poetic and naked essence. Meanwhile, these compositions follow a path of silence in between the heights of paint reaching out to the essential.',
  'Space and time or physics and memory are concepts that hide along the subtle cracks on the canvas surface. Subdued tones fight against proportion to achieve harmony.',
]

export function defaultAboutBlocks(): AboutBlock[] {
  return [
    {
      id: 'title',
      kind: 'title',
      title: 'alei',
      titleEn: '',
      plain: '(alejandro rodríguez lópez)',
      plainEn: '',
      body: DEFAULT_BIO.join('\n\n'),
      bodyEn: '',
    },
    {
      id: 'shows',
      kind: 'secondary',
      title: 'exposiciones',
      titleEn: '',
      plain: '',
      plainEn: '',
      body: '- expo conjunta ACID FAIR (Tenerife, 2025)\n- expo irfof woefn (Madrid, 2026)',
      bodyEn: '',
    },
    {
      id: 'press',
      kind: 'secondary',
      title: 'prensa',
      titleEn: '',
      plain: '',
      plainEn: '',
      body: '- ACERO MAGAZINE.\n- Faro de Vigo',
      bodyEn: '',
    },
  ]
}

function textField(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function titleParts(title: string, plain: unknown) {
  if (typeof plain === 'string') return { title, plain }
  const open = title.indexOf('(')
  if (open === -1) return { title, plain: '' }
  return { title: title.slice(0, open).trimEnd(), plain: title.slice(open).trim() }
}

function blockKind(value: unknown): AboutBlockKind | null {
  if (value === 'title') return 'title'
  if (value === 'secondary' || value === 'shows' || value === 'press') return 'secondary'
  return null
}

export function parseAboutBlocks(body: string): AboutBlock[] | null {
  if (!body.trim()) return defaultAboutBlocks()
  try {
    const data = JSON.parse(body) as { aboutBlocks?: unknown }
    if (!data || typeof data !== 'object' || !Array.isArray(data.aboutBlocks)) return null
    const blocks: AboutBlock[] = []
    for (let index = 0; index < data.aboutBlocks.length; index += 1) {
      const item = data.aboutBlocks[index]
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' && record.id ? record.id : `about-block-${index}`
      const kind = blockKind(record.kind)
      if (!kind) {
        blocks.push({
          id,
          kind: 'preserved',
          title: '',
          titleEn: '',
          plain: '',
          plainEn: '',
          body: '',
          bodyEn: '',
          raw: record,
        })
        continue
      }
      const title = textField(record.title)
      const parts = kind === 'title' ? titleParts(title, record.plain) : { title, plain: '' }
      blocks.push({
        id,
        kind,
        title: parts.title,
        titleEn: textField(record.titleEn),
        plain: parts.plain,
        plainEn: textField(record.plainEn),
        body: textField(record.body),
        bodyEn: textField(record.bodyEn),
      })
    }
    return blocks
  } catch {
    return null
  }
}

export const DEFAULT_ABOUT_EMAIL = 'aleidraws@gmail.com'
export const DEFAULT_ABOUT_INSTAGRAM = '@aleidraws'

export type AboutContact = {
  email: string
  instagram: string
}

export function defaultAboutContact(): AboutContact {
  return { email: DEFAULT_ABOUT_EMAIL, instagram: DEFAULT_ABOUT_INSTAGRAM }
}

/** Sin `contact` en el JSON, se mantienen los datos que ya se muestran. */
export function parseAboutContact(body: string): AboutContact {
  const fallback = defaultAboutContact()
  if (!body.trim()) return fallback
  try {
    const data = JSON.parse(body) as { contact?: unknown }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('contact' in data)) return fallback
    const contact = data.contact
    if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return fallback
    const record = contact as Record<string, unknown>
    return {
      email: typeof record.email === 'string' ? record.email : fallback.email,
      instagram: typeof record.instagram === 'string' ? record.instagram : fallback.instagram,
    }
  } catch {
    return fallback
  }
}

export function instagramHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const handle = trimmed.replace(/^@+/, '').split(/[/?#]/)[0]
  if (!handle) return ''
  return `https://www.instagram.com/${handle}/`
}

export function serializeAboutBlocks(blocks: AboutBlock[], contact: AboutContact = defaultAboutContact()) {
  return JSON.stringify({
    aboutBlocks: blocks.map((block) => (block.kind === 'preserved' && block.raw ? block.raw : {
      id: block.id,
      kind: block.kind,
      title: block.title,
      titleEn: block.titleEn,
      plain: block.plain,
      plainEn: block.plainEn,
      body: block.body,
      bodyEn: block.bodyEn,
    })),
    contact: {
      email: contact.email,
      instagram: contact.instagram,
    },
  })
}

export function aboutBlockLabel(kind: AboutBlock['kind']) {
  if (kind === 'title') return 'Título'
  if (kind === 'secondary') return 'Bloque secundario'
  return 'Bloque sin reconocer'
}

export const ABOUT_UPDATED = 'alei-about-updated'

export function publishAboutUpdated() {
  const stamp = String(Date.now())
  try {
    localStorage.setItem(ABOUT_UPDATED, stamp)
  } catch {
    /* storage blocked */
  }
  try {
    const channel = new BroadcastChannel(ABOUT_UPDATED)
    channel.postMessage(stamp)
    channel.close()
  } catch {
    /* unsupported */
  }
}
