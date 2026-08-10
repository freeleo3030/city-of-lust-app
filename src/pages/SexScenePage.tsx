import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Tool = 'hand' | 'lips' | 'tongue' | 'finger' | 'toy'
type ScenePhase = 'foreplay' | 'aroused' | 'climax' | 'afterglow'
type ErogenousKey = 'breast' | 'neckEar' | 'thigh' | 'clitoris' | 'vagina' | 'anal' | 'mouth'

interface BodyZone {
  key: ErogenousKey
  label: string
  cx: number   // % of image width
  cy: number   // % of image height
  rx: number   // ellipse radius x %
  ry: number   // ellipse radius y %
  color: string
}

// ─── 핫스팟 좌표 (포즈별) ────────────────────────────────────────────────────
// 이미지 기준 % 좌표, 포즈 구도에 맞게 설정

const HOTSPOTS: Record<string, BodyZone[]> = {
  missionary: [
    { key: 'mouth',    label: '입',      cx: 50, cy: 7,  rx: 8,  ry: 5,  color: '#ff6b9d' },
    { key: 'neckEar',  label: '목',      cx: 50, cy: 14, rx: 7,  ry: 4,  color: '#c77dff' },
    { key: 'breast',   label: '가슴',    cx: 50, cy: 33, rx: 22, ry: 14, color: '#ff6b9d' },
    { key: 'thigh',    label: '허벅지L', cx: 22, cy: 72, rx: 14, ry: 12, color: '#f77f00' },
    { key: 'thigh',    label: '허벅지R', cx: 78, cy: 72, rx: 14, ry: 12, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 60, rx: 10, ry: 6, color: '#e94560' },
    { key: 'vagina',   label: '질',      cx: 50, cy: 67, rx: 9,  ry: 5,  color: '#e94560' },
  ],
  doggy: [
    { key: 'anal',     label: '항문',    cx: 50, cy: 43, rx: 7,  ry: 5,  color: '#c9a84c' },
    { key: 'vagina',   label: '질',      cx: 50, cy: 55, rx: 10, ry: 6,  color: '#e94560' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 62, rx: 8, ry: 5, color: '#e94560' },
    { key: 'thigh',    label: '허벅지L', cx: 20, cy: 72, rx: 13, ry: 11, color: '#f77f00' },
    { key: 'thigh',    label: '허벅지R', cx: 80, cy: 72, rx: 13, ry: 11, color: '#f77f00' },
    { key: 'neckEar',  label: '허리',    cx: 50, cy: 22, rx: 18, ry: 8,  color: '#c77dff' },
    { key: 'breast',   label: '가슴',    cx: 50, cy: 33, rx: 15, ry: 10, color: '#ff6b9d' },
  ],
  cowgirl: [
    { key: 'mouth',    label: '입',      cx: 50, cy: 8,  rx: 8,  ry: 5,  color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',    cx: 50, cy: 37, rx: 22, ry: 16, color: '#ff6b9d' },
    { key: 'neckEar',  label: '목',      cx: 50, cy: 17, rx: 7,  ry: 4,  color: '#c77dff' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 68, rx: 10, ry: 6, color: '#e94560' },
    { key: 'vagina',   label: '질',      cx: 50, cy: 75, rx: 9,  ry: 5,  color: '#e94560' },
    { key: 'thigh',    label: '허벅지L', cx: 18, cy: 70, rx: 13, ry: 18, color: '#f77f00' },
    { key: 'thigh',    label: '허벅지R', cx: 82, cy: 70, rx: 13, ry: 18, color: '#f77f00' },
  ],
  side: [
    { key: 'breast',   label: '가슴',    cx: 50, cy: 32, rx: 22, ry: 14, color: '#ff6b9d' },
    { key: 'mouth',    label: '입',      cx: 50, cy: 7,  rx: 8,  ry: 5,  color: '#ff6b9d' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 58, rx: 10, ry: 6, color: '#e94560' },
    { key: 'vagina',   label: '질',      cx: 50, cy: 65, rx: 9,  ry: 5,  color: '#e94560' },
    { key: 'anal',     label: '항문',    cx: 50, cy: 72, rx: 7,  ry: 5,  color: '#c9a84c' },
    { key: 'thigh',    label: '허벅지L', cx: 18, cy: 68, rx: 13, ry: 14, color: '#f77f00' },
    { key: 'thigh',    label: '허벅지R', cx: 82, cy: 68, rx: 13, ry: 14, color: '#f77f00' },
  ],
}

// ─── 도구 설정 ───────────────────────────────────────────────────────────────

const TOOLS: { key: Tool; label: string; mult: number; emoji: string }[] = [
  { key: 'hand',   label: '손',    mult: 1.0, emoji: '🖐️' },
  { key: 'lips',   label: '입술',  mult: 1.2, emoji: '💋' },
  { key: 'tongue', label: '혀',    mult: 1.5, emoji: '👅' },
  { key: 'finger', label: '손가락', mult: 1.3, emoji: '☝️' },
  { key: 'toy',    label: '도구',  mult: 2.0, emoji: '🔮' },
]

// ─── 스프라이트 애니메이션 ───────────────────────────────────────────────────

function SpriteAnimation({ urls, fps = 4, style }: { urls: string[]; fps?: number; style?: React.CSSProperties }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!urls || urls.length < 2) return
    const id = setInterval(() => setFrame(f => (f + 1) % urls.length), 1000 / fps)
    return () => clearInterval(id)
  }, [urls, fps])
  if (!urls?.length) return null
  return <img src={urls[frame]} style={style} alt="" draggable={false} />
}

// ─── 게이지 컴포넌트 ─────────────────────────────────────────────────────────

function ArousalGauge({ value, max = 100, label, color, flash }: {
  value: number; max?: number; label: string; color: string; flash?: boolean
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#ffffff88', fontWeight: 'bold' }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 'bold' }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 10, background: '#ffffff11', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 5,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.3s ease',
          boxShadow: flash ? `0 0 8px ${color}` : 'none',
        }} />
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function SexScenePage({
  femaleChar,
  poseKey,
  maleChar,
  onEnd,
}: {
  femaleChar: FemaleCharacterData
  poseKey: string
  maleChar: any
  onEnd: (result: 'success' | 'fail') => void
}) {
  const [femaleArousal, setFemaleArousal] = useState(0)
  const [maleArousal, setMaleArousal] = useState(0)
  const [phase, setPhase] = useState<ScenePhase>('foreplay')
  const [tool, setTool] = useState<Tool>('hand')
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null)
  const [femaleFlash, setFemaleFlash] = useState(false)
  const [maleFlash, setMaleFlash] = useState(false)
  const [ended, setEnded] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 포즈 이미지 URL 추출
  const poseImages = femaleChar.poseImages ?? {}
  const arousedImg = poseImages[`${poseKey}_aroused`] ?? ''
  const climaxImg  = poseImages[`${poseKey}_climax`]  ?? ''

  // 스프라이트 URL 추출
  const spriteUrls: string[] = [0, 1, 2]
    .map(i => poseImages[`${poseKey}_aroused_sprite_${i}`] ?? poseImages[`${poseKey}_sprite_${i}`] ?? '')
    .filter(Boolean)

  // 나이 배율
  const age = femaleChar.age ?? 25
  const ageMult = age < 30 ? 0.8 : age < 40 ? 1.0 : 1.5

  // 도구 배율
  const toolMult = TOOLS.find(t => t.key === tool)?.mult ?? 1.0

  // 흥분도에 따른 페이즈 결정
  useEffect(() => {
    if (femaleArousal >= 100 && !ended) {
      setPhase('climax')
      setEnded(true)
      setTimeout(() => onEnd('success'), 3000)
    } else if (femaleArousal >= 30 && phase === 'foreplay') {
      setPhase('aroused')
    }
  }, [femaleArousal, phase, ended, onEnd])

  useEffect(() => {
    if (maleArousal >= 100 && !ended) {
      setEnded(true)
      setTimeout(() => onEnd('fail'), 2000)
    }
  }, [maleArousal, ended, onEnd])

  // 남캐 흥분도 자동 증가 (30초마다 약 10 상승)
  useEffect(() => {
    if (ended) return
    const id = setInterval(() => {
      setMaleArousal(prev => {
        const next = prev + 3
        setMaleFlash(true)
        setTimeout(() => setMaleFlash(false), 300)
        return next
      })
    }, 3000)
    return () => clearInterval(id)
  }, [ended])

  // 핫스팟 클릭
  const handleZoneClick = useCallback((zone: BodyZone) => {
    if (ended || phase === 'climax') return
    const sensitivity = femaleChar.erogenous?.[zone.key] ?? 2
    const gain = Math.max(1, sensitivity) * toolMult * ageMult * 4
    setFemaleArousal(prev => Math.min(100, prev + gain))
    setFemaleFlash(true)
    setTimeout(() => setFemaleFlash(false), 300)

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    const gainText = sensitivity === 0 ? '반응 없음' : `+${Math.round(gain)}`
    setFeedback({
      text: `${zone.label} ${gainText}`,
      color: sensitivity >= 4 ? '#e94560' : sensitivity >= 2 ? '#c9a84c' : '#ffffff66',
    })
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1500)
  }, [ended, phase, femaleChar.erogenous, toolMult, ageMult])

  const hotspots = HOTSPOTS[poseKey] ?? HOTSPOTS['missionary']

  // 현재 표시할 이미지/스프라이트
  const showSprite = phase === 'aroused' && spriteUrls.length >= 2
  const showClimax = phase === 'climax'

  const imgSrc = showClimax ? climaxImg : arousedImg

  return (
    <div style={{
      background: '#0d0d1a', minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', userSelect: 'none',
    }}>

      {/* 상단 게이지 */}
      <div style={{ width: '100%', maxWidth: 480, padding: '12px 16px 8px', display: 'flex', gap: 12 }}>
        <ArousalGauge value={femaleArousal} label="💗 흥분도" color="#e94560" flash={femaleFlash} />
        <ArousalGauge value={maleArousal}   label="💙 남캐"   color="#4a90e2" flash={maleFlash} />
      </div>

      {/* 페이즈 텍스트 */}
      <div style={{ color: '#ffffff44', fontSize: 11, marginBottom: 6, letterSpacing: 2 }}>
        {phase === 'foreplay' ? '전희' : phase === 'aroused' ? '흥분' : phase === 'climax' ? '절정 ✨' : '여운'}
      </div>

      {/* 이미지 + 핫스팟 */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        {showSprite ? (
          <SpriteAnimation urls={spriteUrls} fps={4} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
        ) : (
          <img src={imgSrc} style={{ width: '100%', display: 'block', borderRadius: 8 }} alt="" draggable={false} />
        )}

        {/* SVG 핫스팟 오버레이 */}
        {!showClimax && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          >
            {hotspots.map((zone, i) => {
              const isHovered = hoveredZone === `${zone.key}-${i}`
              const sensitivity = femaleChar.erogenous?.[zone.key] ?? 2
              return (
                <ellipse
                  key={i}
                  cx={zone.cx}
                  cy={zone.cy}
                  rx={zone.rx}
                  ry={zone.ry}
                  fill={isHovered ? `${zone.color}40` : 'transparent'}
                  stroke={isHovered ? zone.color : `${zone.color}30`}
                  strokeWidth={isHovered ? 0.8 : 0.4}
                  style={{ transition: 'all 0.15s', filter: isHovered ? `drop-shadow(0 0 4px ${zone.color})` : 'none' }}
                  onMouseEnter={() => !ended && setHoveredZone(`${zone.key}-${i}`)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => handleZoneClick(zone)}
                  onTouchStart={(e) => { e.preventDefault(); setHoveredZone(`${zone.key}-${i}`); handleZoneClick(zone) }}
                  onTouchEnd={() => setHoveredZone(null)}
                />
              )
            })}
          </svg>
        )}

        {/* hover 레이블 */}
        {hoveredZone && (() => {
          const idx = parseInt(hoveredZone.split('-')[1])
          const zone = hotspots[idx]
          if (!zone) return null
          const sensitivity = femaleChar.erogenous?.[zone.key] ?? 2
          const hearts = sensitivity === 0 ? '✕' : '♥'.repeat(sensitivity)
          return (
            <div style={{
              position: 'absolute', top: `${zone.cy - zone.ry - 5}%`, left: `${zone.cx}%`,
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.85)', border: `1px solid ${zone.color}`,
              borderRadius: 6, padding: '3px 8px', pointerEvents: 'none', whiteSpace: 'nowrap',
              fontSize: 12, color: zone.color, fontWeight: 'bold',
            }}>
              {zone.label} {hearts}
            </div>
          )
        })()}

        {/* 피드백 팝업 */}
        {feedback && (
          <div style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: 18, fontWeight: 'bold', color: feedback.color,
            textShadow: `0 0 12px ${feedback.color}`,
            pointerEvents: 'none', animation: 'fadeUp 1.5s ease forwards',
          }}>
            {feedback.text}
          </div>
        )}

        {/* 절정 오버레이 */}
        {showClimax && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(233,69,96,0.15)', borderRadius: 8,
          }}>
            <div style={{ fontSize: 40, textAlign: 'center', textShadow: '0 0 30px #e94560' }}>✨</div>
          </div>
        )}
      </div>

      {/* 도구 선택 */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
        {TOOLS.map(t => (
          <button
            key={t.key}
            onClick={() => setTool(t.key)}
            style={{
              background: tool === t.key ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tool === t.key ? '#c9a84c' : '#ffffff22'}`,
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: tool === t.key ? '#c9a84c' : '#ffffff88', fontSize: 12,
            }}
          >
            {t.emoji} {t.label} <span style={{ fontSize: 10, color: '#ffffff44' }}>×{t.mult}</span>
          </button>
        ))}
      </div>

      {/* 종료 버튼 */}
      <button
        onClick={() => onEnd('fail')}
        style={{ marginTop: 8, background: 'none', border: '1px solid #ffffff22', borderRadius: 8, padding: '6px 20px', color: '#ffffff33', fontSize: 12, cursor: 'pointer' }}
      >
        포기
      </button>

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -80%); }
        }
      `}</style>
    </div>
  )
}
