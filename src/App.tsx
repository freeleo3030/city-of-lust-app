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
import SexScenePage from './pages/SexScenePage'
import DatePage from './pages/DatePage'

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
  const [sexScene, setSexScene] = useState<{ char: FemaleCharacterData; pose: string } | null>(null)
  const [dateScene, setDateScene] = useState<FemaleCharacterData | null>(null)
  const [showPoseSelect, setShowPoseSelect] = useState<FemaleCharacterData | null>(null)
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

  // DB에서 여캐 목록 로드 (localStorage와 병합)
  useEffect(() => {
    supabase.from('female_characters').select('*').then(({ data, error }) => {
      console.log('[DB] female_characters:', data, 'error:', error)
      if (error || !data) return
      const dbChars: FemaleCharacterData[] = data.map((row: any) => ({
        id: row.id,
        nickname: row.nickname,
        age: row.age,
        bodyType: row.body_type,
        location: row.location,
        job: row.job,
        married: row.married,
        intro: row.intro,
        memo: row.memo ?? '',
        face: row.face ?? 3,
        body: row.body ?? 3,
        fashion: row.fashion ?? 3,
        erogenous: row.erogenous ?? { breast:3, neckEar:3, thigh:3, clitoris:3, vagina:3, anal:1, mouth:3 },
        prefAge: row.pref_age ?? { age20:34, age30:33, age40:33 },
        prefLook: row.pref_look ?? { face:25, height:25, body:25, fashion:25 },
        prefWealth: row.pref_wealth ?? 50,
        smSelf: row.sm_self ?? 0,
        smPreferMale: row.sm_prefer_male ?? 0,
        interests: row.interests ?? [],
        dislikes: row.dislikes ?? [],
        imageUrl: row.image_url ?? '',
        expressionImages: row.expression_images ?? [],
        poseImages: row.pose_images ?? {},
        prefErect: row.stats?.prefErect ?? { power: 25, duration: 25, hardness: 25, tech: 25 },
        prefSize: row.stats?.prefSize ?? { size: 50, girth: 50 },
        prefPose: row.stats?.prefPose ?? { missionary: 3, doggy: 3, cowgirl: 3, side: 3 },
        prefPersonality: row.stats?.prefPersonality ?? { intel: 25, humor: 25, virtue: 25, manner: 25 },
        smTendency: row.stats?.smTendency ?? 0,
        dateCostShare: row.stats?.dateCostShare ?? 0,
        createdAt: row.created_at ?? '',
      }))
      setFemaleChars(prev => {
        // DB 우선, localStorage에만 있는 것도 유지
        const merged = [...dbChars]
        prev.forEach(lc => { if (!merged.find(d => d.id === lc.id)) merged.push(lc) })
        localStorage.setItem('col_female_chars', JSON.stringify(merged))
        return merged
      })
    })
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

  if (dateScene) return (
    <DatePage
      femaleChar={dateScene}
      maleChar={character}
      userId={user?.id ?? 'dev-user'}
      onBack={() => setDateScene(null)}
      onSexUnlocked={(char) => { setDateScene(null); setShowPoseSelect(char) }}
    />
  )

  if (sexScene) return (
    <SexScenePage
      femaleChar={sexScene.char}
      poseKey={sexScene.pose}
      maleChar={character}
      onEnd={(_result) => setSexScene(null)}
    />
  )

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

  const POSES = [
    { key: 'missionary', label: '정상위', emoji: '🛏️' },
    { key: 'doggy',      label: '후배위', emoji: '🐾' },
    { key: 'cowgirl',    label: '여성상위', emoji: '⭐' },
    { key: 'side',       label: '버터플라이', emoji: '🦋' },
  ]

  return (
    <>
      <MapPage
        character={character}
        onViewCharacter={() => setCharacterRevealed(false)}
        gold={gold}
        onCreatorMode={() => setCreatorDashboard(true)}
        femaleChars={femaleChars}
        onStartDate={(char) => setDateScene(char)}
        onStartSexScene={(char, pose) => setSexScene({ char, pose })}
      />
      {/* SEX 잠금 해제 후 자세 선택 모달 */}
      {showPoseSelect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: '1px solid #c9a84c44', borderRadius: 16, padding: 24, width: 280 }}>
            <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>❤️‍🔥 SEX 시작</div>
            <div style={{ color: '#ffffff66', fontSize: 12, marginBottom: 16 }}>{showPoseSelect.nickname}와(과) 어떤 자세로?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {POSES.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setSexScene({ char: showPoseSelect, pose: p.key }); setShowPoseSelect(null) }}
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c44', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 20 }}>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPoseSelect(null)} style={{ marginTop: 12, width: '100%', background: 'none', border: '1px solid #ffffff22', borderRadius: 8, padding: '8px 0', color: '#ffffff66', cursor: 'pointer', fontSize: 13 }}>취소</button>
          </div>
        </div>
      )}
    </>
  )
}
