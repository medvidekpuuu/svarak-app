'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUserName, setStoredUserName } from '../lib/userName'

export default function StartPage() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const stored = getStoredUserName()
    if (stored) {
      router.replace('/places')
    }
  }, [router])

  function handleSave() {
    const clean = name.trim()
    if (!clean) return
    setStoredUserName(clean)
    router.push('/places')
  }

  return (
    <main className="page-root">
      <div className="page-shell">
        <header className="app-header-main">
          <div className="app-title-row">
            <h1 className="app-title">Svařák app</h1>
            <span>🍷</span>
          </div>
          <p className="app-subtitle">
            Malá aplikace na hodnocení svařáku v podnicích.
          </p>
        </header>

        <div className="card">
          <div className="card-title-row">
            <div className="card-title">Kdo hodnotí</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                className="input"
                type="text"
                placeholder="Petr…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Pokračovat
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

