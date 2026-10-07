import { Link } from 'react-router-dom'

const links = [
  { to: '/works', label: 'works' },
  { to: '/about', label: 'about' },
  { to: '/colabs', label: 'colabs' },
] as const

export function Navbar() {
  return (
    <nav className="site-nav">
      <Link to="/" className="site-nav__brand">
        alei
      </Link>
      <ul className="site-nav__links">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
