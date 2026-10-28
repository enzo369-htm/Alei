import { Outlet, useLocation } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import { LanguageSwitch } from './locale'
import { Navbar } from './Navbar'
import './site.css'

export function SiteLayout() {
  const home = useLocation().pathname === '/'

  return (
    <div className={home ? 'site site--home' : 'site'}>
      <Navbar />
      <main className="site-main">
        <Outlet />
      </main>
      <LanguageSwitch />
    </div>
  )
}
