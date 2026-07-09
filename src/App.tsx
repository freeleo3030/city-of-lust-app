import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import AgeVerifyPage from './pages/AgeVerifyPage'
import CharacterCreatePage from './pages/CharacterCreatePage'
import CharacterRevealPage from './pages/CharacterRevealPage'
import MapPage from './pages/MapPage'
import FemaleCharacterCreatePage from './pages/FemaleCharacterCreatePage'
import type { FemaleCharacterData } from './pages/FemaleCharacterCreatePage'
import CreatorDashboardPage from './pages/CreatorDashboardPage'

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ageVerified, setAgeVerified] = useState(true) // TODO: 개발 완료 후 false로 복구
  const [character, setCharacter] = useState<any>(() => {
    try { const s = localStorage.getItem('col_character'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [gold, setGold] = useState<number>(() => {
    return parseInt(localStorage.getItem('col_gold') ?? '500')
  })
  const [characterRevealed, setCharacterRevealed] = useState(() => {
    return localStorage.getItem('col_revealed') === 'true'
  })
  const [creatorMode, setCreatorMode] = useState(false)
  const [creatorDashboard, setCreatorDashboard] = useState(false)
  const [editingChar, setEditingChar] = useState<FemaleCharacterData | null>(null)
  const [femaleChars, setFemaleChars] = useState<FemaleCharacterData[]>(() => {
    try { const s = localStorage.getItem('col_female_chars'); return s ? JSON.parse(s) : [] } catch { return [] }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ background: '#0d0d1a', minHeight: '100vh' }} />
  // TODO: 개발 완료 후 로그인 연결
  // if (!user) return <LoginPage />
  if (!ageVerified) return <AgeVerifyPage onVerified={() => setAgeVerified(true)} />
  const saveCharacter = (c: any) => {
    localStorage.setItem('col_character', JSON.stringify(c))
    setCharacter(c)
  }
  const saveRevealed = (v: boolean) => {
    localStorage.setItem('col_revealed', String(v))
    setCharacterRevealed(v)
  }
  const goBackToEdit = () => {
    localStorage.removeItem('col_revealed')
    setCharacterRevealed(false)
    setCharacter(null)
    // character 데이터는 localStorage에 유지 → CharacterCreatePage가 읽어서 복원
  }

  if (!character) return <CharacterCreatePage onComplete={saveCharacter} initialData={JSON.parse(localStorage.getItem('col_character') ?? 'null')} gold={gold} />
  if (!characterRevealed) return <CharacterRevealPage character={character} onEnter={() => saveRevealed(true)} onBack={goBackToEdit} />

  if (creatorDashboard) return (
    <CreatorDashboardPage
      chars={femaleChars}
      onAdd={() => { setEditingChar(null); setCreatorDashboard(false); setCreatorMode(true) }}
      onEdit={(char) => { setEditingChar(char); setCreatorDashboard(false); setCreatorMode(true) }}
      onDelete={(id) => {
        const updated = femaleChars.filter(c => c.id !== id)
        localStorage.setItem('col_female_chars', JSON.stringify(updated))
        setFemaleChars(updated)
      }}
      onUpdateChar={(char) => {
        const updated = femaleChars.map(c => c.id === char.id ? char : c)
        localStorage.setItem('col_female_chars', JSON.stringify(updated))
        setFemaleChars(updated)
      }}
      onBack={() => setCreatorDashboard(false)}
    />
  )

  if (creatorMode) return (
    <FemaleCharacterCreatePage
      initialData={editingChar ?? undefined}
      onComplete={(char) => {
        const updated = editingChar
          ? femaleChars.map(c => c.id === char.id ? char : c)
          : [...femaleChars, char]
        localStorage.setItem('col_female_chars', JSON.stringify(updated))
        setFemaleChars(updated)
        setEditingChar(null)
        setCreatorMode(false)
        setCreatorDashboard(true)
      }}
      onBack={() => { setEditingChar(null); setCreatorMode(false); setCreatorDashboard(true) }}
    />
  )

  return <MapPage character={character} onViewCharacter={() => setCharacterRevealed(false)} gold={gold} onCreatorMode={() => setCreatorDashboard(true)} femaleChars={femaleChars} />
}
