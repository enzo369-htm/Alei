import { useEffect, useState } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { useLocale } from './locale'

export function Navbar() {
  const onHero = useMatch({ path: '/', end: true })
  const { pathname } = useLocation()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const links = [
    { to: '/works', label: t('navWorks') },
    { to: '/colabs', label: t('navOther') },
    { to: '/about', label: t('navAbout') },
  ]
  const visible = onHero ? links : links.filter((link) => link.to === '/about')

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav className="site-nav">
      <Link to="/" className="site-nav__brand">
        alei
      </Link>
      <button
        type="button"
        className={`site-nav__toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? t('navClose') : t('navOpen')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="site-nav__bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      {open ? (
        <button type="button" className="site-nav__backdrop" aria-label={t('navClose')} onClick={() => setOpen(false)} />
      ) : null}
      <ul id="site-menu" className={`site-nav__links${open ? ' is-open' : ''}`}>
        {visible.map((link) => (
          <li key={link.to}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
