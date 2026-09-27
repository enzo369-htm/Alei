import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiListEditorial, type EditorialItem } from '../../api/editorial.ts'
import { Picture } from '../../images/Picture.tsx'
import './editorial.css'

export function EditorialIndex() {
  const [items, setItems] = useState<EditorialItem[]>([])
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void apiListEditorial()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setReady(true))
  }, [])

  return (
    <section className="editorial">
      <p className="editorial__kicker">
        <Link to="/">Inicio</Link>
      </p>
      <h1 className="editorial__title">Editorial</h1>
      {error && <p className="editorial__note">{error}</p>}
      {ready && !error && items.length === 0 && (
        <p className="editorial__note">Todavía no hay ítems.</p>
      )}
      <ul className="editorial__list">
        {items.map((item) => (
          <li key={item.id}>
            <Link className="editorial__card" to={`/editorial/${item.id}`}>
              <span className="editorial__cover">
                {item.cover ? <Picture media={item.cover} sizes="220px" alt="" /> : <span />}
              </span>
              <span className="editorial__copy">
                <h2>{item.title}</h2>
                {item.excerpt ? <p>{item.excerpt}</p> : null}
              </span>
              <span className="editorial__more">Leer</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
