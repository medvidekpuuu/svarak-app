'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import supabase from '../../../lib/supabaseClient'
import { getStoredUserName } from '../../../lib/userName'

type Place = {
  id: string
  name: string
}

type Rating = {
  id: string
  user_name: string
  score: number
  created_at: string
}

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [place, setPlace] = useState<Place | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  const [userName, setUserName] = useState<string | null>(null)
  const [score, setScore] = useState(7)
  const [myRatingId, setMyRatingId] = useState<string | null>(null) // <-- ID mého hlasu
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const placeId = params?.id as string | undefined

  // načtení jména + dat
  useEffect(() => {
    const stored = getStoredUserName()
    setUserName(stored || null)

    if (!placeId) return
    loadData(placeId)
  }, [placeId])

  // když máme načtená hodnocení a zároveň jméno, zjistíme můj hlas
  useEffect(() => {
    if (!userName || ratings.length === 0) {
      setMyRatingId(null)
      return
    }
    const mine = ratings.find((r) => r.user_name === userName)
    if (mine) {
      setMyRatingId(mine.id)
      setScore(mine.score) // slider předvyplníme mým hlasem
    } else {
      setMyRatingId(null)
      setScore(7) // default
    }
  }, [userName, ratings])

  async function loadData(id: string) {
    setLoading(true)
    setErrorMsg(null)

    const { data: placeData, error: placeError } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single()

    if (placeError) {
      console.error(placeError)
      setErrorMsg('Nepodařilo se načíst podnik.')
      setLoading(false)
      return
    }
    setPlace(placeData as Place)

    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('id, user_name, score, created_at')
      .eq('place_id', id)
      .order('created_at', { ascending: false })

    if (ratingsError) {
      console.error(ratingsError)
      setErrorMsg('Nepodařilo se načíst hodnocení.')
    } else {
      setRatings((ratingsData as Rating[]) || [])
    }

    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!placeId) return

    if (!userName) {
      setErrorMsg('Nejdřív si na hlavní stránce nastav své jméno.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      if (myRatingId) {
        // UŽ JSEM HLASOVAL → UPDATE
        const { error: updateError } = await supabase
          .from('ratings')
          .update({ score })
          .eq('id', myRatingId)

        if (updateError) throw updateError
      } else {
        // JEŠTĚ JSEM NEHLASOVAL → INSERT
        const { data, error: insertError } = await supabase
          .from('ratings')
          .insert({
            place_id: placeId,
            user_name: userName,
            score,
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        if (data) {
          setMyRatingId(data.id)
        }
      }

      await loadData(placeId)
    } catch (err) {
      console.error(err)
      setErrorMsg('Něco se pokazilo při ukládání hlasu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="page-root">
        <div className="page-shell">Načítám…</div>
      </main>
    )
  }

  if (!place) {
    return (
      <main className="page-root">
        <div className="page-shell">Podnik nenalezen.</div>
      </main>
    )
  }

  return (
    <main className="page-root">
      <div className="page-shell">
        <div className="back-row" onClick={() => router.push('/places')}>
          <span>←</span>
          <span>Zpět na seznam</span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          {place.name}
        </h1>

        {userName ? (
          <p className="text-small" style={{ marginBottom: 4 }}>
            Hodnotíš jako <strong>{userName}</strong>
          </p>
        ) : (
          <p className="text-error" style={{ marginBottom: 4 }}>
            Nemáš nastavené jméno – vrať se na hlavní stránku a vyplň ho.
          </p>
        )}

        {myRatingId && (
          <p className="text-small" style={{ marginBottom: 12 }}>
            Už jsi tady hlasoval – změna slideru přepíše tvé předchozí
            hodnocení.
          </p>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title-row">
            <div className="card-title">Přidat / upravit hodnocení</div>
          </div>

          {errorMsg && <p className="text-error">{errorMsg}</p>}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <div className="slider-row">
                <span>Body (1–10)</span>
                <span className="slider-value">{score}</span>
              </div>
              <input
                className="slider"
                type="range"
                min={1}
                max={10}
                step={1}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !userName}
            >
              {submitting ? 'Ukládám…' : myRatingId ? 'Přepsat hlas' : 'Potvrdit'}
            </button>
          </form>
        </div>

        <div>
          <div className="card-title" style={{ marginBottom: 8 }}>
            Všechna hodnocení
          </div>

          {ratings.length === 0 && (
            <p className="text-small">Zatím žádné hodnocení.</p>
          )}

          {ratings.map((r) => (
            <div key={r.id} className="rating-item">
              <div className="rating-top">
                {r.user_name} – {r.score} / 10
              </div>
              <div className="rating-meta">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

