import { Outlet, useLocation } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import { LanguageSwitch } from './locale'
import { Navbar } from './Navbar'
import './site.css'

export function SiteLayout() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  const piece = /^\/(works|colabs)\/[^/]+$/.test(pathname)
  const siteClass = ['site', home ? 'site--home' : '', piece ? 'site--piece' : ''].filter(Boolean).join(' ')

  return (
    <div className={siteClass}>
      <Navbar />
      <main className="site-main">
        <Outlet />
      </main>
      <LanguageSwitch />
    </div>
  )
}
