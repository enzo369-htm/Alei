import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetEditorial, type EditorialItem } from '../../api/editorial.ts'
import { Picture } from '../../images/Picture.tsx'
import './editorial.css'

export function EditorialDetail() {
  const { id } = useParams()
  const [item, setItem] = useState<EditorialItem | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setItem(null)
    setError('')
    void apiGetEditorial(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
  }, [id])

  return (
    <article className="editorial editorial--article">
      <p className="editorial__kicker">
        <Link to="/editorial">← Editorial</Link>
      </p>
      {error && <p className="editorial__note">{error}</p>}
      {item && (
        <>
          <h1 className="editorial__title">{item.title}</h1>
          {item.cover && (
            <div className="editorial__hero">
              <Picture media={item.cover} sizes="(max-width: 800px) 100vw, 800px" alt="" />
            </div>
          )}
          {item.body ? (
            <div className="editorial__body">
              {item.body.split('\n\n').map((para, index) => (
                <p key={index}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="editorial__note">Sin texto todavía.</p>
          )}
        </>
      )}
    </article>
  )
}
