import { Route, Routes } from 'react-router-dom'
import { AdminCanvas } from '../modules/free-canvas/AdminCanvas'
import { AdminPageEditor } from '../recipes/base-page/AdminPageEditor'
import { AdminGate } from './AdminGate'
import { AdminHero } from './AdminHero'
import { AdminShell } from './AdminShell'
import { site } from '../../site.config'
import './admin.css'

function AdminEmptyState() {
  return (
    <main className="admin-page">
      <h1 className="admin-page__title">Admin</h1>
      <p className="admin-page__copy">
        Hero, Works, Other.W y About.
      </p>
      {site.adminLinks.length === 0 && (
        <p className="admin-page__hint">Sin secciones registradas.</p>
      )}
    </main>
  )
}

export function AdminPage() {
  return (
    <Routes>
      <Route element={<AdminGate />}>
        <Route element={<AdminShell />}>
          <Route index element={<AdminEmptyState />} />
          <Route path="hero" element={<AdminHero />} />
          <Route path="works" element={<AdminCanvas scope="works" heading="Works" />} />
          <Route path="colabs" element={<AdminCanvas scope="colabs" heading="Other.W" />} />
          <Route path="about" element={<AdminPageEditor slug="about" heading="About" />} />
        </Route>
      </Route>
    </Routes>
  )
}
