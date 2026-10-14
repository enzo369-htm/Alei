import { Link, useMatch } from 'react-router-dom'

const links = [
  { to: '/works', label: 'works' },
  { to: '/colabs', label: 'more' },
  { to: '/about', label: 'about' },
] as const

export function Navbar() {
  const onWork = useMatch('/works/:pieceId')
  const visible = onWork ? links.filter((link) => link.to === '/about') : links

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
