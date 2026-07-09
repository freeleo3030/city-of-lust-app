import { useState, useRef, useEffect } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'
import { CONVERSATION_EXPRESSIONS, POSE_EXPRESSIONS, POSES } from '../lib/generateCharImages'

interface Props {
  chars: FemaleCharacterData[]
  onAdd: () => void
  onEdit: (char: FemaleCharacterData) => void
  onDelete: (id: string) => void
  onBack: () => void
  onUpdateChar?: (char: FemaleCharacterData) => void
}

interface PreviewState {
  char: FemaleCharacterData
  tab: 'expression' | 'pose'
}

const marriedLabel: Record<string, string> = { '미혼': '미혼', '기혼': '기혼', '돌싱': '돌싱' }
const diffColor = (married: string, age: number) => {
  if (married === '기혼') return '#e94560'
  if (married === '돌싱') return '#c9a84c'
  if (age >= 40) return '#9c6fe4'
  if (age >= 30) return '#66BB6A'
  return '#64b5f6'
}

export default function CreatorDashboardPage({ chars, onAdd, onEdit, onDelete, onBack, onUpdateChar }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [lbScale, setLbScale] = useState(1)
  const [lbPan, setLbPan] = useState({ x: 0, y: 0 })
  const lbDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const lbWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lbWrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setLbScale(s => { const n = Math.min(4, Math.max(1, s - e.deltaY * 0.003)); if (n === 1) setLbPan({ x: 0, y: 0 }); return n })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [lightbox])

  const openLightbox = (url: string) => { setLightbox(url); setLbScale(1); setLbPan({ x: 0, y: 0 }) }
  const closeLightbox = () => { setLightbox(null); setLbScale(1); setLbPan({ x: 0, y: 0 }) }
  // local copy for preview (gets updated as images come in)
  const [localChars, setLocalChars] = useState<FemaleCharacterData[]>(chars)

  const updateLocal = (updated: FemaleCharacterData) => {
    setLocalChars(prev => prev.map(c => c.id === updated.id ? updated : c))
    onUpdateChar?.(updated)
  }

  const displayChars = localChars.length ? localChars : chars

  return (
    <div style={S.container}>
      <div style={S.inner}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={onBack}>← 뒤로</button>
          <h1 style={S.title}>👑 창조자 대시보드</h1>
          <p style={S.subtitle}>내가 만든 여성 캐릭터 목록</p>
        </div>

        <div style={S.toolbar}>
          <span style={S.count}>총 {chars.length}명 등록됨</span>
          <button style={S.addBtn} onClick={onAdd}>＋ 새 캐릭터 추가</button>
        </div>

        {displayChars.length === 0 ? (
          <div style={S.empty}>
            <p style={{ color: '#ffffff44', fontSize: 16, textAlign: 'center', margin: 0 }}>
              아직 등록된 캐릭터가 없어요.<br />새 캐릭터를 추가해보세요!
            </p>
          </div>
        ) : (
          <div style={S.grid}>
            {displayChars.map(c => (
              <div key={c.id} style={S.card}>
                {/* 이미지 */}
                <div style={S.imgWrap}>
                  {c.imageUrl
                    ? <img src={c.imageUrl} style={{ ...S.img, cursor: 'zoom-in' }} alt={c.nickname} onClick={() => openLightbox(c.imageUrl!)} />
                    : <div style={S.imgPlaceholder}>👤</div>
                  }
                  <span style={{ ...S.diffBadge, background: diffColor(c.married, c.age) }}>
                    {c.age}세 · {marriedLabel[c.married]}
                  </span>
                </div>

                {/* 정보 */}
                <div style={S.info}>
                  <div style={S.nickname}>{c.nickname}</div>
                  <div style={S.meta}>{c.job} · {c.location}</div>
                  <div style={S.meta}>{c.bodyType} · {c.heightCm}cm</div>
                  <p style={S.intro}>{c.intro || '소개글 없음'}</p>

                  {/* 외모 스탯 */}
                  <div style={S.statRow}>
                    {[['얼굴', c.face], ['몸매', c.body], ['패션', c.fashion]].map(([k, v]) => (
                      <div key={k as string} style={S.stat}>
                        <span style={S.statLabel}>{k}</span>
                        <span style={S.statVal}>{v}</span>
                      </div>
                    ))}
                  </div>


                  {/* 미리보기 버튼 */}
                  {(c.expressionImages?.length || c.poseImages) && (
                    <button style={S.previewBtn} onClick={() => setPreview({ char: c, tab: c.expressionImages?.length ? 'expression' : 'pose' })}>
                      🖼 이미지 미리보기
                    </button>
                  )}

                  {/* 등록일 */}
                  <div style={S.date}>{new Date(c.createdAt).toLocaleDateString('ko-KR')}</div>

                  <button style={S.editBtn} onClick={() => onEdit(c)}>✏️ 수정</button>
                  {confirmId === c.id ? (
                    <div style={S.confirmRow}>
                      <span style={{ color: '#e94560', fontSize: 12 }}>정말 삭제?</span>
                      <button style={S.confirmYes} onClick={() => { onDelete(c.id); setConfirmId(null) }}>삭제</button>
                      <button style={S.confirmNo} onClick={() => setConfirmId(null)}>취소</button>
                    </div>
                  ) : (
                    <button style={S.deleteBtn} onClick={() => setConfirmId(c.id)}>🗑 삭제</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 이미지 미리보기 모달 */}
      {preview && (
        <div style={S.modalOverlay} onClick={() => setPreview(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>{preview.char.nickname} — 이미지 갤러리</span>
              <button style={S.modalClose} onClick={() => setPreview(null)}>✕</button>
            </div>
            {/* 탭 */}
            <div style={S.tabs}>
              <button style={{ ...S.tab, ...(preview.tab === 'expression' ? S.tabActive : {}) }} onClick={() => setPreview(p => p ? { ...p, tab: 'expression' } : null)}>
                😊 표정 ({preview.char.expressionImages?.filter(Boolean).length ?? 0}/5)
              </button>
              <button style={{ ...S.tab, ...(preview.tab === 'pose' ? S.tabActive : {}) }} onClick={() => setPreview(p => p ? { ...p, tab: 'pose' } : null)}>
                🔥 자세 ({Object.entries(preview.char.poseImages ?? {}).filter(([k,v]) => /_(aroused|climax)$/.test(k) && Boolean(v)).length}/8)
              </button>
            </div>

            {preview.tab === 'expression' ? (
              <div style={S.imgGrid}>
                {CONVERSATION_EXPRESSIONS.map((lv, i) => {
                  const url = preview.char.expressionImages?.[i]
                  return (
                    <div key={i} style={S.thumbWrap}>
                      {url
                        ? <img src={url} style={{ ...S.thumb, cursor: 'pointer' }} alt={lv.label} onClick={() => openLightbox(url)} />
                        : <div style={S.thumbEmpty}>⏳</div>}
                      <div style={S.thumbLabel}>{lv.label}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={S.imgGrid}>
                {POSES.flatMap(p => POSE_EXPRESSIONS.map(e => {
                  const key = `${p.key}_${e.key}`
                  const url = preview.char.poseImages?.[key]
                  return (
                    <div key={key} style={S.thumbWrap}>
                      {url
                        ? <img src={url} style={{ ...S.thumb, cursor: 'pointer' }} alt={`${p.label} · ${e.label}`} onClick={() => openLightbox(url)} />
                        : <div style={S.thumbEmpty}>⏳</div>}
                      <div style={S.thumbLabel}>{p.label} · {e.label}</div>
                    </div>
                  )
                }))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <div style={S.lightboxOverlay} onClick={closeLightbox}>
          <div
            ref={lbWrapRef}
            style={{ position: 'relative', overflow: 'hidden', width: Math.min(window.innerWidth * 0.9, 600), height: Math.min(window.innerHeight * 0.88, 800), borderRadius: 12, cursor: lbDragRef.current ? 'grabbing' : 'grab', userSelect: 'none' }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => {
              if (e.button !== 0) return
              lbDragRef.current = { startX: e.clientX, startY: e.clientY, panX: lbPan.x, panY: lbPan.y }
              const onMove = (ev: MouseEvent) => {
                if (!lbDragRef.current) return
                setLbPan({ x: lbDragRef.current.panX + ev.clientX - lbDragRef.current.startX, y: lbDragRef.current.panY + ev.clientY - lbDragRef.current.startY })
              }
              const onUp = () => {
                lbDragRef.current = null
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
                setLbPan({ x: 0, y: 0 })
                setLbScale(1)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          >
            <img src={lightbox} draggable={false} alt="확대 이미지"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, transform: `translate(${lbPan.x}px, ${lbPan.y}px) scale(${lbScale})`, transformOrigin: 'center', transition: lbDragRef.current ? 'none' : 'transform 0.05s' }} />
          </div>
          <div style={{ color: '#ffffff44', fontSize: 12, marginTop: 10 }}>휠: 확대/축소 · 드래그 후 놓으면 원위치 · 바깥 클릭으로 닫기</div>
          <button style={S.lightboxClose} onClick={closeLightbox}>✕</button>
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)', padding: '24px 16px' },
  inner: { maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { textAlign: 'center', padding: '8px 0 4px' },
  backBtn: { background: 'none', border: '1px solid #ffffff33', borderRadius: 8, color: '#ffffff88', padding: '6px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 8 },
  title: { color: '#c9a84c', fontSize: 24, fontWeight: 'bold', margin: '0 0 4px' },
  subtitle: { color: '#ffffff44', fontSize: 13, margin: 0 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  count: { color: '#ffffff66', fontSize: 13 },
  addBtn: { background: 'linear-gradient(135deg, #c9a84c, #e94560)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' },
  empty: { padding: '60px 0', display: 'flex', justifyContent: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid #ffffff11', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  imgWrap: { position: 'relative', height: 300, background: '#0d0d1a' },
  img: { width: '100%', height: '100%', objectFit: 'contain' },
  imgPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: '#ffffff22' },
  diffBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 'bold', color: '#fff' },
  info: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  nickname: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  meta: { fontSize: 12, color: '#ffffff66' },
  intro: { fontSize: 12, color: '#ffffff88', margin: '4px 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  statRow: { display: 'flex', gap: 8, marginTop: 4 },
  stat: { flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 0', textAlign: 'center' },
  statLabel: { display: 'block', fontSize: 10, color: '#ffffff44' },
  statVal: { display: 'block', fontSize: 14, fontWeight: 'bold', color: '#c9a84c' },
  previewBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22', borderRadius: 6, color: '#ffffff88', padding: '5px 0', cursor: 'pointer', fontSize: 11, marginTop: 2 },
  date: { fontSize: 11, color: '#ffffff33', marginTop: 2 },
  editBtn: { marginTop: 4, background: 'none', border: '1px solid #c9a84c55', borderRadius: 6, color: '#c9a84c', padding: '5px 0', cursor: 'pointer', fontSize: 12 },
  deleteBtn: { marginTop: 4, background: 'none', border: '1px solid #e9456033', borderRadius: 6, color: '#e9456088', padding: '5px 0', cursor: 'pointer', fontSize: 12 },
  confirmRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  confirmYes: { background: '#e94560', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  confirmNo: { background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  // 모달
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#1a0a2e', border: '1px solid #c9a84c44', borderRadius: 16, width: '90vw', maxWidth: 760, maxHeight: '90vh', overflow: 'auto', padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#c9a84c', fontWeight: 'bold', fontSize: 18 },
  modalClose: { background: 'none', border: 'none', color: '#ffffff88', fontSize: 20, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #ffffff22', borderRadius: 8, color: '#ffffff66', padding: '8px', cursor: 'pointer', fontSize: 13 },
  tabActive: { background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c66', color: '#c9a84c' },
  imgGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 },
  thumbWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  thumb: { width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, border: '1px solid #ffffff11' },
  thumbEmpty: { width: '100%', aspectRatio: '3/4', background: '#0d0d1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#ffffff22' },
  thumbLabel: { textAlign: 'center', color: '#ffffff66', fontSize: 11 },
  lightboxOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  lightboxImg: { maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 0 60px rgba(0,0,0,0.8)' },
  lightboxClose: { position: 'fixed', top: 24, right: 32, background: 'none', border: '1px solid #ffffff44', borderRadius: '50%', color: '#fff', fontSize: 20, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
