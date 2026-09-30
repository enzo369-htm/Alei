import { Outlet } from 'react-router-dom'
import '@fontsource-variable/inter'
import { Navbar } from './Navbar'
import './site.css'

export function SiteLayout() {
  return (
    <div className="site">
      <Navbar />
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}
