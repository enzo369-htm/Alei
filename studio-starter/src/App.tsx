import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminPage } from './core/admin/AdminPage'
import { AboutPage } from './AboutPage'
import { ArtworkPage } from './ArtworkPage'
import { HomePage } from './HomePage'
import { SiteCanvasPage } from './SiteCanvasPage'
import { SiteLayout } from './SiteLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/works" element={<SiteCanvasPage scope="works" label="Works" />} />
          <Route path="/works/:pieceId" element={<ArtworkPage scope="works" label="Works" />} />
          <Route path="/colabs" element={<SiteCanvasPage scope="colabs" label="Other.W" />} />
          <Route path="/colabs/:pieceId" element={<ArtworkPage scope="colabs" label="Other.W" />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
