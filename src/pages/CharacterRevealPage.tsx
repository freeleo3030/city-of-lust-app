import { useState } from 'react'
import { generateMaleProfileImage } from '../lib/generateCharImages'
import { useScale } from '../hooks/useScale'

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

function StatRow({ label, value, color, scale }: { label: string; value: number; color: string; scale: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: scale * 10 }}>
      <span style={{ color: '#ffffff88', fontSize: scale * 12, width: scale * 70, flexShrink: 0, textAlign: 'right' as const }}>{label}</span>
      <div style={{ flex: 1, height: scale * 6, background: 'rgba(255,255,255,0.08)', borderRadius: scale * 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: scale * 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: scale * 14, fontWeight: 'bold', width: scale * 28, textAlign: 'right' as const, flexShrink: 0, color }}>{value}</span>
    </div>
  )
}

export default function CharacterRevealPage({
  character,
  onEnter,
  onBack,
  onDelete,
}: {
  character: CharacterData
  onEnter: () => void
  onBack: () => void
  onDelete?: () => void
}) {
  const scale = useScale()
  const s = (n: number) => n * scale

  const MAX_IMAGES = 5
  const [images, setImages] = useState<string[]>(
    character.generatedImageUrl ? [character.generatedImageUrl] : []
  )
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [enlarged, setEnlarged] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    if (activeImage) character.generatedImageUrl = activeImage
    onEnter()
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
      objectFit: 'contain', borderRadius: s(12),
      border: '2px solid #c9a84c55',
    },
    overlayHint: { color: '#ffffff44', fontSize: s(12), marginTop: s(12) },
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: s(24),
    },
    card: {
      background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c44',
      borderRadius: s(20), padding: `${s(36)}px ${s(32)}px`, width: s(480), maxWidth: '100%', zoom: 0.8,
    },
    subtitle: { color: '#ffffff55', fontSize: s(13), margin: '0 0 4px', textAlign: 'center' },
    title: { color: '#c9a84c', fontSize: s(30), fontWeight: 'bold', margin: '0 0 4px', textAlign: 'center' },
    intro: { color: '#ffffff88', fontSize: s(13), textAlign: 'center', fontStyle: 'italic', margin: `0 0 ${s(20)}px` },
    illustBox: {
      background: 'rgba(0,0,0,0.3)', border: '1px solid #ffffff11',
      borderRadius: s(16), padding: `${s(20)}px ${s(16)}px`, marginBottom: s(24),
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s(8),
    },
    avatarEmoji: { fontSize: s(72) },
    generatedImage: {
      width: s(220), height: s(280), objectFit: 'cover',
      borderRadius: s(12), border: '2px solid #c9a84c55',
    },
    illustMeta: { color: '#ffffff88', fontSize: s(13) },
    thumbRow: { display: 'flex', gap: s(8), marginTop: s(4) },
    thumb: {
      width: s(60), height: s(76), objectFit: 'cover',
      borderRadius: s(8), cursor: 'pointer',
    },
    regenBtn: {
      marginTop: s(4),
      background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c55',
      color: '#c9a84c', borderRadius: s(8), padding: `${s(7)}px ${s(16)}px`,
      fontSize: s(13), cursor: 'pointer',
    },
    confirmBox: {
      background: '#1a1a2e', border: '1px solid #c9a84c55',
      borderRadius: s(16), padding: `${s(28)}px ${s(24)}px`, width: s(300),
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s(12),
    },
    confirmTitle: { color: '#c9a84c', fontSize: s(15), fontWeight: 'bold', margin: 0, textAlign: 'center' as const },
    confirmPreview: { width: s(140), height: s(178), objectFit: 'cover', borderRadius: s(10), border: '2px solid #c9a84c44' },
    confirmSub: { color: '#ffffff55', fontSize: s(12), margin: 0 },
    confirmBtns: { display: 'flex', gap: s(10), width: '100%' },
    confirmCancelBtn: {
      flex: 1, background: 'transparent', border: '1px solid #ffffff33',
      color: '#ffffff88', borderRadius: s(8), padding: `${s(10)}px`, fontSize: s(13), cursor: 'pointer',
    },
    confirmOkBtn: {
      flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)',
      color: '#fff', border: 'none', borderRadius: s(8), padding: `${s(10)}px`,
      fontSize: s(13), fontWeight: 'bold', cursor: 'pointer',
    },
    levelRow: { display: 'flex', gap: s(12), marginBottom: s(20) },
    levelBadge: {
      flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
      borderRadius: s(10), padding: `${s(10)}px ${s(14)}px`, color: '#ffffff88', fontSize: s(13), textAlign: 'center' as const,
    },
    lv: { color: '#c9a84c', fontWeight: 'bold', marginLeft: s(6) },
    section: { marginBottom: s(20) },
    sectionHeader: {
      color: '#c9a84c', fontSize: s(13), fontWeight: 'bold',
      borderBottom: '1px solid #c9a84c33', paddingBottom: s(8), marginBottom: s(12),
    },
    statGrid: { display: 'flex', flexDirection: 'column', gap: s(8) },
    btnRow: { display: 'flex', gap: s(12), marginTop: s(28) },
    backBtn: {
      flex: '0 0 auto', background: 'transparent', border: '1px solid #ffffff33',
      color: '#ffffff88', borderRadius: s(10), padding: `${s(14)}px ${s(20)}px`, fontSize: s(14), cursor: 'pointer',
    },
    enterBtn: {
      flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)',
      color: '#fff', border: 'none', borderRadius: s(10), padding: `${s(14)}px`,
      fontSize: s(15), fontWeight: 'bold', cursor: 'pointer',
    },
  }

  return (
    <div style={styles.container}>
      {enlarged && activeImage && (
        <div style={styles.overlay} onClick={() => setEnlarged(false)}>
          <img src={activeImage} alt={character.nickname} style={styles.enlargedImage} />
          <div style={styles.overlayHint}>클릭하면 닫힙니다</div>
        </div>
      )}

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

          {finalized && activeImage && (
            <div style={{ color: '#c9a84c88', fontSize: s(11), marginTop: s(4) }}>✅ 대표 이미지 확정됨</div>
          )}

          {activeImage && !finalized && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s(4) }}>
              <button
                style={{ ...styles.regenBtn, opacity: (regenerating || images.length >= MAX_IMAGES) ? 0.5 : 1 }}
                onClick={handleRegenerate}
                disabled={regenerating || images.length >= MAX_IMAGES}
              >
                {regenerating ? '⏳ 생성 중...' : `🔄 이미지 재생성 (${images.length}/${MAX_IMAGES})`}
              </button>
              {images.length >= MAX_IMAGES && (
                <span style={{ color: '#ffffff44', fontSize: s(11) }}>최대 {MAX_IMAGES}장까지 생성 가능</span>
              )}
            </div>
          )}
        </div>

        <div style={styles.levelRow}>
          <div style={styles.levelBadge}>💬 호감도 <span style={styles.lv}>Lv.1</span></div>
          <div style={styles.levelBadge}>🔥 테크닉 <span style={styles.lv}>Lv.1</span></div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>💬 데이트 스탯</div>
          <div style={styles.statGrid}>
            <StatRow label="얼굴" value={character.face} color="#FF6B9D" scale={scale} />
            <StatRow label="키" value={character.height} color="#4FC3F7" scale={scale} />
            <StatRow label="몸매" value={character.body} color="#FF5722" scale={scale} />
            <StatRow label="패션" value={character.fashion} color="#c9a84c" scale={scale} />
            <StatRow label="지적능력" value={character.intellect} color="#4FC3F7" scale={scale} />
            <StatRow label="유머능력" value={character.humor} color="#FF9800" scale={scale} />
            <StatRow label="덕성" value={character.virtue} color="#66BB6A" scale={scale} />
            <StatRow label="매너" value={character.manner} color="#CE93D8" scale={scale} />
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>🔥 성교 스탯</div>
          <div style={styles.statGrid}>
            <StatRow label="성기 길이" value={character.penisSize} color="#e94560" scale={scale} />
            <StatRow label="성기 두께" value={character.penisGirth} color="#AB47BC" scale={scale} />
            <StatRow label="발기력" value={character.erectPower} color="#FF6B9D" scale={scale} />
            <StatRow label="지속력" value={character.erectDuration} color="#FF9800" scale={scale} />
            <StatRow label="단단함" value={character.erectHardness} color="#c9a84c" scale={scale} />
            <StatRow label="테크닉" value={character.erectTechnique} color="#64B5F6" scale={scale} />
          </div>
        </div>

        <div style={styles.btnRow}>
          <button style={styles.backBtn} onClick={onBack}>← 수정하기</button>
          <button style={styles.enterBtn} onClick={handleEnter}>루스트 시티 입장 →</button>
        </div>
        {onDelete && (
          <div style={{ textAlign: 'center', marginTop: s(8) }}>
            {confirmDelete ? (
              <div style={{ background: 'rgba(233,69,96,0.08)', border: '1px solid #e9456044', borderRadius: s(12), padding: `${s(12)}px ${s(16)}px`, display: 'inline-block' }}>
                <div style={{ color: '#e94560', fontSize: s(13), marginBottom: s(10), lineHeight: 1.6 }}>
                  삭제하면 다시 이 캐릭터를<br/>사용할 수 없습니다.<br/>그래도 삭제하시겠습니까?
                </div>
                <div style={{ display: 'flex', gap: s(8), justifyContent: 'center' }}>
                  <button onClick={onDelete} style={{ background: '#e94560', border: 'none', borderRadius: s(8), color: '#fff', padding: `${s(7)}px ${s(20)}px`, cursor: 'pointer', fontSize: s(13), fontWeight: 'bold' }}>삭제</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: s(8), color: '#fff', padding: `${s(7)}px ${s(16)}px`, cursor: 'pointer', fontSize: s(13) }}>취소</button>
                </div>
              </div>
            ) : (
              <button
                style={{ background: 'none', border: 'none', color: '#ffffff33', fontSize: s(12), cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setConfirmDelete(true)}
              >
                🗑️ 캐릭터 삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
