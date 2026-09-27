import { useState, type FormEvent } from 'react'
import { loginAdmin } from '../api/auth'
import { site } from '../../site.config'

type Props = {
  onAuthed: () => void
}

export function AdminLogin({ onAuthed }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await loginAdmin(password)
      onAuthed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login__card" onSubmit={(event) => void onSubmit(event)}>
        <p className="admin-login__kicker">CMS</p>
        <h1 className="admin-login__title">{site.name}</h1>
        <label className="admin-login__label" htmlFor="admin-password">
          Contraseña
        </label>
        <input
          id="admin-password"
          className="admin-login__input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="admin-login__error">{error}</p>}
        <button className="admin-login__submit" type="submit" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
