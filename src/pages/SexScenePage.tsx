import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'
import type { HotspotZone } from '../lib/generateCharImages'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Tool = 'hand' | 'lips' | 'tongue' | 'finger' | 'toy'
type ScenePhase = 'foreplay' | 'aroused' | 'climax' | 'afterglow'
type ErogenousKey = 'breast' | 'neck' | 'ear' | 'thigh' | 'clitoris' | 'vagina' | 'anal' | 'mouth'

// ─── 핫스팟 좌표 — fallback용 하드코딩 (Gemini 분석 좌표 없을 때 사용) ───────

const HOTSPOTS: Record<string, HotspotZone[]> = {
  // 정상위: 오버헤드, 머리 상단, 다리 벌린 채 하단
  missionary: [
    { key: 'mouth',    label: '입',         cx: 50, cy: 18, rx: 10, ry: 5,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 50, cy: 27, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',        cx: 36, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',        cx: 64, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',       cx: 37, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',       cx: 63, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 22, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 78, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 81, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 50, cy: 86, rx: 7,  ry: 4,  color: '#e94560' },
  ],
  // 후배위: 측면+후방, 얼굴 좌상단 뒤돌아봄, 엉덩이+음부 중앙
  doggy: [
    { key: 'mouth',    label: '입',         cx: 23, cy: 22, rx: 12, ry: 9,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 32, cy: 30, rx: 8,  ry: 5,  color: '#c77dff' },
    { key: 'ear',      label: '귀',         cx: 22, cy: 22, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',       cx: 42, cy: 60, rx: 10, ry: 10, color: '#ff6b9d' },
    { key: 'anal',     label: '항문',       cx: 56, cy: 53, rx: 7,  ry: 5,  color: '#c9a84c' },
    { key: 'vagina',   label: '질',         cx: 55, cy: 62, rx: 8,  ry: 5,  color: '#e94560' },
    { key: 'clitoris', label: '클리토리스', cx: 54, cy: 68, rx: 7,  ry: 4,  color: '#e94560' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 30, cy: 82, rx: 18, ry: 11, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 72, cy: 82, rx: 14, ry: 11, color: '#f77f00' },
  ],
  // 여성상위: 정면, 앉아서 올라탄 자세
  cowgirl: [
    { key: 'mouth',    label: '입',         cx: 47, cy: 13, rx: 12, ry: 8,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 47, cy: 23, rx: 7,  ry: 4,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',        cx: 33, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',        cx: 61, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',       cx: 35, cy: 38, rx: 16, ry: 13, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',       cx: 60, cy: 37, rx: 14, ry: 12, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 22, cy: 75, rx: 13, ry: 16, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 75, cy: 75, rx: 11, ry: 16, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 49, cy: 79, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 49, cy: 84, rx: 7,  ry: 4,  color: '#e94560' },
  ],
  // 버터플라이(side): 오버헤드, 두 다리 위로 들린 채, 얼굴 중앙
  side: [
    { key: 'mouth',    label: '입',         cx: 50, cy: 28, rx: 11, ry: 7,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 50, cy: 37, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀',         cx: 38, cy: 27, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',       cx: 36, cy: 48, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',       cx: 62, cy: 47, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 22, cy: 65, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지',     cx: 76, cy: 63, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 76, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 50, cy: 81, rx: 7,  ry: 4,  color: '#e94560' },
    { key: 'anal',     label: '항문',       cx: 50, cy: 87, rx: 6,  ry: 4,  color: '#c9a84c' },
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
  const climaxSpriteUrls: string[] = [0, 1, 2]
    .map(i => poseImages[`${poseKey}_climax_sprite_${i}`] ?? '')
    .filter(Boolean)
  console.log('[SexScene] poseKey:', poseKey, '| poseImages keys:', Object.keys(poseImages), '| spriteUrls:', spriteUrls.length, '| climaxSpriteUrls:', climaxSpriteUrls.length)

  // 나이 배율
  const age = femaleChar.age ?? 25
  const ageMult = age < 30 ? 0.8 : age < 40 ? 1.0 : 1.5

  // 도구 배율
  const toolMult = TOOLS.find(t => t.key === tool)?.mult ?? 1.0

  // 흥분도에 따른 페이즈 결정
  useEffect(() => {
    if (femaleArousal >= 1000 && !ended) {
      setPhase('climax')
      setEnded(true)
      setTimeout(() => onEnd('success'), 3000)
    } else if (femaleArousal >= 300 && phase === 'foreplay') {
      setPhase('aroused')
    }
  }, [femaleArousal, phase, ended, onEnd])

  useEffect(() => {
    if (maleArousal >= 100 && !ended) {
      setEnded(true)
      setTimeout(() => onEnd('fail'), 2000)
    }
  }, [maleArousal, ended, onEnd])

  // 남캐 흥분도 자동 증가 (5분 = 300초에 100 도달: 3초마다 +1)
  useEffect(() => {
    if (ended) return
    const id = setInterval(() => {
      setMaleArousal(prev => {
        const next = prev + 1
        setMaleFlash(true)
        setTimeout(() => setMaleFlash(false), 300)
        return next
      })
    }, 3000)
    return () => clearInterval(id)
  }, [ended])

  const getEroSensitivity = (key: string) => {
    const eroKey = (key === 'neck' || key === 'ear') ? 'neckEar' : key
    return femaleChar.erogenous?.[eroKey as keyof typeof femaleChar.erogenous] ?? 2
  }

  // 핫스팟 클릭
  const handleZoneClick = useCallback((zone: BodyZone) => {
    if (ended || phase === 'climax') return
    const sensitivity = getEroSensitivity(zone.key)
    const gain = Math.max(1, sensitivity) * toolMult * ageMult * 4
    setFemaleArousal(prev => Math.min(1000, prev + gain))
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

  // 흥분도 구간별 표시 모드
  // 0~299: 흥분 사진 / 300~599: 흥분 애니 / 600~899: 절정 애니 / 900~999: 절정 사진
  const displayMode = femaleArousal >= 900 ? 'photo_climax'
    : femaleArousal >= 600 ? 'sprite_climax'
    : femaleArousal >= 300 ? 'sprite_aroused'
    : 'photo_aroused'

  const currentSpriteUrls = displayMode === 'sprite_climax'
    ? (climaxSpriteUrls.length >= 1 ? climaxSpriteUrls : spriteUrls)
    : spriteUrls
  // sprite 1장 이상이면 애니, 없으면 사진 fallback
  const showSprite = (displayMode === 'sprite_aroused' || displayMode === 'sprite_climax') && currentSpriteUrls.length >= 1
  const showClimax = displayMode === 'photo_climax'
  const imgSrc = femaleArousal >= 600 ? climaxImg : arousedImg

  // 핫스팟: 구간에 따라 exprKey 결정
  const exprKey: 'aroused' | 'climax' = femaleArousal >= 600 ? 'climax' : 'aroused'
  const climaxSpriteStored  = poseImages[`${poseKey}_climax_sprite_hotspots`]  as unknown as HotspotZone[] | undefined
  const arousedSpriteStored = poseImages[`${poseKey}_aroused_sprite_hotspots`] as unknown as HotspotZone[] | undefined
  const climaxStored  = poseImages[`${poseKey}_climax_hotspots`]  as unknown as HotspotZone[] | undefined
  const arousedStored = poseImages[`${poseKey}_aroused_hotspots`] as unknown as HotspotZone[] | undefined
  const hotspots: HotspotZone[] = (() => {
    if (exprKey === 'climax') {
      if (showSprite && climaxSpriteStored?.length) return climaxSpriteStored
      return climaxStored?.length ? climaxStored : (arousedStored?.length ? arousedStored : (HOTSPOTS[poseKey] ?? HOTSPOTS['missionary']))
    }
    if (showSprite && arousedSpriteStored?.length) return arousedSpriteStored
    return arousedStored?.length ? arousedStored : (HOTSPOTS[poseKey] ?? HOTSPOTS['missionary'])
  })()

  // body에 zoom:2 있으므로 이 페이지에서만 상쇄 → viewport 단위가 정상 동작
  return (
    <div style={{
      background: '#0d0d1a', overflow: 'hidden', userSelect: 'none',
      position: 'fixed', top: 0, left: 0,
      width: window.innerWidth, height: window.innerHeight,
      zoom: 0.5,   // body zoom:2 상쇄
      fontSize: 24, // zoom 상쇄 후 폰트 재설정
    }}>

      {/* 상단 게이지 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,13,26,0.95)', borderBottom: '1px solid #ffffff11',
        padding: '8px 16px 4px', display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <ArousalGauge value={femaleArousal} max={1000} label="💗 흥분도" color="#e94560" flash={femaleFlash} />
        <ArousalGauge value={maleArousal}   label="💙 남캐"   color="#4a90e2" flash={maleFlash} />
        <div style={{ color: '#ffffff44', fontSize: 11, letterSpacing: 2, textAlign: 'center' }}>
          {displayMode === 'photo_aroused' ? '전희' : displayMode === 'sprite_aroused' ? '흥분' : displayMode === 'sprite_climax' ? '절정 진입' : '절정 ✨'}
        </div>
      </div>

      {/* 이미지 + 핫스팟 */}
      <div style={{ position: 'absolute', top: 80, bottom: 52, left: 0, right: 0, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', height: '100%', width: 'auto' }}>
        {showSprite ? (
          <SpriteAnimation urls={currentSpriteUrls} fps={4} style={{ height: '100%', width: 'auto', display: 'block', borderRadius: 8 }} />
        ) : (
          <img src={imgSrc} style={{ height: '100%', width: 'auto', display: 'block', borderRadius: 8 }} alt="" draggable={false} />
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
              const sensitivity = getEroSensitivity(zone.key)
              return (
                <g key={i} transform={`rotate(${zone.rotation ?? 0}, ${zone.cx}, ${zone.cy})`}>
                <ellipse
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
                </g>
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
      </div>

      {/* 하단 도구 선택 — absolute bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,13,26,0.95)', borderTop: '1px solid #ffffff11',
        padding: '8px 12px', display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center',
      }}>
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
        <button
          onClick={() => onEnd('fail')}
          style={{ background: 'none', border: '1px solid #ffffff22', borderRadius: 8, padding: '6px 14px', color: '#ffffff33', fontSize: 11, cursor: 'pointer' }}
        >
          포기
        </button>
      </div>

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -80%); }
        }
      `}</style>
    </div>
  )
}
