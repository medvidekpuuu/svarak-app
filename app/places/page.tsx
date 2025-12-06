'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import supabase from '../../lib/supabaseClient'
import { getStoredUserName, setStoredUserName } from '../../lib/userName'

type PlaceWithStats = {
  id: string
  name: string
  average_score: number | null
  ratings_count: number
}

type PlaceRow = {
  id: string
  name: string
}

type RatingRow = {
  place_id: string
  score: number
}

export default function PlacesPage() {
  const router = useRouter()
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  // modal pro přidání podniku
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newPlaceName, setNewPlaceName] = useState('')

  // modal pro změnu jména
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const stored = getStoredUserName()
    if (!stored) {
      router.replace('/')
      return
    }
    setUserName(stored)
    fetchPlaces()
  }, [router])

  async function fetchPlaces() {
    setLoading(true)
    setErrorMsg(null)

    // 1) načti všechny podniky
    const { data: placesData, error: placesError } = await supabase
      .from('places')
      .select('id, name')
      .order('name', { ascending: true })

    if (placesError) {
      console.error(placesError)
      setErrorMsg('Nepodařilo se načíst podniky.')
      setLoading(false)
      return
    }

    const placeRows = (placesData || []) as PlaceRow[]

    // pokud nemáme žádné podniky, nemusíme řešit hodnocení
    if (!placeRows.length) {
      setPlaces([])
      setLoading(false)
      return
    }

    const placeIds = placeRows.map((p) => p.id)

    // 2) načti hodnocení pro tyhle podniky
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('place_id, score')
      .in('place_id', placeIds)

    if (ratingsError) {
      console.error(ratingsError)
      setErrorMsg('Nepodařilo se načíst hodnocení.')
      setLoading(false)
      return
    }

    const ratingRows = (ratingsData || []) as RatingRow[]

    // 3) spočítej sumu + počet pro každý podnik
    const statsMap = new Map<string, { sum: number; count: number }>()

    for (const r of ratingRows) {
      const current = statsMap.get(r.place_id) || { sum: 0, count: 0 }
      current.sum += r.score
      current.count += 1
      statsMap.set(r.place_id, current)
    }

    // 4) slož výslednou tabulku
    let result: PlaceWithStats[] = placeRows.map((p) => {
      const stat = statsMap.get(p.id)
      if (!stat) {
        return {
          id: p.id,
          name: p.name,
          average_score: null,
          ratings_count: 0,
        }
      }
      return {
        id: p.id,
        name: p.name,
        average_score: stat.sum / stat.count,
        ratings_count: stat.count,
      }
    })

    // nejlepší nahoru, bez průměru dolů
    result = result.sort((a, b) => {
      if (a.average_score == null && b.average_score == null) return 0
      if (a.average_score == null) return 1
      if (b.average_score == null) return -1
      return b.average_score - a.average_score
    })

    setPlaces(result)
    setLoading(false)
  }

  async function addPlace() {
    const value = newPlaceName.trim()
    if (!value) {
      setErrorMsg('Napiš název podniku.')
      return
    }

    setErrorMsg(null)

    const { error } = await supabase.from('places').insert({ name: value })

    if (error) {
      console.error('ADD PLACE ERROR', error)
      setErrorMsg('Nepodařilo se přidat podnik: ' + error.message)
      return
    }

    setNewPlaceName('')
    setIsModalOpen(false)
    await fetchPlaces()
  }

  function handleAddPlaceSubmit(e: FormEvent) {
    e.preventDefault()
    void addPlace()
  }

  function openAddModal() {
    setErrorMsg(null)
    setNewPlaceName('')
    setIsModalOpen(true)
  }

  function closeAddModal() {
    setIsModalOpen(false)
  }

  // otevřít modal pro změnu jména
  function openNameModal() {
    setNewName(userName || '')
    setIsNameModalOpen(true)
  }

  function saveNewName() {
    const value = newName.trim()
    if (!value) return
    setStoredUserName(value)
    setUserName(value)
    setIsNameModalOpen(false)
  }

  function cancelNameChange() {
    setIsNameModalOpen(false)
    setNewName('')
  }

  return (
    <main className="page-root">
      <div className="page-shell">
        {/* horní řádek – kdo hodnotí + změna jména + plus */}
        <div
          className="card-title-row"
          style={{ marginBottom: 14, alignItems: 'center', gap: 8 }}
        >
          <div className="card-subtitle" style={{ flex: 1 }}>
            Hodnotíš jako <strong>{userName}</strong>
          </div>
          <button className="btn btn-secondary" onClick={openNameModal}>
            Změnit jméno
          </button>
          <button
            type="button"
            aria-label="Přidat podnik"
            onClick={openAddModal}
            style={{
              width: 36,
              height: 36,
              borderRadius: '999px',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 20px rgba(127,29,29,0.45)',
            }}
          >
            +
          </button>
        </div>

        {loading && <p className="text-small">Načítám podniky…</p>}
        {errorMsg && <p className="text-error">{errorMsg}</p>}
        {!loading && !places.length && !errorMsg && (
          <p className="text-small">Zatím žádné podniky.</p>
        )}

        <ul className="list">
          {places.map((place, index) => (
            <li key={place.id} style={{ marginTop: index === 0 ? 0 : 8 }}>
              <Link href={`/place/${place.id}`} className="place-item">
                <div className="place-main">
                  <div className="place-name">{place.name}</div>
                  <div className="place-rating-row">
                    {place.average_score != null ? (
                      <>
                        <span className="place-rating-icon">★</span>
                        <span className="place-rating-main">
                          {place.average_score.toFixed(1)}
                        </span>
                        <span className="place-rating-meta">
                          {' '}
                          / 10{' '}
                          {place.ratings_count
                            ? `(${place.ratings_count} hlasů)`
                            : ''}
                        </span>
                      </>
                    ) : (
                      <span className="place-rating-meta">— / 10</span>
                    )}
                  </div>
                </div>
                {index === 0 && place.average_score != null && (
                  <span className="btn-chip">TOP</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* MODAL – přidat podnik */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 12px 0',
              }}
            >
              Přidat podnik
            </h2>

            <form
              onSubmit={handleAddPlaceSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div className="input-wrapper">
                <input
                  className="input"
                  type="text"
                  autoFocus
                  placeholder="Název podniku"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={closeAddModal}
                  style={{
                    background: '#f3f4f6',
                  }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newPlaceName.trim()}
                >
                  Přidat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL – změna jména */}
      {isNameModalOpen && (
        <div className="modal-backdrop" onClick={cancelNameChange}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 12px 0',
              }}
            >
              Změnit jméno
            </h2>

            <div className="input-wrapper">
              <input
                className="input"
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                marginTop: 12,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={cancelNameChange}
                style={{ background: '#f3f4f6' }}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!newName.trim()}
                onClick={saveNewName}
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

