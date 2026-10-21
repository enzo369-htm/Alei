import { Link, useMatch } from 'react-router-dom'
import { useLocale } from './locale'

export function Navbar() {
  const onHero = useMatch({ path: '/', end: true })
  const { t } = useLocale()
  const links = [
    { to: '/works', label: t('navWorks') },
    { to: '/colabs', label: t('navOther') },
    { to: '/about', label: t('navAbout') },
  ]
  const visible = onHero ? links : links.filter((link) => link.to === '/about')

  return (
    <nav className="site-nav">
      <Link to="/" className="site-nav__brand">
        alei
      </Link>
      <ul className="site-nav__links">
        {visible.map((link) => (
          <li key={link.to}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
