import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/works', label: 'works' },
  { to: '/about', label: 'about' },
  { to: '/colabs', label: 'colabs' },
] as const

export function Navbar() {
  const { pathname } = useLocation()
  const onWork = /^\/works\/[^/]+/.test(pathname)
  const visible = onWork ? links.filter((link) => link.to === '/about') : links

  return (
    <nav className="site-nav">
      <Link to="/" className="site-nav__brand">
        ALEI
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
