import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { textOf, type Lang } from './text-of.ts'

export { textOf, type Lang }

const KEY = 'alei-lang'

const copy = {
  es: {
    navWorks: 'works',
    navOther: 'projects',
    navAbout: 'about',
    navOpen: 'Abrir menú',
    navClose: 'Cerrar menú',
    empty: 'Todavía no hay nada.',
    unavailable: 'No está disponible.',
    workUnavailable: 'Esta obra no está disponible.',
    aboutUnavailable: 'About no está disponible.',
    sold: 'sold',
    previousImage: 'Imagen anterior',
    nextImage: 'Imagen siguiente',
    previousWork: 'Obra anterior',
    nextWork: 'Obra siguiente',
    interestSubject: 'Me interesa la obra {work}',
    interestBody: 'Me interesa la obra {work}.',
    interestEmptySubject: 'Me interesa esta obra',
    interestEmptyBody: 'Me interesa esta obra.',
  },
  en: {
    navWorks: 'works',
    navOther: 'projects',
    navAbout: 'about',
    navOpen: 'Open menu',
    navClose: 'Close menu',
    empty: 'Nothing here yet.',
    unavailable: 'This is not available.',
    workUnavailable: 'This work is not available.',
    aboutUnavailable: 'About is not available.',
    sold: 'sold',
    previousImage: 'Previous image',
    nextImage: 'Next image',
    previousWork: 'Previous work',
    nextWork: 'Next work',
    interestSubject: "I'm interested in the work {work}",
    interestBody: "I'm interested in the work {work}.",
    interestEmptySubject: "I'm interested in this work",
    interestEmptyBody: "I'm interested in this work.",
  },
} as const

export type CopyKey = keyof (typeof copy)['es']

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

const LocaleContext = createContext<{
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: CopyKey) => string
} | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* storage blocked */
    }
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: CopyKey) => copy[lang][key],
    }),
    [lang],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale fuera de LocaleProvider')
  return value
}

export function LanguageSwitch() {
  const { lang, setLang } = useLocale()
  return (
    <div className="lang-switch" role="group" aria-label={lang === 'en' ? 'Language' : 'Idioma'}>
      <button
        type="button"
        className={lang === 'es' ? 'is-active' : undefined}
        aria-pressed={lang === 'es'}
        onClick={() => setLang('es')}
      >
        ES
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'is-active' : undefined}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  )
}
