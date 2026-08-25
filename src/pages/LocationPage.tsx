import { useState, useRef, useEffect } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'
import { useScale } from '../hooks/useScale'

interface Location {
  id: number
  name: string
  emoji: string
  color: string
  desc: string
}

interface Props {
  location: Location
  femaleChars: FemaleCharacterData[]
  maleChar?: any
  gold?: number
  onBack: () => void
  onStartDate?: (char: FemaleCharacterData) => void
  onStartSexScene?: (char: FemaleCharacterData, pose: string) => void
}

// 여캐 레벨 판별
function getFemaleLevel(char: FemaleCharacterData): number {
  const { age, married } = char
  if (age >= 30 && age < 40 && married === '기혼') return 6
  if (age >= 40 && married === '기혼') return 5
  if ((age >= 20 && age < 30 && married === '기혼') ||
      (age >= 30 && age < 40 && married === '돌싱') ||
      (age >= 40 && married === '돌싱')) return 4
  if ((age >= 30 && married === '미혼') || (age >= 40 && married === '미혼')) return 3
  if (age >= 20 && age < 30 && married === '돌싱') return 2
  return 1
}

const LEVEL_HURDLE = [0, 10, 20, 35, 50, 70, 90] // index = Lv

function calcWealth(gold: number): number {
  if (gold >= 1_000_000) return 100
  if (gold >= 500_000)   return 80
  if (gold >= 200_000)   return 60
  if (gold >= 50_000)    return 30
  if (gold >= 10_000)    return 10
  return 0
}

// S1 총매력도 계산
// 외모궁합 × 0.70 + 대화궁합 × 0.15 + 나이매칭 × 0.15 + 재력보너스
function calcS1Score(male: any, female: FemaleCharacterData): number {
  const pl = female.prefLook     ?? { face: 25, height: 25, body: 25, fashion: 25 }
  const pp = female.prefPersonality ?? { intel: 25, humor: 25, virtue: 25, manner: 25 }
  const pa = (female as any).prefAge ?? { age20: 34, age30: 33, age40: 33 }

  const lookScore =
    (male.face    ?? 25) * (pl.face    / 100) +
    (male.height  ?? 25) * (pl.height  / 100) +
    (male.body    ?? 25) * (pl.body    / 100) +
    (male.fashion ?? 25) * (pl.fashion / 100)

  const talkScore =
    (male.intellect ?? 25) * (pp.intel / 100) +
    (male.humor     ?? 25) * (pp.humor   / 100) +
    (male.virtue    ?? 25) * (pp.virtue  / 100) +
    (male.manner    ?? 25) * (pp.manner  / 100)

  const ageGroup = (male.age ?? 25) < 30 ? 'age20' : (male.age ?? 25) < 40 ? 'age30' : 'age40'
  const ageScore = pa[ageGroup] ?? 33

  return Math.round(lookScore * 0.70 + talkScore * 0.15 + ageScore * 0.15)
}

function calcWealthBonus(gold: number, female: FemaleCharacterData): number {
  return calcWealth(gold) * ((female as any).prefWealth ?? 50) / 100 * 0.15
}

const marriedLabel = { '미혼': '미혼', '기혼': '기혼', '돌싱': '돌싱' }
const diffColor = (married: string, age: number) => {
  if (married === '기혼') return '#e94560'
  if (married === '돌싱') return '#c9a84c'
  if (age >= 40) return '#9c6fe4'
  if (age >= 30) return '#66BB6A'
  return '#64b5f6'
}

const REJECT_LINES: Record<number, string[]> = {
  1: ["어... 저 지금 좀 바빠서요.", "죄송한데 오늘은 좀 그래요.", "음... 저 약속이 있어서요."],
  2: ["별로 관심 없어요.", "지금은 좀 아닌 것 같아요.", "그냥 가주세요."],
  3: ["필요 없어요.", "말 걸지 마세요.", "저한테 왜 이러세요."],
  4: ["관심 없어요.", "시간 낭비예요.", "보시다시피 바빠요."],
  5: ["...", "보이지 않으세요?", "무슨 일이죠."],
  6: ["감히.", "웃기네요.", "착각하지 마세요."],
}

function getRejectLine(lv: number): string {
  const lines = REJECT_LINES[lv] ?? REJECT_LINES[3]
  return lines[Math.floor(Math.random() * lines.length)]
}

const POSES = [
  { key: 'missionary', label: '정상위', emoji: '🛏️' },
  { key: 'doggy',      label: '후배위', emoji: '🐾' },
  { key: 'cowgirl',    label: '여성상위', emoji: '⭐' },
  { key: 'side',       label: '버터플라이', emoji: '🦋' },
]

export default function LocationPage({ location, femaleChars, maleChar, gold = 0, onBack, onStartDate, onStartSexScene }: Props) {
  const scale = useScale(1440)
  const [selected, setSelected] = useState<FemaleCharacterData | null>(null)
  const [showPoseSelect, setShowPoseSelect] = useState(false)
  const [rejectState, setRejectState] = useState<{ line: string; score: number; hurdle: number; bypassChar: FemaleCharacterData | null } | null>(null)
  const [bypassCountdown, setBypassCountdown] = useState(0)
  const rejectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const isTestChar = maleChar?.nickname === '윈드'

  useEffect(() => {
    if (bypassCountdown <= 0 || !rejectState?.bypassChar) return
    if (bypassCountdown === 0) return
    countdownRef.current = setInterval(() => {
      setBypassCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          const char = rejectState.bypassChar!
          setRejectState(null)
          onStartDate?.(char)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [rejectState])

  function handleApproach(char: FemaleCharacterData) {
    if (!maleChar) { onStartDate?.(char); return }
    const base   = calcS1Score(maleChar, char)
    const bonus  = calcWealthBonus(gold, char)
    const score  = Math.round(base + bonus)
    const lv     = getFemaleLevel(char)
    const hurdle = LEVEL_HURDLE[lv]
    if (score >= hurdle) {
      onStartDate?.(char)
    } else {
      if (rejectTimer.current) clearTimeout(rejectTimer.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setRejectState({ line: getRejectLine(lv), score, hurdle, bypassChar: isTestChar ? char : null })
      if (isTestChar) {
        setBypassCountdown(5)
      } else {
        rejectTimer.current = setTimeout(() => setRejectState(null), 3500)
      }
    }
  }

  const chars = femaleChars.filter(c => c.location === location.name)
  console.log('[Location]', location.name, '| femaleChars:', femaleChars.length, '| chars:', chars.length, '| locations:', femaleChars.map(c => `${c.nickname}:${c.location}`))

  return (
    <div style={S.container}>
      {/* 헤더 */}
      <div style={{ ...S.header, zoom: scale * 0.8 }}>
        <button style={S.backBtn} onClick={onBack}>← 지도로</button>
        <div style={S.headerTitle}>
          <span style={S.headerEmoji}>{location.emoji}</span>
          <span style={{ color: location.color, fontWeight: 'bold', fontSize: 20 }}>{location.name}</span>
        </div>
        <div style={S.headerDesc}>{location.desc}</div>
      </div>

      {/* 여캐 목록 */}
      <div style={{ ...S.list, zoom: scale * 0.8 }}>
        {chars.length === 0 ? (
          <div style={S.empty}>
            <p style={{ color: '#ffffff33', fontSize: 15, margin: 0 }}>아직 이곳에 등록된 여캐가 없어요</p>
            <p style={{ color: '#ffffff22', fontSize: 12, marginTop: 8 }}>창조자 모드에서 이 장소에 캐릭터를 배치해보세요</p>
          </div>
        ) : (
          chars.map(char => (
            <div
              key={char.id}
              style={{ ...S.card, borderColor: selected?.id === char.id ? location.color : '#ffffff11' }}
              onClick={() => setSelected(selected?.id === char.id ? null : char)}
            >
              {/* 이미지 */}
              <div style={S.avatarWrap}>
                {char.imageUrl
                  ? <img src={char.imageUrl} style={S.avatarImg} alt={char.nickname} />
                  : <div style={S.avatarPlaceholder}>👤</div>
                }
              </div>

              {/* 정보 */}
              <div style={S.info}>
                <div style={S.nameRow}>
                  <span style={S.name}>{char.nickname}</span>
                  <span style={{ ...S.badge, background: diffColor(char.married, char.age) }}>
                    {char.age}세 · {marriedLabel[char.married]}
                  </span>
                </div>
                <div style={S.job}>{char.job} · {char.bodyType} · {char.heightCm}cm</div>
                <p style={S.intro}>{char.intro || '소개글 없음'}</p>
                <div style={S.tags}>
                  {(char.interestTags ?? []).slice(0, 3).map(t => (
                    <span key={t} style={S.tag}>{t}</span>
                  ))}
                </div>
              </div>

              {/* 외모 스탯 */}
              <div style={S.stats}>
                {[['얼굴', char.face], ['몸매', char.body], ['패션', char.fashion]].map(([k, v]) => (
                  <div key={k as string} style={S.stat}>
                    <span style={S.statLabel}>{k}</span>
                    <span style={S.statVal}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 접근 버튼 */}
      {selected && (
        <div style={S.bottomBar}>
          <div style={S.bottomInfo}>
            {selected.imageUrl && <img src={selected.imageUrl} style={S.bottomThumb} alt="" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {rejectState ? (
                <>
                  <div style={S.rejectLine}>"{rejectState.line}"</div>
                  <div style={S.rejectSub}>
                    (접근을 위한 궁합 점수가 기준 대비 {rejectState.hurdle - rejectState.score}점 부족합니다)
                  </div>
                  {bypassCountdown > 0 && (
                    <div style={{ color: '#c9a84c', fontSize: 11, marginTop: 4 }}>
                      [TEST] {bypassCountdown}초 후 자동 진입...
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={S.bottomName}>{selected.nickname}</div>
                  <div style={S.bottomMeta}>{selected.job} · {selected.age}세 · {marriedLabel[selected.married]}</div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <button
              style={{ ...S.approachBtn, background: rejectState ? '#555' : location.color }}
              onClick={() => handleApproach(selected)}
            >
              💬 접근하기
            </button>
            {onStartSexScene && (
              <button
                style={{ ...S.approachBtn, background: '#e94560', fontSize: 12, padding: '8px 16px' }}
                onClick={() => setShowPoseSelect(true)}
              >
                ❤️‍🔥 SEX 시작
              </button>
            )}
          </div>
        </div>
      )}

      {/* 포즈 선택 모달 */}
      {showPoseSelect && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: '1px solid #e9456044', borderRadius: 16, padding: 24, width: 280 }}>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>자세 선택</div>
            <div style={{ color: '#ffffff66', fontSize: 12, marginBottom: 16 }}>{selected.nickname}와(과) 어떤 자세로?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {POSES.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setShowPoseSelect(false); onStartSexScene?.(selected, p.key) }}
                  style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid #e9456044', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 20 }}>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPoseSelect(false)} style={{ marginTop: 12, width: '100%', background: 'none', border: '1px solid #ffffff22', borderRadius: 8, padding: '8px 0', color: '#ffffff66', cursor: 'pointer', fontSize: 13 }}>취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: { position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '16px 20px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid #ffffff11' },
  backBtn: { background: 'none', border: '1px solid #ffffff22', color: '#ffffff66', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, marginBottom: 10 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 28 },
  headerDesc: { color: '#ffffff44', fontSize: 13, marginTop: 4 },
  list: { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
  empty: { textAlign: 'center', marginTop: 80 },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid',
    borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center',
    gap: 14, cursor: 'pointer', transition: 'all 0.2s',
  },
  avatarWrap: { width: 72, height: 90, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0d0d1a' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#ffffff22' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  badge: { borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 'bold', color: '#fff', flexShrink: 0 },
  job: { color: '#ffffff66', fontSize: 12, marginBottom: 4 },
  intro: { color: '#ffffff88', fontSize: 12, margin: '0 0 6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' },
  tags: { display: 'flex', gap: 4 },
  tag: { background: 'rgba(255,255,255,0.08)', color: '#ffffff88', borderRadius: 10, padding: '1px 8px', fontSize: 10 },
  stats: { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 },
  stat: { background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 10px', textAlign: 'center' },
  statLabel: { display: 'block', fontSize: 9, color: '#ffffff44' },
  statVal: { display: 'block', fontSize: 13, fontWeight: 'bold', color: '#c9a84c' },
  bottomBar: {
    position: 'sticky', bottom: 0,
    background: 'rgba(13,13,26,0.97)', borderTop: '1px solid #c9a84c33',
    padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  bottomInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  bottomThumb: { width: 44, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #c9a84c44' },
  bottomName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomMeta: { color: '#ffffff66', fontSize: 12 },
  rejectLine: { color: '#e94560', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  rejectSub:  { color: '#ffffff55', fontSize: 11, fontStyle: 'italic' },
  approachBtn: { border: 'none', borderRadius: 8, padding: '12px 24px', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },
}
