import { useState } from 'react'
import { generateMaleProfileImage } from '../lib/generateCharImages'

interface CharacterData {
  nickname: string
  job: string
  intro: string
  age: number
  face: number; height: number; body: number; fashion: number
  penisSize: number; penisGirth: number
  erectPower: number; erectDuration: number; erectHardness: number; erectTechnique: number
  intellect: number; humor: number; virtue: number; manner: number
  avatar?: number
  generatedImageUrl?: string
  appearanceDesc?: string
}

const AVATARS = ['🧑', '👨', '🧔', '👱']
const HEIGHT_CM = (h: number) => Math.round(160 + (h / 100) * 40) + 'cm'

export default function CharacterRevealPage({
  character,
  onEnter,
  onBack,
}: {
  character: CharacterData
  onEnter: () => void
  onBack: () => void
}) {
  const MAX_IMAGES = 5
  const [images, setImages] = useState<string[]>(
    character.generatedImageUrl ? [character.generatedImageUrl] : []
  )
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [enlarged, setEnlarged] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [finalized, setFinalized] = useState(images.length === 1)

  const activeImage = images[selectedIdx]

  const handleRegenerate = async () => {
    if (images.length >= MAX_IMAGES) return
    setRegenerating(true)
    try {
      const newUrl = await generateMaleProfileImage({
        nickname: character.nickname,
        age: character.age,
        job: character.job,
        face: character.face,
        height: character.height,
        body: character.body,
        fashion: character.fashion,
        appearanceDesc: character.appearanceDesc,
      })
      setImages(prev => {
        const next = [...prev, newUrl]
        setSelectedIdx(next.length - 1)
        return next
      })
    } catch (e) {
      console.error('재생성 실패:', e)
    }
    setRegenerating(false)
  }

  const handleSelectThumb = (i: number) => {
    setSelectedIdx(i)
    if (images.length > 1) setConfirming(true)
  }

  const handleConfirmSelect = () => {
    const chosen = images[selectedIdx]
    setImages([chosen])
    setSelectedIdx(0)
    setConfirming(false)
    setFinalized(true)
  }

  const handleEnter = () => {
    // 선택된 이미지를 character에 반영해서 입장
    if (activeImage) character.generatedImageUrl = activeImage
    onEnter()
  }

  return (
    <div style={styles.container}>
      {/* 확대 모달 */}
      {enlarged && activeImage && (
        <div style={styles.overlay} onClick={() => setEnlarged(false)}>
          <img src={activeImage} alt={character.nickname} style={styles.enlargedImage} />
          <div style={styles.overlayHint}>클릭하면 닫힙니다</div>
        </div>
      )}

      {/* 최종 선택 확인 모달 */}
      {confirming && (
        <div style={styles.overlay} onClick={() => setConfirming(false)}>
          <div style={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmTitle}>이 이미지로 최종 선택할까요?</p>
            <img src={activeImage} style={styles.confirmPreview} alt="선택" />
            <p style={styles.confirmSub}>나머지 {images.length - 1}장은 삭제됩니다.</p>
            <div style={styles.confirmBtns}>
              <button style={styles.confirmCancelBtn} onClick={() => setConfirming(false)}>취소</button>
              <button style={styles.confirmOkBtn} onClick={handleConfirmSelect}>✅ 이걸로 선택</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <p style={styles.subtitle}>당신의 캐릭터가 완성되었습니다</p>
        <h1 style={styles.title}>{character.nickname}</h1>
        <p style={styles.intro}>"{character.intro}"</p>

        {/* 일러스트 */}
        <div style={styles.illustBox}>
          {activeImage ? (
            <img
              src={activeImage}
              alt={character.nickname}
              style={{ ...styles.generatedImage, cursor: 'zoom-in' }}
              onClick={() => setEnlarged(true)}
            />
          ) : (
            <span style={styles.avatarEmoji}>{AVATARS[character.avatar ?? 0]}</span>
          )}
          <div style={styles.illustMeta}>{character.age}세 · {character.job} · {HEIGHT_CM(character.height)}</div>

          {/* 썸네일 선택 (2장 이상일 때) */}
          {images.length > 1 && (
            <div style={styles.thumbRow}>
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`ver${i + 1}`}
                  onClick={() => handleSelectThumb(i)}
                  style={{
                    ...styles.thumb,
                    border: i === selectedIdx ? '2px solid #c9a84c' : '2px solid #ffffff22',
                  }}
                />
              ))}
            </div>
          )}

          {/* 최종 확정 표시 */}
          {finalized && activeImage && (
            <div style={{ color: '#c9a84c88', fontSize: 11, marginTop: 4 }}>✅ 대표 이미지 확정됨</div>
          )}

          {/* 재생성 버튼 */}
          {activeImage && !finalized && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button
                style={{ ...styles.regenBtn, opacity: (regenerating || images.length >= MAX_IMAGES) ? 0.5 : 1 }}
                onClick={handleRegenerate}
                disabled={regenerating || images.length >= MAX_IMAGES}
              >
                {regenerating ? '⏳ 생성 중...' : `🔄 이미지 재생성 (${images.length}/${MAX_IMAGES})`}
              </button>
              {images.length >= MAX_IMAGES && (
                <span style={{ color: '#ffffff44', fontSize: 11 }}>최대 {MAX_IMAGES}장까지 생성 가능</span>
              )}
            </div>
          )}
        </div>

        {/* 레벨 */}
        <div style={styles.levelRow}>
          <div style={styles.levelBadge}>💬 호감도 <span style={styles.lv}>Lv.1</span></div>
          <div style={styles.levelBadge}>🔥 테크닉 <span style={styles.lv}>Lv.1</span></div>
        </div>

        {/* 데이트 스탯 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>💬 데이트 스탯</div>
          <div style={styles.statGrid}>
            <StatRow label="얼굴" value={character.face} color="#FF6B9D" />
            <StatRow label="키" value={character.height} color="#4FC3F7" />
            <StatRow label="몸매" value={character.body} color="#FF5722" />
            <StatRow label="패션" value={character.fashion} color="#c9a84c" />
            <StatRow label="지적능력" value={character.intellect} color="#4FC3F7" />
            <StatRow label="유머능력" value={character.humor} color="#FF9800" />
            <StatRow label="덕성" value={character.virtue} color="#66BB6A" />
            <StatRow label="매너" value={character.manner} color="#CE93D8" />
          </div>
        </div>

        {/* 성교 스탯 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>🔥 성교 스탯</div>
          <div style={styles.statGrid}>
            <StatRow label="성기 길이" value={character.penisSize} color="#e94560" />
            <StatRow label="성기 두께" value={character.penisGirth} color="#AB47BC" />
            <StatRow label="발기력" value={character.erectPower} color="#FF6B9D" />
            <StatRow label="지속력" value={character.erectDuration} color="#FF9800" />
            <StatRow label="단단함" value={character.erectHardness} color="#c9a84c" />
            <StatRow label="테크닉" value={character.erectTechnique} color="#64B5F6" />
          </div>
        </div>

        <div style={styles.btnRow}>
          <button style={styles.backBtn} onClick={onBack}>← 수정하기</button>
          <button style={styles.enterBtn} onClick={handleEnter}>루스트 시티 입장 →</button>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <div style={styles.barWrap}>
        <div style={{ ...styles.bar, width: `${value}%`, background: color }} />
      </div>
      <span style={{ ...styles.statVal, color }}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'zoom-out',
  },
  enlargedImage: {
    maxWidth: '90vw', maxHeight: '85vh',
    objectFit: 'contain', borderRadius: 12,
    border: '2px solid #c9a84c55',
  },
  overlayHint: { color: '#ffffff44', fontSize: 12, marginTop: 12 },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c44',
    borderRadius: 20, padding: '36px 32px', width: 480, maxWidth: '100%',
  },
  subtitle: { color: '#ffffff55', fontSize: 13, margin: '0 0 4px', textAlign: 'center' },
  title: { color: '#c9a84c', fontSize: 30, fontWeight: 'bold', margin: '0 0 4px', textAlign: 'center' },
  intro: { color: '#ffffff88', fontSize: 13, textAlign: 'center', fontStyle: 'italic', margin: '0 0 20px' },
  illustBox: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid #ffffff11',
    borderRadius: 16, padding: '20px 16px', marginBottom: 24,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  avatarEmoji: { fontSize: 72 },
  generatedImage: {
    width: 220, height: 280, objectFit: 'cover',
    borderRadius: 12, border: '2px solid #c9a84c55',
  },
  illustMeta: { color: '#ffffff88', fontSize: 13 },
  thumbRow: { display: 'flex', gap: 8, marginTop: 4 },
  thumb: {
    width: 60, height: 76, objectFit: 'cover',
    borderRadius: 8, cursor: 'pointer',
  },
  regenBtn: {
    marginTop: 4,
    background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c55',
    color: '#c9a84c', borderRadius: 8, padding: '7px 16px',
    fontSize: 13, cursor: 'pointer',
  },
  confirmBox: {
    background: '#1a1a2e', border: '1px solid #c9a84c55',
    borderRadius: 16, padding: '28px 24px', width: 300,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  confirmTitle: { color: '#c9a84c', fontSize: 15, fontWeight: 'bold', margin: 0, textAlign: 'center' as const },
  confirmPreview: { width: 140, height: 178, objectFit: 'cover', borderRadius: 10, border: '2px solid #c9a84c44' },
  confirmSub: { color: '#ffffff55', fontSize: 12, margin: 0 },
  confirmBtns: { display: 'flex', gap: 10, width: '100%' },
  confirmCancelBtn: {
    flex: 1, background: 'transparent', border: '1px solid #ffffff33',
    color: '#ffffff88', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer',
  },
  confirmOkBtn: {
    flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)',
    color: '#fff', border: 'none', borderRadius: 8, padding: '10px',
    fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
  },
  levelRow: { display: 'flex', gap: 12, marginBottom: 20 },
  levelBadge: {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
    borderRadius: 10, padding: '10px 14px', color: '#ffffff88', fontSize: 13, textAlign: 'center' as const,
  },
  lv: { color: '#c9a84c', fontWeight: 'bold', marginLeft: 6 },
  section: { marginBottom: 20 },
  sectionHeader: {
    color: '#c9a84c', fontSize: 13, fontWeight: 'bold',
    borderBottom: '1px solid #c9a84c33', paddingBottom: 8, marginBottom: 12,
  },
  statGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  statRow: { display: 'flex', alignItems: 'center', gap: 10 },
  statLabel: { color: '#ffffff88', fontSize: 12, width: 70, flexShrink: 0, textAlign: 'right' },
  barWrap: { flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  statVal: { fontSize: 14, fontWeight: 'bold', width: 28, textAlign: 'right', flexShrink: 0 },
  btnRow: { display: 'flex', gap: 12, marginTop: 28 },
  backBtn: {
    flex: '0 0 auto', background: 'transparent', border: '1px solid #ffffff33',
    color: '#ffffff88', borderRadius: 10, padding: '14px 20px', fontSize: 14, cursor: 'pointer',
  },
  enterBtn: {
    flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '14px',
    fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
  },
}
