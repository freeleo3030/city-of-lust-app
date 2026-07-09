import { useState } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'

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
  onBack: () => void
}

const marriedLabel = { '미혼': '미혼', '기혼': '기혼', '돌싱': '돌싱' }
const diffColor = (married: string, age: number) => {
  if (married === '기혼') return '#e94560'
  if (married === '돌싱') return '#c9a84c'
  if (age >= 40) return '#9c6fe4'
  if (age >= 30) return '#66BB6A'
  return '#64b5f6'
}

export default function LocationPage({ location, femaleChars, onBack }: Props) {
  const [selected, setSelected] = useState<FemaleCharacterData | null>(null)

  const chars = femaleChars.filter(c => c.location === location.name)

  return (
    <div style={S.container}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← 지도로</button>
        <div style={S.headerTitle}>
          <span style={S.headerEmoji}>{location.emoji}</span>
          <span style={{ color: location.color, fontWeight: 'bold', fontSize: 20 }}>{location.name}</span>
        </div>
        <div style={S.headerDesc}>{location.desc}</div>
      </div>

      {/* 여캐 목록 */}
      <div style={S.list}>
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
                  {char.interestTags.slice(0, 3).map(t => (
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
            <div>
              <div style={S.bottomName}>{selected.nickname}</div>
              <div style={S.bottomMeta}>{selected.job} · {selected.age}세 · {marriedLabel[selected.married]}</div>
            </div>
          </div>
          <button style={{ ...S.approachBtn, background: location.color }}>
            접근하기 →
          </button>
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)', display: 'flex', flexDirection: 'column' },
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
  approachBtn: { border: 'none', borderRadius: 8, padding: '12px 24px', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },
}
