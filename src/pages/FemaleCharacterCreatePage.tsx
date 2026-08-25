import React, { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'
import { generateProfileImage, generateExpressionImages, generatePoseImages, generatePoseVariants, generatePoseSprite, deleteImageFromStorage, CONVERSATION_EXPRESSIONS, POSES, POSE_EXPRESSIONS, POSE_BACKGROUNDS, POSE_HOTSPOTS } from '../lib/generateCharImages'
import type { HotspotZone } from '../lib/generateCharImages'
import { supabase } from '../lib/supabase'

export interface FemaleCharacterData {
  id: string
  nickname: string
  age: number
  married: '誘명샎' | '湲고샎' | '?뚯떛'
  job: string
  location: string
  bodyType: '湲?섎㉧' | '踰좎씠湲' | '?щ옖?? | '癒몄뒳'
  intro: string
  // ?몃え
  heightCm: number
  face: number
  body: number
  fashion: number
  // 愿?ъ궗
  interestTags: string[]
  interestCustom: string
  dislikeTags: string[]
  dislikeCustom: string
  // ?깃꺽 ?щ씪?대뜑 (1~5)
  personality: { introvert: number; indirect: number; friendly: number }
  // 硫붾え
  memo: string
  // ?깃컧? (?④? ?ㅽ꺈, ?쇰컲: 1~4쨌??0 / ?듭떖: 4~10쨌??8)
  erogenous: {
    breast: number; neckEar: number; thigh: number; clitoris: number
    vagina: number; anal: number; mouth: number; armpit: number
  }
  // ?⑥꽦 ?좏샇??(?④? ?ㅽ꺈)
  prefAge: { age20: number; age30: number; age40: number }         // ?⑷퀎=100, age40 ?먮룞
  prefLook: { face: number; height: number; body: number; fashion: number }  // ?⑷퀎=100, fashion ?먮룞
  prefWealth: number  // ?щ젰?좏샇 20~100 (S1/S2 蹂꾨룄)
  prefPersonality: { intel: number; humor: number; virtue: number; manner: number } // ?⑷퀎=100, manner ?먮룞
  prefErect: { power: number; duration: number; hardness: number; tech: number }    // ?⑷퀎=100, tech ?먮룞
  prefSize: { size: number; girth: number }   // ?깃린 ?ш린 ?좏샇 媛?0~100
  prefPose: { missionary: number; doggy: number; cowgirl: number; side: number }
  smTendency: number     // ?ъ틦 ?먯떊??S/M ?깊뼢: -10(?꾩쟾 M) ~ +10(?꾩쟾 S)
  dateCostShare: number  // ?곗씠??鍮꾩슜 遺?댁쑉 0~100%
  // ?몃え ?ㅻ챸 (?대?吏 ?앹꽦??
  appearanceDesc?: string
  hairColor?: string
  hairLength?: string
  glasses?: boolean
  // ?대?吏
  imageUrl?: string
  expressionImages?: string[]          // 5?? ?됱긽???덉젙 (????붾㈃??
  poseImages?: Record<string, string>  // 4?먯꽭 횞 3?쒖젙 = 12??(sex ?ъ슜)
  createdAt: string
}

const LOCATIONS = [
  '??숆탳','?꾩꽌愿','蹂묒썝','?쎄뎅','怨듦났湲곌?','寃쎌같??,'?ъ뒪??,'移댄럹',
  '?쇳븨紐?,'怨듭썝','?몃옒諛?,'?대?','鍮꾪뻾??,'?뚯궗','?덉뒪?좊옉','怨좉툒?덉뒪?좊옉',
  '諛?,'?대읇','?명뀛',
]
const INTEREST_TAGS = ['?뚯떇/??,'?ы뻾','?⑥뀡','?대룞','?낆꽌','?곹솕','?뚯븙','?붾━','?쇳븨','諛섎젮?숇Ъ','誘몄닠','寃뚯엫','?쇱쇅?쒕룞','?먭린怨꾨컻','?곗븷','?뺤튂/?ы쉶']
const DISLIKE_TAGS = ['?≪뿰','?뚯＜','臾대???留?,'怨쇳븳 ?ㅽ궓??,'???먮옉','?곗쑀遺??,'由щ뱶 紐삵븿','吏媛?,'???섍린','嫄곗쭞留?,'?꾩깮 遺덈웾','???以??곕쭔 遊?,'吏덊닾/?듭젣','?뺤튂 ?섍린','?대룞 媛뺤슂']
const BODY_TYPES = ['湲?섎㉧','踰좎씠湲','?щ옖??,'癒몄뒳'] as const
const MARRIED_TYPES = ['誘명샎','湲고샎','?뚯떛'] as const

const EROGENOUS_ZONES = [
  { key: 'breast',   label: '媛??,    note: '湲?섎㉧/踰좎씠湲? 3+ 沅뚯옣' },
  { key: 'neckEar',  label: '紐㈑룰?',   note: '?꾨룄?뺤? ??쾶 ?ㅼ젙' },
  { key: 'thigh',    label: '?됰뜦???덈쾮吏',  note: '?좊Т ?좏뻾 遺?? },
  { key: 'clitoris', label: '?대━?좊━??, note: '?듭떖 ?깃컧? ????쾶 ?ㅼ젙 鍮꾧텒?? },
  { key: 'vagina',   label: '吏?, note: 'G?ㅽ뙚 諛섏쓳? 4+ 沅뚯옣' },
  { key: 'anal',     label: '??Ц',    note: '0=嫄곕? 諛섏쓳' },
  { key: 'mouth',    label: '?끒룹엯??, note: '援ш컯 ?좏샇?? },
] as const

function buildFemalePrompt(c: Partial<FemaleCharacterData>): string {
  const ageLabel = (c.age ?? 25) < 30 ? 'mid-20s' : (c.age ?? 25) < 40 ? 'early 30s' : 'early 40s'
  const bodyDesc = c.bodyType === '湲?섎㉧' ? 'voluptuous curvy body' : c.bodyType === '踰좎씠湲' ? 'slim waist with curves' : c.bodyType === '癒몄뒳' ? 'athletic toned body' : 'slender slim body'
  const faceScore = c.face ?? 60
  const faceDesc = faceScore >= 80 ? 'very beautiful face' : faceScore >= 60 ? 'pretty face' : 'attractive face'
  const fashionScore = c.fashion ?? 50
  const fashionDesc = fashionScore >= 80 ? 'high fashion elegant outfit' : fashionScore >= 60 ? 'stylish casual outfit' : 'neat simple clothes'

  return (
    `Korean adult female, ${ageLabel}, works as ${c.job ?? 'office worker'}, ` +
    `${faceDesc}, ${bodyDesc}, ${fashionDesc}, ` +
    `gentle expression, upper body portrait, ` +
    `digital illustration, concept art style, painterly, ` +
    `soft lighting, detailed brushwork, warm color palette, artstation quality`
  )
}

// ??? ?꾩껜 ?깃컧? ?듭뀡 紐⑸줉 ????????????????????????????????????????????????????
const ALL_ZONE_OPTIONS: HotspotZone[] = [
  { key: 'mouth',    label: '??,         cx: 50, cy: 15, rx: 5,   ry: 2.5, color: '#ff6b9d' },
  { key: 'neck',     label: '紐?,         cx: 50, cy: 24, rx: 7,   ry: 3,   color: '#c77dff' },
  { key: 'ear',      label: '洹L',        cx: 36, cy: 15, rx: 4,   ry: 5,   color: '#a855f7' },
  { key: 'ear',      label: '洹R',        cx: 64, cy: 15, rx: 4,   ry: 5,   color: '#a855f7' },
  { key: 'breast',   label: '媛?퀽',      cx: 37, cy: 41, rx: 13,  ry: 11,  color: '#ff6b9d' },
  { key: 'breast',   label: '媛?큃',      cx: 63, cy: 41, rx: 13,  ry: 11,  color: '#ff6b9d' },
  { key: 'thigh',    label: '?됰뜦???덈쾮吏L',    cx: 22, cy: 72, rx: 16,  ry: 13,  color: '#f77f00' },
  { key: 'thigh',    label: '?됰뜦???덈쾮吏R',    cx: 78, cy: 72, rx: 16,  ry: 13,  color: '#f77f00' },
  { key: 'clitoris', label: '?대━?좊━??, cx: 50, cy: 80, rx: 4,   ry: 2,   color: '#e94560' },
  { key: 'vagina',   label: '吏?,         cx: 50, cy: 85, rx: 3.5, ry: 2,   color: '#e94560' },
  { key: 'anal',     label: '??Ц',       cx: 50, cy: 91, rx: 6,   ry: 4,   color: '#c9a84c' },
  { key: 'armpit',   label: '寃⑤뱶?묒씠L',  cx: 22, cy: 38, rx: 8,   ry: 5,   color: '#06b6d4' },
  { key: 'armpit',   label: '寃⑤뱶?묒씠R',  cx: 78, cy: 38, rx: 8,   ry: 5,   color: '#06b6d4' },
]

// ??? ?レ뒪???쒕옒洹??먮뵒??????????????????????????????????????????????????????
function HotspotEditor({ imageUrl, poseKey, initialZones, onSave, onClose }: {
  imageUrl: string
  poseKey: string
  initialZones?: HotspotZone[]
  onSave: (zones: HotspotZone[]) => void
  onClose: () => void
}) {
  const [zones, setZones] = React.useState<HotspotZone[]>(() => {
    const raw: HotspotZone[] = JSON.parse(JSON.stringify(
      initialZones?.length ? initialZones : (POSE_HOTSPOTS[poseKey] ?? POSE_HOTSPOTS['missionary'])
    ))
    return raw.filter(z => (z.key as string) !== 'neckEar')
  })
  const [dragging, setDragging] = React.useState<number | null>(null)
  const [rotating, setRotating] = React.useState<number | null>(null)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [history, setHistory] = React.useState<HotspotZone[][]>([])
  const svgRef = React.useRef<SVGSVGElement>(null)

  const pushHistory = (prev: HotspotZone[]) =>
    setHistory(h => [...h.slice(-30), JSON.parse(JSON.stringify(prev))])

  const undo = () => {
    if (history.length === 0) return
    setZones(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
    setSelected(null)
  }

  const isActive = (opt: HotspotZone) => zones.some(z => z.key === opt.key && z.label === opt.label)

  const removeZone = (idx: number) => {
    setZones(prev => { pushHistory(prev); return prev.filter((_, i) => i !== idx) })
    setSelected(null)
  }

  const toggleZone = (opt: HotspotZone) => {
    if (isActive(opt)) {
      setZones(prev => {
        const idx = prev.findIndex(z => z.key === opt.key && z.label === opt.label)
        if (idx === -1) return prev
        pushHistory(prev)
        setSelected(null)
        return prev.filter((_, i) => i !== idx)
      })
    } else {
      setZones(prev => { pushHistory(prev); return [...prev, { ...opt }] })
    }
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
        removeZone(selected)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, zones, history])

  const getPos = (e: React.MouseEvent) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    return {
      cx: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      cy: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getPos(e)
    if (!pos) return
    if (dragging !== null) {
      setZones(prev => prev.map((z, i) => i === dragging ? { ...z, ...pos } : z))
    } else if (rotating !== null) {
      const zone = zones[rotating]
      const dx = pos.cx - zone.cx
      const dy = pos.cy - zone.cy
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
      setZones(prev => prev.map((z, i) => i === rotating ? { ...z, rotation: angle } : z))
    }
  }
  const onMouseUp = () => {
    if (dragging !== null || rotating !== null) pushHistory(zones)
    setDragging(null)
    setRotating(null)
  }

  const selectedZone = selected !== null ? zones[selected] : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, maxWidth: 700, width: '95%', border: '1px solid #c9a84c55' }}>
        <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>
          ?뱧 ?깃컧? ?꾩튂 議곗젙 ??{poseKey}
        </div>
        <div style={{ color: '#ffffff55', fontSize: 11, marginBottom: 12 }}>???쒕옒洹?= ?꾩튂 ?대룞 쨌 ???대┃ = ?좏깮 쨌 Delete = ??젣 쨌 ?고겢由?= 鍮꾪솢?깊솕</div>

        <div style={{ display: 'flex', gap: 14 }}>
          {/* ?쇱そ: ?대?吏 + SVG */}
          <div style={{ flex: 1, position: 'relative' }}>
            <img src={imageUrl} style={{ width: '100%', display: 'block', borderRadius: 8, userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: dragging !== null ? 'grabbing' : 'default' }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {zones.map((z, i) => {
                const rot = z.rotation ?? 0
                const handleDist = z.ry + 4
                return (
                  <g key={i} transform={`rotate(${rot}, ${z.cx}, ${z.cy})`}>
                    <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                      fill={z.color + (selected === i ? '77' : '44')}
                      stroke={z.color} strokeWidth={selected === i ? 1.2 : 0.8}
                      style={{ cursor: 'grab' }}
                      onMouseDown={e => { e.preventDefault(); setDragging(i); setSelected(i) }}
                      onClick={() => setSelected(i)}
                      onContextMenu={e => { e.preventDefault(); removeZone(i) }}
                    />
                    <text x={z.cx} y={z.cy} textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={3.5} fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {z.label}
                    </text>
                    {/* ?뚯쟾 ?몃뱾 */}
                    <line x1={z.cx} y1={z.cy - z.ry} x2={z.cx} y2={z.cy - handleDist}
                      stroke={z.color} strokeWidth={0.4} style={{ pointerEvents: 'none' }} />
                    <circle cx={z.cx} cy={z.cy - handleDist} r={1.8}
                      fill="#1a1a2e" stroke={z.color} strokeWidth={0.8}
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setRotating(i); setSelected(i) }}
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {/* ?ㅻⅨ履? ?듭뀡 ?좉? + ?ш린 議곗젅 */}
          <div style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: '#ffffff66', fontSize: 11, marginBottom: 2 }}>?깃컧? ?좏깮</div>
            {ALL_ZONE_OPTIONS.map((opt, i) => {
              const active = isActive(opt)
              return (
                <button key={i} onClick={() => toggleZone(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: active ? opt.color + '22' : '#ffffff08',
                    border: `1px solid ${active ? opt.color + '88' : '#ffffff22'}`,
                    borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                    color: active ? '#fff' : '#ffffff44', fontSize: 11, textAlign: 'left',
                    textDecoration: active ? 'none' : 'line-through',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? opt.color : '#ffffff22', flexShrink: 0 }} />
                  {opt.label}
                </button>
              )
            })}

            {/* ?좏깮?????ш린 議곗젅 */}
            {selectedZone && selected !== null && (
              <div style={{ marginTop: 8, borderTop: '1px solid #ffffff11', paddingTop: 8 }}>
                <div style={{ color: selectedZone.color, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                  ?륅툘 {selectedZone.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    <div style={{ color: '#ffffff55', fontSize: 10, marginBottom: 2 }}>媛곷룄 째</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="range" min={-180} max={180} step={1} value={Math.round(((selectedZone.rotation ?? 0) + 180) % 360 - 180)}
                        onMouseDown={() => pushHistory(zones)}
                        onChange={e => setZones(prev => prev.map((z, i) => i === selected ? { ...z, rotation: +e.target.value } : z))}
                        style={{ flex: 1 }} />
                      <input type="number" min={-180} max={180} step={1} value={Math.round(((selectedZone.rotation ?? 0) + 180) % 360 - 180)}
                        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { pushHistory(zones); setZones(prev => prev.map((z, i) => i === selected ? { ...z, rotation: v } : z)) } }}
                        style={{ width: 38, background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 4, color: '#fff', fontSize: 11, padding: '2px 4px', textAlign: 'center' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#ffffff55', fontSize: 10, marginBottom: 2 }}>媛濡?rx</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="range" min={1} max={30} step={0.5} value={selectedZone.rx}
                        onMouseDown={() => pushHistory(zones)}
                        onChange={e => setZones(prev => prev.map((z, i) => i === selected ? { ...z, rx: +e.target.value } : z))}
                        style={{ flex: 1 }} />
                      <input type="number" min={1} max={30} step={0.5} value={selectedZone.rx}
                        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { pushHistory(zones); setZones(prev => prev.map((z, i) => i === selected ? { ...z, rx: Math.max(1, Math.min(30, v)) } : z)) } }}
                        style={{ width: 38, background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 4, color: '#fff', fontSize: 11, padding: '2px 4px', textAlign: 'center' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#ffffff55', fontSize: 10, marginBottom: 2 }}>?몃줈 ry</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="range" min={1} max={20} step={0.5} value={selectedZone.ry}
                        onMouseDown={() => pushHistory(zones)}
                        onChange={e => setZones(prev => prev.map((z, i) => i === selected ? { ...z, ry: +e.target.value } : z))}
                        style={{ flex: 1 }} />
                      <input type="number" min={1} max={20} step={0.5} value={selectedZone.ry}
                        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { pushHistory(zones); setZones(prev => prev.map((z, i) => i === selected ? { ...z, ry: Math.max(1, Math.min(20, v)) } : z)) } }}
                        style={{ width: 38, background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 4, color: '#fff', fontSize: 11, padding: '2px 4px', textAlign: 'center' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={() => onSave(zones)}
            style={{ flex: 2, background: '#c9a84c', border: 'none', color: '#000', borderRadius: 8, padding: '8px 0', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
            ?뮶 ???          </button>
          <button onClick={undo} disabled={history.length === 0}
            style={{ flex: 1, background: 'none', border: '1px solid #ffffff33', color: history.length > 0 ? '#fff' : '#ffffff33', borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: history.length > 0 ? 'pointer' : 'default' }}>
            ???섎룎由ш린
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: 'none', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer' }}>
            痍⑥냼
          </button>
        </div>
      </div>
    </div>
  )
}

function SpriteAnimation({ urls, fps = 4, style }: { urls: string[]; fps?: number; style?: React.CSSProperties }) {
  const [frame, setFrame] = React.useState(0)
  React.useEffect(() => {
    if (!urls || urls.length < 2) return
    const id = setInterval(() => setFrame(f => (f + 1) % urls.length), 1000 / fps)
    return () => clearInterval(id)
  }, [urls, fps])
  if (!urls?.length) return null
  return <img src={urls[frame]} style={style} alt="" />
}

function smLabel(v: number) {
  return v <= -7 ? '洹?M' : v < -3 ? 'M ?깊뼢' : v >= 7 ? '洹?S' : v > 3 ? 'S ?깊뼢' : '以묐┰'
}
function SmSlider(val: number, set: (v: number) => void) {
  const color = val < -3 ? '#e94560' : val > 3 ? '#c9a84c' : '#ffffff66'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 52, color }}>{smLabel(val)}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ffffff33' }}>
          <span>M ??0</span><span>0</span><span>S +10</span>
        </div>
        <input type="range" min={-10} max={10} step={1} value={val}
          onChange={e => set(Number(e.target.value))}
          style={{ width: '100%', accentColor: color } as any} />
      </div>
      <span style={{ color, fontWeight: 'bold', fontSize: 13, width: 32, textAlign: 'right', flexShrink: 0 }}>
        {val > 0 ? `+${val}` : val}
      </span>
    </div>
  )
}

export default function FemaleCharacterCreatePage({
  onComplete,
  onBack,
  initialData,
}: {
  onComplete: (char: FemaleCharacterData) => void
  onBack: () => void
  initialData?: FemaleCharacterData
}) {
  const scale = useScale(960)
  const s = (n: number) => n * scale
  const d = initialData
  const [nickname, setNickname] = useState(d?.nickname ?? '')
  const [age, setAge] = useState(d ? String(d.age) : '25')
  const [married, setMarried] = useState<'誘명샎'|'湲고샎'|'?뚯떛'>(d?.married ?? '誘명샎')
  const [job, setJob] = useState(d?.job ?? '')
  const [location, setLocation] = useState(d?.location ?? LOCATIONS[0])
  const [bodyType, setBodyType] = useState<'湲?섎㉧'|'踰좎씠湲'|'?щ옖??|'癒몄뒳'>(d?.bodyType ?? '湲?섎㉧')
  const [intro, setIntro] = useState(d?.intro ?? '')

  const [heightCm, setHeightCm] = useState(d?.heightCm ?? 160)
  const LOOK_TOTAL = 180; const LOOK_MIN = 10
  const [face, setFace] = useState(d?.face ?? 60)
  const [body, setBody] = useState(d?.body ?? 60)
  const fashion = Math.max(LOOK_MIN, LOOK_TOTAL - face - body)
  const setLook = (key: 'face'|'body', val: number) => {
    const other = key === 'face' ? body : face
    const clamped = Math.min(val, LOOK_TOTAL - LOOK_MIN - other)
    if (key === 'face') setFace(clamped)
    else setBody(clamped)
  }

  const [interestTags, setInterestTags] = useState<string[]>(d?.interestTags ?? [])
  const [interestCustom, setInterestCustom] = useState(d?.interestCustom ?? '')
  const [dislikeTags, setDislikeTags] = useState<string[]>(d?.dislikeTags ?? [])
  const [dislikeCustom, setDislikeCustom] = useState(d?.dislikeCustom ?? '')

  const [personality, setPersonality] = useState(d?.personality ?? { introvert: 3, indirect: 3, friendly: 3 })

  const [memo, setMemo] = useState(d?.memo ?? '')

  // ?쇰컲 ?깃컧?: ?⑷퀎=10, min=1, max=4, thigh ?먮룞
  const GEN_TOTAL = 10; const GEN_MIN = 1; const GEN_MAX = 4
  const clampGen = (v: number | undefined) => Math.min(GEN_MAX, Math.max(GEN_MIN, v ?? 2))
  const [genEro, setGenEroState] = useState(d?.erogenous
    ? { breast: clampGen(d.erogenous.breast), neckEar: clampGen(d.erogenous.neckEar), armpit: clampGen(d.erogenous.armpit), mouth: clampGen(d.erogenous.mouth), thigh: clampGen(d.erogenous.thigh) }
    : { breast: 2, neckEar: 2, armpit: 2, mouth: 2, thigh: 2 })
  const [genEroToast, setGenEroToast] = useState<string | null>(null)
  const showGenEroToast = (msg: string) => {
    setGenEroToast(msg)
    setTimeout(() => setGenEroToast(null), 2500)
  }
  const setGenEro = (key: 'breast'|'neckEar'|'armpit'|'mouth', val: number) => {
    const clamped = Math.max(GEN_MIN, Math.min(val, GEN_MAX))
    setGenEroState(prev => {
      const next = { ...prev, [key]: clamped }
      const othersSum = next.breast + next.neckEar + next.armpit + next.mouth
      if (othersSum > GEN_TOTAL - GEN_MIN) {
        showGenEroToast(`珥앺빀??${GEN_TOTAL}??珥덇낵?⑸땲?? ?ㅻⅨ ??ぉ??癒쇱? ??떠二쇱꽭??`)
        return prev
      }
      return next
    })
  }
  const genThighAuto = Math.min(GEN_MAX, Math.max(GEN_MIN, GEN_TOTAL - genEro.breast - genEro.neckEar - genEro.armpit - genEro.mouth))

  // ?듭떖 ?깃컧?: ?대━?좊━???щ씪?대뜑, 吏??먮룞 (min 4, ?⑷퀎 15) / ??Ц ?낅┰ ?щ씪?대뜑
  const CORE_TOTAL = 15
  const CORE_MIN = 4; const CORE_MAX = CORE_TOTAL - CORE_MIN // 11
  const [clitoris, setClitoris] = useState(Math.min(CORE_MAX, Math.max(CORE_MIN, d?.erogenous?.clitoris ?? 8)))
  const vagina = CORE_TOTAL - clitoris
  const ANAL_MIN = -5; const ANAL_MAX = 5
  const [anal, setAnal] = useState(Math.min(ANAL_MAX, Math.max(ANAL_MIN, d?.erogenous?.anal ?? 1)))

  const erogenous = { ...genEro, thigh: genThighAuto, clitoris, vagina, anal }

  // ?⑥꽦 ?좏샇??  const PREF_TOTAL = 100
  // ?섏씠 ?좏샇 (40? ?먮룞)
  const AGE_MIN = 10
  const [prefAge20, setPrefAge20] = useState(d?.prefAge?.age20 ?? 35)
  const [prefAge30, setPrefAge30] = useState(d?.prefAge?.age30 ?? 35)
  const prefAge40 = Math.max(AGE_MIN, PREF_TOTAL - prefAge20 - prefAge30)
  const setPrefAgeVal = (key: 'age20'|'age30', val: number) => {
    const other = key === 'age20' ? prefAge30 : prefAge20
    const maxVal = PREF_TOTAL - AGE_MIN - other
    const snapped = Math.round(val / 5) * 5
    const clamped = Math.min(snapped, maxVal)
    if (key === 'age20') setPrefAge20(Math.max(AGE_MIN, clamped))
    else setPrefAge30(Math.max(AGE_MIN, clamped))
  }
  // S1 ?몃え ?좏샇 (?⑥뀡 ?먮룞)
  const LOOK_PREF_MIN = 10; const LOOK_PREF_MAX = 50
  const [prefFace, setPrefFace] = useState(d?.prefLook?.face ?? 25)
  const [prefHeight, setPrefHeight] = useState(d?.prefLook?.height ?? 25)
  const [prefBodyLook, setPrefBodyLook] = useState(d?.prefLook?.body ?? 25)
  const prefFashion = Math.max(LOOK_PREF_MIN, PREF_TOTAL - prefFace - prefHeight - prefBodyLook)
  const setPrefLook = (key: 'face'|'height'|'bodyLook', val: number) => {
    const others = (key==='face'?0:prefFace)+(key==='height'?0:prefHeight)+(key==='bodyLook'?0:prefBodyLook)
    const clamped = Math.min(Math.min(val, LOOK_PREF_MAX), PREF_TOTAL - LOOK_PREF_MIN - others)
    if (key==='face') setPrefFace(Math.max(LOOK_PREF_MIN,clamped))
    else if (key==='height') setPrefHeight(Math.max(LOOK_PREF_MIN,clamped))
    else setPrefBodyLook(Math.max(LOOK_PREF_MIN,clamped))
  }
  const [prefWealth, setPrefWealth] = useState(d?.prefWealth ?? 30)
  // S2 ?깃꺽 ?좏샇 (留ㅻ꼫 ?먮룞)
  const PERS_PREF_MIN = 10; const PERS_PREF_MAX = 50
  const [prefIntel, setPrefIntel] = useState(d?.prefPersonality?.intel ?? 25)
  const [prefHumor, setPrefHumor] = useState(d?.prefPersonality?.humor ?? 25)
  const [prefVirtue, setPrefVirtue] = useState(d?.prefPersonality?.virtue ?? 25)
  const prefManner = Math.max(PERS_PREF_MIN, PREF_TOTAL - prefIntel - prefHumor - prefVirtue)
  const setPrefPersonality = (key: 'intel'|'humor'|'virtue', val: number) => {
    const others = (key==='intel'?0:prefIntel)+(key==='humor'?0:prefHumor)+(key==='virtue'?0:prefVirtue)
    const clamped = Math.min(Math.min(val, PERS_PREF_MAX), PREF_TOTAL - PERS_PREF_MIN - others)
    if (key==='intel') setPrefIntel(Math.max(PERS_PREF_MIN,clamped))
    else if (key==='humor') setPrefHumor(Math.max(PERS_PREF_MIN,clamped))
    else setPrefVirtue(Math.max(PERS_PREF_MIN,clamped))
  }
  // S3 諛쒓린 ?좏샇 (?뚰겕???먮룞)
  const ERECT_PREF_MIN = 10; const ERECT_PREF_MAX = 50
  const [prefPower, setPrefPower] = useState(d?.prefErect?.power ?? 25)
  const [prefDuration, setPrefDuration] = useState(d?.prefErect?.duration ?? 25)
  const [prefHardness, setPrefHardness] = useState(d?.prefErect?.hardness ?? 25)
  const prefTech = Math.max(ERECT_PREF_MIN, PREF_TOTAL - prefPower - prefDuration - prefHardness)
  const setPrefErect = (key: 'power'|'duration'|'hardness', val: number) => {
    const others = (key==='power'?0:prefPower)+(key==='duration'?0:prefDuration)+(key==='hardness'?0:prefHardness)
    const clamped = Math.min(Math.min(val, ERECT_PREF_MAX), PREF_TOTAL - ERECT_PREF_MIN - others)
    if (key==='power') setPrefPower(Math.max(ERECT_PREF_MIN,clamped))
    else if (key==='duration') setPrefDuration(Math.max(ERECT_PREF_MIN,clamped))
    else setPrefHardness(Math.max(ERECT_PREF_MIN,clamped))
  }
  // ?깃린 ?ш린 ?좏샇 (?⑷퀎=100, 理쒖냼 20??
  const SIZE_PREF_MIN = 20
  const [prefSize, setPrefSize] = useState(d?.prefSize ?? { size: 50, girth: 50 })
  const setPrefSizeStat = (key: 'size'|'girth', val: number) => {
    const clamped = Math.max(SIZE_PREF_MIN, Math.min(val, 100 - SIZE_PREF_MIN))
    const other = key === 'size' ? 'girth' : 'size'
    setPrefSize({ [key]: clamped, [other]: Math.max(SIZE_PREF_MIN, 100 - clamped) } as typeof prefSize)
  }
  // ?좏샇 ?먯꽭 (?⑷퀎=10, 理쒖냼 1?? side ?먮룞)
  const POSE_TOTAL = 10; const POSE_MIN = 1
  const [prefPose, setPrefPose] = useState(d?.prefPose ?? { missionary:3, doggy:3, cowgirl:2, side:2 })
  const POSE_MAX = 5
  const poseSideAuto = Math.min(POSE_MAX, Math.max(POSE_MIN, POSE_TOTAL - prefPose.missionary - prefPose.doggy - prefPose.cowgirl))
  const [smTendency, setSmTendency] = useState(d?.smTendency ?? 0)
  const [dateCostShare, setDateCostShare] = useState(d?.dateCostShare ?? 0)
  const [appearanceDesc, setAppearanceDesc] = useState(d?.appearanceDesc ?? '')
  const [hairColor, setHairColor] = useState<string>(d?.hairColor ?? '')
  const [hairLength, setHairLength] = useState<string>(d?.hairLength ?? '')
  const [glasses, setGlasses] = useState<boolean>(d?.glasses ?? false)
  const setPose = (key: 'missionary'|'doggy'|'cowgirl', val: number) => {
    const clamped = Math.max(POSE_MIN, Math.min(val, POSE_MAX))
    setPrefPose(prev => ({ ...prev, [key]: clamped }))
  }

  const buildAppearanceDesc = () => {
    const parts: string[] = []
    if (hairColor) parts.push(hairColor)
    if (hairLength) parts.push(hairLength)
    if (glasses) parts.push('wearing glasses')
    const extra = appearanceDesc.trim()
    if (extra) parts.push(extra)
    return parts.join(', ') || undefined
  }

  // ?먭린?뚭컻 ?먮룞 ?앹꽦
  const autoIntro = (() => {
    const ageNum = parseInt(age)
    if (!job.trim() || isNaN(ageNum)) return ''

    const ageLabel = ageNum < 30 ? '20?' : ageNum < 40 ? '30?' : '40?'
    const marriedLabel = married === '誘명샎' ? '誘명샎' : married === '湲고샎' ? '湲고샎' : '?뚯떛'

    // ?몃え top 1
    const topLook = face >= body && face >= fashion ? '?몃え' : body >= fashion ? '紐몃ℓ' : '?ㅽ???
    const bodyLabel = bodyType === '湲?섎㉧' ? '湲?섎㉧?ъ뒪?? : bodyType === '踰좎씠湲' ? '洹좏삎 ?≫엺' : bodyType === '?щ옖?? ? '?щ┝?? : '?꾪깂??

    // 愿?ъ궗 1~2媛?    const interests = [...interestTags, ...(interestCustom.trim() ? [interestCustom.trim()] : [])].slice(0, 2)
    const interestStr = interests.length > 0 ? `${interests.join(', ')} 醫뗭븘?? ` : ''

    // ?レ뼱?섎뒗 寃?1媛?    const dislikes = [...dislikeTags, ...(dislikeCustom.trim() ? [dislikeCustom.trim()] : [])].slice(0, 1)
    const dislikeStr = dislikes.length > 0 ? `${dislikes[0]}? 吏덉깋. ` : ''

    // ?좏샇 ?⑥꽦 (sex ?쒖쇅, 媛꾩젒 ?쒗쁽)
    const lookPref = { ?쇨뎬: prefFace, ?? prefHeight, 泥닿꺽: prefBodyLook, ?⑥뀡: prefFashion }
    const persPref = { 吏?곸씤: prefIntel, ?좊㉧?덈뒗: prefHumor, ?ㅼ젙?? prefVirtue, 留ㅻ꼫?덈뒗: prefManner }
    const topLookPref = Object.entries(lookPref).sort((a,b)=>b[1]-a[1])[0][0]
    const topPersPref = Object.entries(persPref).sort((a,b)=>b[1]-a[1])[0][0]
    const wealthStr = prefWealth >= 60 ? ', 寃쎌젣?곸쑝濡??덉젙?곸씤' : ''
    const prefStr = `${topLookPref} 醫뗪퀬${wealthStr} ${topPersPref} ?⑥옄?먭쾶 ?뚮젮.`

    return `${marriedLabel} ${ageLabel} ${job.trim()}. ${bodyLabel} ${topLook}. ${interestStr}${dislikeStr}${prefStr}`
  })()

  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const isEdit = !!d
  const [phase, setPhase] = useState<'form' | 'profile_review' | 'image_studio'>('form')
  const [profileImages, setProfileImages] = useState<string[]>(d?.imageUrl ? [d.imageUrl] : [])
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0)
  const [profileFinalized, setProfileFinalized] = useState(isEdit && !!d?.imageUrl)
  const [confirmingProfile, setConfirmingProfile] = useState(false)
  const [charId] = useState(d?.id ?? Date.now().toString())
  const [expressionSets, setExpressionSets] = useState<string[][]>(
    d?.expressionImages?.filter(Boolean).length ? [d.expressionImages] : []
  )
  const [selectedExprSet, setSelectedExprSet] = useState(0)
  const [poseSets, setPoseSets] = useState<Record<string, string>[]>(
    d?.poseImages && Object.values(d.poseImages).some(Boolean) ? [d.poseImages] : []
  )
  const [selectedPoseSet, setSelectedPoseSet] = useState(0)
  // ???먯꽭 ?좏깮 ?쒖뒪??  const [poseVariants, setPoseVariants] = useState<Record<string, Record<string, string[]>>>({})
  // poseVariants[poseKey][exprKey] = [url, ...]
  const [selectedPoseImages, setSelectedPoseImages] = useState<Record<string, string>>(() => {
    const base = d?.poseImages ?? {}
    try {
      const lsKey = `hotspots_${d?.id ?? ''}`
      if (d?.id) {
        const saved = JSON.parse(localStorage.getItem(lsKey) ?? '{}')
        return { ...base, ...saved }
      }
    } catch {}
    return base
  })
  const [activePoseKey, setActivePoseKey] = useState<string | null>(null)
  const [activeExprStep, setActiveExprStep] = useState<'aroused' | 'climax' | null>(null)
  const [generatingVariants, setGeneratingVariants] = useState(false)
  const [variantProgress, setVariantProgress] = useState('')
  const [poseSprites, setPoseSprites] = useState<Record<string, string[]>>(() => {
    if (!d?.poseImages) return {}
    const sprites: Record<string, string[]> = {}
    Object.entries(d.poseImages).forEach(([k, v]) => {
      const m = k.match(/^(.+)_sprite_(\d+)$/)
      if (m && v) {
        const key = m[1]; const idx = parseInt(m[2])
        if (!sprites[key]) sprites[key] = []
        sprites[key][idx] = v
      }
    })
    return sprites
  })
  const [spriteGenerating, setSpriteGenerating] = useState<Record<string, boolean>>({})
  const [hotspotAnalyzing, setHotspotAnalyzing] = useState<Record<string, boolean>>({})
  const [hotspotEditorInfo, setHotspotEditorInfo] = useState<{ poseKey: string; exprKey: 'aroused' | 'climax'; imageUrl: string; savedZones?: HotspotZone[]; isSpriteEdit?: boolean } | null>(null)
  const [enlargedSprite, setEnlargedSprite] = useState<{ urls: string[]; poseKey: string; exprKey: 'aroused' | 'climax' } | null>(null)
  const [variantOverlay, setVariantOverlay] = useState<{ poseKey: string; exprKey: string; urls: string[] } | null>(null)
  const [variantZoom, setVariantZoom] = useState<string | null>(null)
  const [variantZoomScale, setVariantZoomScale] = useState(1)
  const exprSectionRef = React.useRef<HTMLDivElement>(null)
  const variantZoomFromSelected = React.useRef(false)
  const [variantPan, setVariantPan] = useState({ x: 0, y: 0 })
  const variantDrag = React.useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const variantWasDragging = React.useRef(false)
  const variantAbortController = React.useRef<AbortController | null>(null)
  const profileAbortController = React.useRef<AbortController | null>(null)
  const [profileZoomScale, setProfileZoomScale] = useState(1)
  const [profilePan, setProfilePan] = useState({ x: 0, y: 0 })
  const profileDragRef = React.useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const profileWasDragging = React.useRef(false)
  const profileImgWrapRef = React.useRef<HTMLDivElement>(null)
  const profileEnlargedWrapRef = React.useRef<HTMLDivElement>(null)
  const [exprZoomScale, setExprZoomScale] = useState(1)
  const [exprPan, setExprPan] = useState({ x: 0, y: 0 })
  const exprDragRef = React.useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const [generatingExpr, setGeneratingExpr] = useState(false)
  const [generatingPose, setGeneratingPose] = useState(false)
  const [selectedBgKey, setSelectedBgKey] = useState('bed')
  const [enlargedPose, setEnlargedPose] = useState(false)
  const [enlargedExprIdx, setEnlargedExprIdx] = useState<number | null>(null)
  const [enlargedPoseIdx, setEnlargedPoseIdx] = useState<number | null>(null)

  const MAX_PROFILE_IMGS = 5
  const [enlargedProfile, setEnlargedProfile] = useState(false)
  const [enlargedExpr, setEnlargedExpr] = useState(false)

  // Storage?먯꽌 湲곗〈 ?ㅽ봽?쇱씠??蹂듭썝
  useEffect(() => {
    if (!charId) return
    supabase.storage.from('char-images').list(charId).then(({ data: files }) => {
      if (!files) return
      const sprites: Record<string, string[]> = {}
      files.forEach(f => {
        const m = f.name.match(/^pose_(.+)_sprite_(\d+)\.png$/)
        if (!m) return
        const key = m[1]; const idx = parseInt(m[2])
        const { data } = supabase.storage.from('char-images').getPublicUrl(`${charId}/${f.name}`)
        if (!sprites[key]) sprites[key] = []
        sprites[key][idx] = data.publicUrl
      })
      if (Object.keys(sprites).length > 0)
        setPoseSprites(prev => ({ ...sprites, ...prev }))
    })
  }, [charId])

  // non-passive wheel: 硫붿씤 ?≪옄
  useEffect(() => {
    const el = profileImgWrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setProfileZoomScale(s => { const n = Math.min(4, Math.max(1, s - e.deltaY * 0.003)); if (n === 1) setProfilePan({ x: 0, y: 0 }); return n })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // non-passive wheel: enlarged 紐⑤떖
  useEffect(() => {
    const el = profileEnlargedWrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setProfileZoomScale(s => { const n = Math.min(4, Math.max(1, s - e.deltaY * 0.003)); if (n === 1) setProfilePan({ x: 0, y: 0 }); return n })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [enlargedProfile])

  const toggleTag = (tag: string, list: string[], setList: (v: string[]) => void, max: number) => {
    if (list.includes(tag)) setList(list.filter(t => t !== tag))
    else if (list.length < max) setList([...list, tag])
  }

  const buildPartialChar = () => {
    const ageNum = parseInt(age)
    return {
      id: charId, age: ageNum, bodyType, face, body, fashion,
      appearanceDesc: buildAppearanceDesc(),
      location, nickname: nickname.trim(), job: job.trim(),
    } as Parameters<typeof generateProfileImage>[0]
  }

  // ?꾨줈???앹꽦 痍⑥냼
  const handleCancelProfile = async () => {
    profileAbortController.current?.abort()
  }

  // ?꾨줈???대?吏 5???앹꽦 (怨듯넻)
  const generateProfileSet = async (prevImages: string[] = []) => {
    // ?댁쟾 ?대?吏 ?꾨? ??젣
    prevImages.forEach(url => { if (url) deleteImageFromStorage(url) })

    const controller = new AbortController()
    profileAbortController.current = controller
    setGenerating(true)
    setProfileImages([])
    setSelectedProfileIdx(0)
    setGenProgress(`0 / ${MAX_PROFILE_IMGS}`)

    const char = buildPartialChar()
    let count = 0
    const results: string[] = []

    await Promise.all(
      Array.from({ length: MAX_PROFILE_IMGS }).map(async (_, i) => {
        try {
          const url = await generateProfileImage(char as any, true, controller.signal)
          if (controller.signal.aborted) { deleteImageFromStorage(url); return }
          results[i] = url
          count++
          setGenProgress(`${count} / ${MAX_PROFILE_IMGS}`)
          setProfileImages([...results].filter(Boolean))
        } catch (e: any) {
          if (e?.name !== 'AbortError') console.error(`?꾨줈??${i+1} ?앹꽦 ?ㅽ뙣:`, e)
        }
      })
    )

    setGenerating(false)
    setGenProgress('')
    profileAbortController.current = null
  }

  // 1?④퀎: ???꾨즺 ??5???앹꽦
  const handleComplete = async () => {
    if (!nickname.trim()) { setError('?됰꽕?꾩쓣 ?낅젰?댁＜?몄슂.'); return }
    if (!job.trim()) { setError('吏곸뾽???낅젰?댁＜?몄슂.'); return }
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < 20 || ageNum > 49) { setError('?섏씠瑜??щ컮瑜닿쾶 ?낅젰?댁＜?몄슂. (20~49)'); return }
    setError('')
    if (isEdit) { setPhase('image_studio'); return }
    setPhase('profile_review')
    await generateProfileSet(profileImages)
  }

  // ?ъ깮?? ?꾩옱 5???꾨? ??젣 ???덈줈 5??  const handleRegenProfile = async () => {
    await generateProfileSet(profileImages)
  }

  // ?꾨줈???뺤젙 ??image_studio ?④퀎濡?  const handleFinalizeProfile = () => {
    const imageUrl = profileImages[selectedProfileIdx]

    // ?좏깮 ?????꾨줈???대?吏 Storage?먯꽌 ??젣
    console.log('[FinalizeProfile] total images:', profileImages.length, 'selected idx:', selectedProfileIdx, 'selected url:', imageUrl)
    profileImages.forEach((url, i) => {
      if (i !== selectedProfileIdx && url) {
        console.log('[FinalizeProfile] deleting:', url)
        deleteImageFromStorage(url)
      }
    })

    setProfileImages([imageUrl])
    setSelectedProfileIdx(0)
    setProfileFinalized(true)
    setConfirmingProfile(false)

    // 湲곗〈 ?쒖젙 ?대?吏 ??젣
    expressionSets.forEach(set => {
      set.forEach(url => { if (url) deleteImageFromStorage(url) })
    })
    setExpressionSets([])
    setSelectedExprSet(0)

    // 湲곗〈 ?먯꽭 ?대?吏 ??젣 (variants + selected)
    Object.values(poseVariants).forEach(exprMap => {
      Object.values(exprMap).forEach(urls => {
        urls.forEach(url => { if (url) deleteImageFromStorage(url) })
      })
    })
    Object.values(selectedPoseImages).forEach(url => { if (url) deleteImageFromStorage(url) })
    setPoseVariants({})
    setSelectedPoseImages({})

    setPhase('image_studio')
    setTimeout(() => exprSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  const MAX_SETS = 5

  // ?쒖젙 5???앹꽦 ??理쒕? MAX_SETS ?명듃源뚯? append, 珥덇낵 ??媛???ㅻ옒???명듃 ??젣
  const handleGenExpressions = async () => {
    setGeneratingExpr(true)
    try {
      const result = await generateExpressionImages(
        buildPartialChar() as any,
        (done, total, label) => setGenProgress(`?쒖젙 ?앹꽦 以?.. ${label} (${done + 1}/${total})`),
        { randomSeed: true, profileImageUrl: profileImages[selectedProfileIdx] }
      )
      setExpressionSets(prev => {
        const next = [...prev, result]
        if (next.length > MAX_SETS) {
          next.splice(0, next.length - MAX_SETS).forEach(set =>
            set.forEach(url => { if (url) deleteImageFromStorage(url) })
          )
        }
        setSelectedExprSet(next.length - 1)
        return next
      })
    } catch (e) { console.error('?쒖젙 ?앹꽦 ?ㅽ뙣:', e) }
    setGenProgress('')
    setGeneratingExpr(false)
  }

  // ?먯꽭 8???앹꽦 (理쒕? 5?명듃) - 湲곗〈 諛⑹떇 ?좎?
  const handleGenPoses = async () => {
    if (expressionSets.length === 0) { alert('?쒖젙 ?대?吏瑜?癒쇱? ?앹꽦?댁＜?몄슂.\n?쒖젙 ?대?吏 ?앹꽦 ???먯꽭 ?대?吏瑜?留뚮뱾 ???덉뒿?덈떎.'); return }
    if (poseSets.length >= MAX_SETS) return
    setGeneratingPose(true)
    try {
      const result = await generatePoseImages(
        buildPartialChar() as any,
        (done, total, label) => setGenProgress(`?먯꽭 ?앹꽦 以?.. ${label} (${done + 1}/${total})`),
        { randomSeed: poseSets.length > 0, profileImageUrl: profileImages[selectedProfileIdx] ?? profileImages[0] }
      )
      setPoseSets(prev => {
        const next = [...prev, result]
        setSelectedPoseSet(next.length - 1)
        return next
      })
    } catch (e) { console.error('?먯꽭 ?앹꽦 ?ㅽ뙣:', e) }
    setGenProgress('')
    setGeneratingPose(false)
  }

  // ??諛⑹떇: ?먯꽭蹂??쒖젙 5?μ뵫 ?앹꽦
  const handleCancelVariants = () => {
    variantAbortController.current?.abort()
  }

  const handleGenVariants = async (poseKey: string, exprKey: 'aroused' | 'climax') => {
    if (expressionSets.length === 0) { alert('?쒖젙 ?대?吏瑜?癒쇱? ?앹꽦?댁＜?몄슂.\n?쒖젙 ?대?吏 ?앹꽦 ???먯꽭 ?대?吏瑜?留뚮뱾 ???덉뒿?덈떎.'); return }
    const controller = new AbortController()
    variantAbortController.current = controller
    setActivePoseKey(poseKey)
    setActiveExprStep(exprKey)
    setGeneratingVariants(true)
    const exprLabel = POSE_EXPRESSIONS.find(e => e.key === exprKey)?.label ?? exprKey
    const poseLabel = POSES.find(p => p.key === poseKey)?.label ?? poseKey
    try {
      const urls = await generatePoseVariants(
        poseKey, exprKey,
        buildPartialChar() as any,
        5,
        (done, total) => setVariantProgress(`${poseLabel} 쨌 ${exprLabel} ${done}/${total}`),
        { profileImageUrl: profileImages[selectedProfileIdx], signal: controller.signal, bgKey: selectedBgKey }
      )
      if (!controller.signal.aborted) {
        const validUrls = urls.filter(Boolean)
        setPoseVariants(prev => {
          // ?댁쟾 variants ??젣 (?좏깮???대?吏 ?쒖쇅)
          const prevUrls = prev[poseKey]?.[exprKey] ?? []
          const chosen = selectedPoseImages[`${poseKey}_${exprKey}`]
          prevUrls.forEach(u => {
            if (!u || u === chosen) return
            const prevBase = u.split('?')[0]
            const overwritten = urls.some(nu => nu.split('?')[0] === prevBase)
            if (!overwritten) deleteImageFromStorage(u)
          })
          return {
            ...prev,
            [poseKey]: { ...(prev[poseKey] ?? {}), [exprKey]: urls }
          }
        })
        // ?앹꽦 ?꾨즺 利됱떆 ?ㅻ쾭?덉씠 ?닿린 ???좏깮 ?꾧퉴吏 ?ㅻⅨ 踰꾪듉 鍮꾪솢?깊솕
        if (validUrls.length > 0) {
          setVariantOverlay({ poseKey, exprKey, urls: validUrls })
          setVariantZoom(validUrls[0])
          setVariantZoomScale(1)
          setVariantPan({ x: 0, y: 0 })
          variantZoomFromSelected.current = false
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error('variant ?앹꽦 ?ㅽ뙣:', e)
    }
    setVariantProgress('')
    setGeneratingVariants(false)
    variantAbortController.current = null
  }

  const handleSelectExprSet = (idx: number) => {
    const selected = expressionSets[idx]
    expressionSets.forEach((set, i) => {
      if (i !== idx) set.forEach(url => { if (url) deleteImageFromStorage(url) })
    })
    setExpressionSets([selected])
    setSelectedExprSet(0)
  }

  const handleSelectVariant = async (poseKey: string, exprKey: string, url: string) => {
    const slotKey = `${poseKey}_${exprKey}`
    const variants = poseVariants[poseKey]?.[exprKey] ?? []
    variants.forEach(u => { if (u && u !== url) deleteImageFromStorage(u) })
    const prevUrl = selectedPoseImages[slotKey]
    if (prevUrl && prevUrl !== url) deleteImageFromStorage(prevUrl)
    setPoseVariants(prev => ({
      ...prev,
      [poseKey]: { ...(prev[poseKey] ?? {}), [exprKey]: [url] }
    }))
    setSelectedPoseImages(prev => ({ ...prev, [slotKey]: url }))

  }

  // 理쒖쥌 ???諛??꾨즺
  const handleSaveAndComplete = async () => {
    const imageUrl = profileImages[0]
    setGenerating(true)
    setGenProgress('?곗씠?????以?..')

    const char: FemaleCharacterData = {
      id: charId,
      nickname: nickname.trim(), age: parseInt(age), married, job: job.trim(),
      location, bodyType, intro: autoIntro,
      heightCm, face, body, fashion,
      interestTags, interestCustom, dislikeTags, dislikeCustom,
      personality, memo, erogenous,
      prefAge: { age20: prefAge20, age30: prefAge30, age40: prefAge40 },
      prefLook: { face: prefFace, height: prefHeight, body: prefBodyLook, fashion: prefFashion },
      prefWealth,
      prefPersonality: { intel: prefIntel, humor: prefHumor, virtue: prefVirtue, manner: prefManner },
      prefErect: { power: prefPower, duration: prefDuration, hardness: prefHardness, tech: prefTech },
      prefSize,
      prefPose: { ...prefPose, side: poseSideAuto }, smTendency, dateCostShare,
      appearanceDesc: buildAppearanceDesc(),
      hairColor: hairColor || undefined,
      hairLength: hairLength || undefined,
      glasses,
      imageUrl,
      expressionImages: expressionSets[selectedExprSet] ?? [],
      poseImages: {
        ...selectedPoseImages,
        ...Object.fromEntries(
          Object.entries(poseSprites).flatMap(([k, urls]) =>
            urls.map((url, i) => [`${k}_sprite_${i}`, url])
          )
        ),
      },
      createdAt: new Date().toISOString(),
    }

    // ?좏깮 ?????쒖젙/?먯꽭 ?명듃 Storage?먯꽌 ??젣
    const urlToPath = (url: string) => decodeURIComponent(url.split('/char-images/')[1]?.split('?')[0] ?? '')
    const toDelete: string[] = []
    expressionSets.forEach((set, i) => {
      if (i !== selectedExprSet) set.forEach(url => { if (url) toDelete.push(urlToPath(url)) })
    })
    // ?좏깮 ?????ъ쫰 variant ??젣
    Object.entries(poseVariants).forEach(([poseKey, exprMap]) => {
      Object.entries(exprMap).forEach(([exprKey, urls]) => {
        const chosen = selectedPoseImages[`${poseKey}_${exprKey}`]
        urls.forEach(url => { if (url && url !== chosen) toDelete.push(urlToPath(url)) })
      })
    })
    if (toDelete.length > 0) {
      await supabase.storage.from('char-images').remove(toDelete.filter(Boolean))
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('female_characters').upsert({
        id: charId,
        creator_id: user?.id ?? null,
        nickname: char.nickname, age: char.age, married: char.married,
        job: char.job, location: char.location, body_type: char.bodyType,
        intro: char.intro, height_cm: char.heightCm,
        face: char.face, body: char.body, fashion: char.fashion,
        stats: {
          interestTags, interestCustom, dislikeTags, dislikeCustom,
          personality, memo, erogenous,
          prefAge: char.prefAge, prefLook: char.prefLook, prefWealth,
          prefPersonality: char.prefPersonality, prefErect: char.prefErect,
          prefSize: char.prefSize,
          prefPose: { ...prefPose, side: poseSideAuto }, smTendency, dateCostShare,
          appearanceDesc: buildAppearanceDesc(),
          hairColor: hairColor || undefined,
          hairLength: hairLength || undefined,
          glasses,
        },
        image_url: imageUrl ?? null,
        expression_images: (expressionSets[selectedExprSet] ?? []).length ? expressionSets[selectedExprSet] : null,
        pose_images: Object.keys(selectedPoseImages).length ? {
          ...selectedPoseImages,
          ...Object.fromEntries(
            Object.entries(poseSprites).flatMap(([k, urls]) =>
              urls.map((url, i) => [`${k}_sprite_${i}`, url])
            )
          ),
        } : null,
      })
    } catch (e) { console.error('DB ????ㅽ뙣:', e) }

    setGenerating(false)
    setGenProgress('')
    onComplete(char)
  }

  const sensColor = (v: number) => v < 0 ? '#e94560' : v === 0 ? '#ffffff44' : v >= 4 ? '#c9a84c' : v >= 2 ? '#66BB6A' : '#ffffff88'
  const sensColor10 = (v: number) => v === 0 ? '#e94560' : v >= 7 ? '#c9a84c' : v >= 5 ? '#66BB6A' : '#ffffff66'

  // 3?④퀎: ?쒖젙쨌?먯꽭 ?앹꽦 ?ㅽ뒠?붿삤
  if (phase === 'image_studio') {
    const busy = generatingExpr || generatingPose || generating || generatingVariants || variantOverlay !== null
    const bodyZoom = parseFloat(getComputedStyle(document.body).zoom) || 1
    const fitH = (ratio: number) => Math.round(window.innerHeight * ratio / bodyZoom)
    return (
      <div style={S.container}>

        {/* ?? 紐⑤떖?? S.container 吏곸냽 (position:fixed 蹂댁옣) ?? */}
        {enlargedSprite && (() => {
          const { urls, poseKey: sPoseKey, exprKey: sExprKey } = enlargedSprite
          // ?좊땲 ?꾩슜 sprite_hotspots ???놁쑝硫??ъ쭊 hotspots(default)
          const spriteKey = `${sPoseKey}_${sExprKey}_sprite_hotspots`
          const photoKey = `${sPoseKey}_${sExprKey}_hotspots`
          const photoFallback = `${sPoseKey}_aroused_hotspots`
          const sHotspots: HotspotZone[] = (
            (selectedPoseImages[spriteKey] as any) ??
            (selectedPoseImages[photoKey] as any) ??
            (selectedPoseImages[photoFallback] as any) ?? []
          )
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
              onClick={() => setEnlargedSprite(null)}>
              <div style={{ position: 'relative', height: fitH(0.85), aspectRatio: '3/4', borderRadius: 12, border: '2px solid #e9456055', overflow: 'hidden', flexShrink: 0 }}
                onClick={e => e.stopPropagation()}>
                <SpriteAnimation urls={urls} fps={4} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {sHotspots.length > 0 && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {sHotspots.map((z, i) => (
                      <g key={i} transform={`rotate(${z.rotation ?? 0}, ${z.cx}, ${z.cy})`}>
                        <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                          fill={z.color + '33'} stroke={z.color} strokeWidth={0.8} />
                        <text x={z.cx} y={z.cy} textAnchor="middle" dominantBaseline="middle"
                          fill="#fff" fontSize={3.5} fontWeight="bold" style={{ userSelect: 'none' }}>
                          {z.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
                {/* ?뱧 ?꾩튂議곗젙 ???좊땲 ?꾩슜 sprite_hotspots ?ㅻ줈 ???(?ъ쭊怨??낅┰) */}
                <button
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(201,168,76,0.85)', border: 'none', color: '#000', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}
                  onClick={e => {
                    e.stopPropagation()
                    const savedZones: HotspotZone[] = (
                      (selectedPoseImages[spriteKey] as any) ??
                      (selectedPoseImages[photoKey] as any) ??
                      (selectedPoseImages[photoFallback] as any)
                    )
                    setHotspotEditorInfo({ poseKey: sPoseKey, exprKey: sExprKey, imageUrl: urls[0], savedZones, isSpriteEdit: true })
                  }}>
                  ?뱧 ?꾩튂議곗젙 (?좊땲)
                </button>
                {sHotspots.length === 0 && (
                  <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#e9456088', fontSize: 11 }}>
                    ?뱧 ?깃컧? 誘몄꽕??                  </div>
                )}
              </div>
              <button style={{ position: 'fixed', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 3001 }}
                onClick={() => setEnlargedSprite(null)}>??/button>
            </div>
          )
        })()}
        {enlargedProfile && profileImages[0] && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setEnlargedProfile(false); setProfileZoomScale(1); setProfilePan({ x: 0, y: 0 }) }}>
            <div
              ref={profileEnlargedWrapRef}
              style={{ overflow: 'hidden', width: Math.min(window.innerWidth * 0.9, 600), height: Math.min(window.innerHeight * 0.85, 800), display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: profileDragRef.current ? 'grabbing' : 'grab', userSelect: 'none', borderRadius: 12, border: '2px solid #c9a84c55' }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => {
                if (e.button !== 0) return
                profileDragRef.current = { startX: e.clientX, startY: e.clientY, panX: profilePan.x, panY: profilePan.y }
                const onMove = (ev: MouseEvent) => { if (!profileDragRef.current) return; setProfilePan({ x: profileDragRef.current.panX + ev.clientX - profileDragRef.current.startX, y: profileDragRef.current.panY + ev.clientY - profileDragRef.current.startY }) }
                const onUp = () => { profileDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); setProfilePan({ x: 0, y: 0 }); setProfileZoomScale(1) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
            >
              <img src={profileImages[0]} alt="????뺣?" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s' }} />
            </div>
            <div style={{ color: '#ffffff44', fontSize: 12, marginTop: 12 }}>?? ?뺣?/異뺤냼 쨌 ?쒕옒洹? ?대룞 쨌 諛붽묑 ?대┃?쇰줈 ?リ린</div>
          </div>
        )}

        {enlargedExpr && expressionSets.length > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, overflowY: 'auto', padding: '20px 10px', cursor: 'zoom-out' }}
            onClick={() => { if (enlargedExprIdx !== null) { setEnlargedExprIdx(null); setExprZoomScale(1); setExprPan({ x: 0, y: 0 }) } else setEnlargedExpr(false) }}>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {enlargedExprIdx !== null ? (
                <>
                  <div
                    style={{ overflow: 'hidden', width: Math.min(672, window.innerWidth - 40), height: Math.min(864, window.innerHeight - 160), display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: exprDragRef.current ? 'grabbing' : 'grab', userSelect: 'none', borderRadius: 12 }}
                    onWheel={e => { e.preventDefault(); setExprZoomScale(s => Math.min(4, Math.max(1, s - e.deltaY * 0.003))) }}
                    onMouseDown={e => {
                      if (e.button !== 0) return
                      exprDragRef.current = { startX: e.clientX, startY: e.clientY, panX: exprPan.x, panY: exprPan.y }
                      const onMove = (ev: MouseEvent) => { if (!exprDragRef.current) return; setExprPan({ x: exprDragRef.current.panX + ev.clientX - exprDragRef.current.startX, y: exprDragRef.current.panY + ev.clientY - exprDragRef.current.startY }) }
                      const onUp = () => { exprDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                      window.addEventListener('mousemove', onMove)
                      window.addEventListener('mouseup', onUp)
                    }}
                  >
                    <img src={(expressionSets[selectedExprSet] ?? [])[enlargedExprIdx]} alt="?뺣?" draggable={false}
                      style={{ width: Math.min(672, window.innerWidth - 40), height: Math.min(864, window.innerHeight - 160), objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c55', transform: `translate(${exprPan.x}px, ${exprPan.y}px) scale(${exprZoomScale})`, transformOrigin: 'center', transition: exprDragRef.current ? 'none' : 'transform 0.05s' }} />
                  </div>
                  <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>{CONVERSATION_EXPRESSIONS[enlargedExprIdx]?.label}</span>
                  <div style={{ color: '#ffffff55', fontSize: 12 }}>?? ?뺣?/異뺤냼 쨌 ?쒕옒洹? ?대룞 쨌 ?대┃?쇰줈 紐⑸줉</div>
                </>
              ) : (
                <>
                  {expressionSets.length > 1 && (
                    <div style={IS.setTabs}>
                      {expressionSets.map((_, i) => (
                        <button key={i} style={{ ...IS.setTab, ...(i === selectedExprSet ? IS.setTabActive : {}) }} onClick={() => { setSelectedExprSet(i); setEnlargedExprIdx(null) }}>?명듃 {i + 1}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                    {(expressionSets[selectedExprSet] ?? []).map((url, i) => url ? (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <img src={url} alt={`?쒖젙${i+1}`} style={{ ...IS.enlargedImg, cursor: 'zoom-in' }}
                          onClick={() => setEnlargedExprIdx(i)} />
                        <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold' }}>{CONVERSATION_EXPRESSIONS[i]?.label}</span>
                      </div>
                    ) : null)}
                  </div>
                  {expressionSets.length > 1 && (
                    <button
                      style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', marginTop: 4 }}
                      onClick={() => { handleSelectExprSet(selectedExprSet); setEnlargedExpr(false); setEnlargedExprIdx(null) }}
                    >???명듃 {selectedExprSet + 1} ?좏깮</button>
                  )}
                  <div style={{ color: '#ffffff44', fontSize: 12 }}>?ъ쭊 ?대┃?쇰줈 2諛??뺣? 쨌 ?명듃 ??쑝濡??꾪솚 쨌 諛붽묑 ?대┃?쇰줈 ?リ린</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5???좏깮 ?ㅻ쾭?덉씠 */}
        {variantOverlay && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '8px 20px 12px' }}
            onClick={() => {
              if (variantWasDragging.current) return
              if (variantZoom) {
                setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 })
                if (variantZoomFromSelected.current) setVariantOverlay(null)
              } else {
                setVariantOverlay(null)
              }
            }}>
            <div onClick={e => { e.stopPropagation(); if (variantZoom && !variantWasDragging.current) { setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); if (variantZoomFromSelected.current) setVariantOverlay(null) } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: window.innerWidth - 40 }}>
              {/* ?ㅻ뜑 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 16 }}>
                  {POSES.find(p => p.key === variantOverlay.poseKey)?.label} 쨌 {POSE_EXPRESSIONS.find(e => e.key === variantOverlay.exprKey)?.label} ??1???좏깮
                </span>
              </div>

              {/* 以??곹깭: 1???ш쾶 + ?ㅽ겕濡??뺣? + ?쒕옒洹??대룞 */}
              {variantZoom ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxHeight: '100vh', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <button onClick={() => { setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); setVariantOverlay(null) }}
                      style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid #ffffff55', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>??/button>
                  <div
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: variantDrag.current ? 'grabbing' : 'grab', userSelect: 'none' }}
                    onWheel={e => {
                      e.preventDefault()
                      setVariantZoomScale(s => Math.min(4, Math.max(1, s - e.deltaY * 0.003)))
                    }}
                    onMouseDown={e => {
                      if (e.button !== 0) return
                      variantWasDragging.current = false
                      variantDrag.current = { startX: e.clientX, startY: e.clientY, panX: variantPan.x, panY: variantPan.y }
                      const onUp = () => {
                        variantDrag.current = null
                        setVariantPan({ x: 0, y: 0 })
                        window.removeEventListener('mouseup', onUp)
                        setTimeout(() => { variantWasDragging.current = false }, 50)
                      }
                      window.addEventListener('mouseup', onUp)
                    }}
                    onMouseMove={e => {
                      if (!variantDrag.current) return
                      variantWasDragging.current = true
                      setVariantPan({
                        x: variantDrag.current.panX + e.clientX - variantDrag.current.startX,
                        y: variantDrag.current.panY + e.clientY - variantDrag.current.startY,
                      })
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <img src={variantZoom} alt="?뺣?" draggable={false}
                      style={{ height: fitH(0.85), width: 'auto', maxWidth: '90vw', objectFit: 'contain', borderRadius: 12, border: '2px solid #c9a84c', transform: `translate(${variantPan.x}px, ${variantPan.y}px) scale(${variantZoomScale})`, transformOrigin: 'center', transition: variantDrag.current ? 'none' : 'transform 0.05s' }} />
                  </div>
                  </div>{/* position:relative wrapper */}
                  <div style={{ color: '#ffffff44', fontSize: 11 }}>?? ?뺣?/異뺤냼 쨌 ?쒕옒洹? ?대룞</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }) }}
                      style={{ background: 'none', border: '1px solid #ffffff44', color: '#ffffff88', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>??紐⑸줉?쇰줈</button>
                    <button onClick={() => {
                      handleSelectVariant(variantOverlay.poseKey, variantOverlay.exprKey, variantZoom)
                      setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); setVariantOverlay(null)
                    }} style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 28px', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>?????ъ쭊 ?좏깮</button>
                  </div>
                </div>
              ) : (
                /* 5??紐⑸줉 ??媛濡??쇰젹 ?ㅽ겕濡?*/
                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto', width: '100%', paddingBottom: 8, justifyContent: 'center' }}>
                  {variantOverlay.urls.map((url, i) => {
                    const imgH = Math.min(Math.round(window.innerHeight * 0.65), 520)
                    const imgW = Math.round(imgH * 3 / 4)
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <img src={url} alt={`${i+1}`} onClick={e => { e.stopPropagation(); variantZoomFromSelected.current = false; setVariantZoom(url); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }) }}
                          style={{ width: imgW, height: imgH, objectFit: 'contain', borderRadius: 8, border: '1px solid #ffffff22', cursor: 'zoom-in' }} />
                        <button onClick={() => { handleSelectVariant(variantOverlay.poseKey, variantOverlay.exprKey, url); setVariantOverlay(null) }}
                          style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 0', width: imgW, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>???좏깮</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {enlargedPose && Object.keys(selectedPoseImages).length > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, overflowY: 'auto', padding: '20px 10px', cursor: 'zoom-out' }}
            onClick={() => { if (enlargedPoseIdx !== null) setEnlargedPoseIdx(null); else setEnlargedPose(false) }}>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {enlargedPoseIdx !== null ? (() => {
                const entries = Object.entries(selectedPoseImages)
                const [key, url] = entries[enlargedPoseIdx] ?? ['', '']
                const [poseKey, exprKey] = key.split('_')
                const poseLabel = POSES.find(p => p.key === poseKey)?.label ?? poseKey
                const exprLabel = POSE_EXPRESSIONS.find(e => e.key === exprKey)?.label ?? exprKey
                return (
                  <>
                    <img src={url} alt="?뺣?" style={{ width: 672, height: 864, objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c55' }} />
                    <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>{poseLabel} / {exprLabel}</span>
                    <div style={{ color: '#ffffff55', fontSize: 12 }}>?대┃?섎㈃ 紐⑸줉?쇰줈 ?뚯븘媛묐땲??/div>
                  </>
                )
              })() : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                    {Object.entries(selectedPoseImages).map(([key, url], i) => {
                      const [poseKey, exprKey] = key.split('_')
                      const poseLabel = POSES.find(p => p.key === poseKey)?.label ?? poseKey
                      const exprLabel = POSE_EXPRESSIONS.find(e => e.key === exprKey)?.label ?? exprKey
                      return url ? (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <img src={url} alt={`?먯꽭${i+1}`} style={{ ...IS.enlargedImg, cursor: 'zoom-in' }}
                            onClick={() => setEnlargedPoseIdx(i)} />
                          <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>{poseLabel} / {exprLabel}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                  <div style={{ color: '#ffffff44', fontSize: 12 }}>?ъ쭊 ?대┃?쇰줈 2諛??뺣? 쨌 諛붽묑 ?대┃?쇰줈 ?リ린</div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c44', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p style={PR.subtitle}>?대?吏 ?ㅽ뒠?붿삤</p>
          <h2 style={PR.name}>{nickname}</h2>
          {isEdit && (
            <button style={{ background: 'transparent', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => setPhase('form')}>??湲곕낯 ?뺣낫 ?섏젙</button>
          )}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'stretch', width: '100%' }}>
            {/* ??쒖씠誘몄? ?쇱そ - ?쒖젙?대?吏 ?믪씠??留욎땄 */}
            <div style={{ flex: '0 0 70%', minWidth: 0 }}>
              {profileImages[0] ? (
                <img src={profileImages[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c44', cursor: 'zoom-in', display: 'block' }} alt="??? onClick={() => setEnlargedProfile(true)} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#ffffff05', borderRadius: 12, border: '1px dashed #ffffff22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#ffffff22', fontSize: 13 }}>??쒖씠誘몄?</span>
                </div>
              )}
            </div>

            {/* ?쒖젙 5???ㅻⅨ履?*/}
          <div ref={exprSectionRef} style={{ ...IS.section, flex: 1, minWidth: 0, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={IS.sectionTitle}>?삃 ?쒖젙 ?대?吏 (5??</div>
              {expressionSets.length > 1 && (
                <span style={{ color: '#c9a84c', fontSize: 12 }}>?명듃 {selectedExprSet + 1} ?좏깮??/span>
              )}
            </div>
            {expressionSets.length > 0 ? (
              <>
                {expressionSets.length > 1 && (
                  <div style={IS.setTabs}>
                    {expressionSets.map((_, i) => (
                      <button key={i} style={{ ...IS.setTab, ...(i === selectedExprSet ? IS.setTabActive : {}) }}
                        onClick={() => setSelectedExprSet(i)}>?명듃 {i + 1}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'zoom-in', width: '100%' }} onClick={() => setEnlargedExpr(true)}>
                  {[0, 1].map(row => {
                    const indices = row === 0 ? [0, 1] : [2, 3]
                    return (
                      <div key={row} style={{ display: 'flex', gap: 4, width: '100%' }}>
                        {indices.map(i => {
                          const url = (expressionSets[selectedExprSet] ?? [])[i]
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              {url ? <img src={url} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: '1px solid #ffffff22' }} alt={`expr${i}`} /> : <div style={{ width: '100%', aspectRatio: '3/4', background: '#ffffff08', borderRadius: 6, border: '1px dashed #ffffff22' }} />}
                              <span style={{ color: '#ffffff88', fontSize: 10 }}>{CONVERSATION_EXPRESSIONS[i]?.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {/* 留덉?留?1媛?- ?덈컲 ?덈퉬 */}
                  {(() => {
                    const url = (expressionSets[selectedExprSet] ?? [])[4]
                    return (
                      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          {url ? <img src={url} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: '1px solid #ffffff22' }} alt="expr4" /> : <div style={{ width: '100%', aspectRatio: '3/4', background: '#ffffff08', borderRadius: 6, border: '1px dashed #ffffff22' }} />}
                          <span style={{ color: '#ffffff88', fontSize: 10 }}>{CONVERSATION_EXPRESSIONS[4]?.label}</span>
                        </div>
                        <div style={{ flex: 1 }} />
                      </div>
                    )
                  })()}
                </div>
                {expressionSets.length > 1 && (
                  <button
                    style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 24px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', marginTop: 4 }}
                    onClick={() => handleSelectExprSet(selectedExprSet)}
                  >???명듃 {selectedExprSet + 1} ?뺤젙</button>
                )}
              </>
            ) : (
              <p style={IS.hint}>????붾㈃?먯꽌 ?ъ슜?섎뒗 ?쒖젙 5醫낆엯?덈떎.</p>
            )}
            <button
              style={{ ...IS.genBtn, opacity: (busy || generatingVariants) ? 0.5 : 1 }}
              disabled={busy || generatingVariants}
              onClick={handleGenExpressions}
            >
              {generatingExpr ? `??${genProgress}` : expressionSets.length > 0 ? '?봽 ?쒖젙 ?ъ깮?? : '?렚 ?쒖젙 5???앹꽦'}
            </button>
          </div>
          </div>

          {/* ?먯꽭 ?대?吏 ???ъ쫰蹂??좏깮 諛⑹떇 */}
          <div style={IS.section}>
            <div style={IS.sectionTitle}>?뵦 ?먯꽭 ?대?吏 (4?먯꽭 횞 2?쒖젙)</div>
            <p style={IS.hint}>?먯꽭瑜??뚮윭 ?λ텇 5????1???좏깮 ???덉젙 5????1???좏깮?섏꽭??</p>


            {/* 4媛??먯꽭 移대뱶 */}
            {POSES.map(({ key: poseKey, label: poseLabel }) => {
              const aroused = selectedPoseImages[`${poseKey}_aroused`]
              const climax = selectedPoseImages[`${poseKey}_climax`]
              const done = !!(aroused && climax)
              const isActive = activePoseKey === poseKey
              const variants = poseVariants[poseKey] ?? {}
              const arousedVariants = variants['aroused'] ?? []
              const climaxVariants = variants['climax'] ?? []

              const colStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRight: '1px solid #ffffff11', paddingRight: 8 }
              const colStyleR: React.CSSProperties = { ...colStyle, borderRight: 'none', paddingRight: 0, paddingLeft: 8 }

              // 媛??쒖젙蹂?踰꾪듉 ?뚮뜑
              const renderCol = (exprKey: 'aroused' | 'climax', label: string, selectedUrl: string | undefined, variantUrls: string[], colSt: React.CSSProperties) => {
                const isGeneratingThis = generatingVariants && activePoseKey === poseKey && activeExprStep === exprKey
                const canGenClimax = false
                return (
                  <div style={colSt}>
                    <span style={{ color: '#ffffff66', fontSize: 11, fontWeight: 'bold' }}>{label}</span>
                    {selectedUrl ? (
                      <img src={selectedUrl}
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: '1px solid #c9a84c', cursor: 'zoom-in' }}
                        onClick={() => { variantZoomFromSelected.current = true; setVariantZoom(selectedUrl); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); setVariantOverlay({ poseKey, exprKey, urls: variantUrls.filter(Boolean).length ? variantUrls.filter(Boolean) : [selectedUrl] }) }}
                        alt={label} />
                    ) : variantUrls.filter(Boolean).length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, width: '100%' }}>
                        {variantUrls.filter(Boolean).map((url, i) => (
                          <img key={i} src={url} alt={`${i+1}`}
                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 4, border: '1px solid #ffffff22', cursor: 'zoom-in' }}
                            onClick={() => { setActivePoseKey(poseKey); setVariantOverlay({ poseKey, exprKey, urls: variantUrls.filter(Boolean) }); setVariantZoom(url); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); variantZoomFromSelected.current = false }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#ffffff08', borderRadius: 6, border: '1px dashed #ffffff22' }} />
                    )}
                    {selectedUrl ? (
                      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                        <button style={{ background: 'none', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 6, padding: '4px 0', flex: 1, fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1 }}
                          disabled={busy}
                          onClick={() => {
                            setSelectedPoseImages(prev => { const n = { ...prev }; delete n[`${poseKey}_${exprKey}`]; return n })
                            setActivePoseKey(poseKey); setActiveExprStep(exprKey)
                            handleGenVariants(poseKey, exprKey)
                          }}>?봽 ?ㅼ떆</button>
                        <button
                          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c66', color: '#c9a84c', borderRadius: 6, padding: '4px 6px', fontSize: 11, cursor: 'pointer' }}
                          title="?깃컧? ?꾩튂 議곗젙"
                          onClick={() => {
                            const savedKey = `${poseKey}_${exprKey}_hotspots`
                            const fallbackKey = `${poseKey}_aroused_hotspots`
                            const savedZones = (selectedPoseImages[savedKey] ?? selectedPoseImages[fallbackKey]) as any
                            setHotspotEditorInfo({ poseKey, exprKey, imageUrl: selectedUrl, savedZones })
                          }}>
                          ?뱧
                        </button>
                      </div>
                    ) : isGeneratingThis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', padding: '8px 0' }}>
                        <style>{`@keyframes col-spin2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                        <div style={{ width: 36, height: 36, border: '3px solid #ffffff22', borderTop: '3px solid #c9a84c', borderRadius: '50%', animation: 'col-spin2 0.8s linear infinite' }} />
                        <span style={{ fontSize: 11, color: '#ffffff88', textAlign: 'center' }}>{variantProgress || '諛곌꼍 ?앹꽦 以?..'}</span>
                        <button style={{ background: '#e9455688', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', width: '100%' }}
                          onClick={handleCancelVariants}>??痍⑥냼</button>
                      </div>
                    ) : variantUrls.filter(Boolean).length > 0 ? (
                      <button style={{ background: 'none', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 6, padding: '4px 0', width: '100%', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1 }}
                        disabled={busy}
                        onClick={() => handleGenVariants(poseKey, exprKey)}>?봽 ?ㅼ떆 ?앹꽦</button>
                    ) : canGenClimax ? (
                      <span style={{ color: '#ffffff33', fontSize: 10 }}>?λ텇 ?좏깮 ??/span>
                    ) : (
                      <button style={{ ...IS.genBtn, margin: 0, width: '100%', fontSize: 11, padding: '4px 0', opacity: (busy || (exprKey === 'climax' && !aroused)) ? 0.35 : 1, cursor: (busy || (exprKey === 'climax' && !aroused)) ? 'not-allowed' : 'pointer' }}
                        disabled={busy || (exprKey === 'climax' && !aroused)}
                        onClick={() => handleGenVariants(poseKey, exprKey)}>
                        ?뵦 ?앹꽦
                      </button>
                    )}
                  </div>
                )
              }

              // ?ㅽ봽?쇱씠???좊땲硫붿씠??而щ읆 ?뚮뜑 (?λ텇+?덉젙 媛곴컖)
              const renderVideoCol = (exprKey: 'aroused' | 'climax', label: string, colSt: React.CSSProperties) => {
                const spriteKey = `${poseKey}_${exprKey}`
                const spriteUrls = poseSprites[spriteKey]
                const isGen = spriteGenerating[spriteKey]
                const srcUrl = selectedPoseImages[`${poseKey}_${exprKey}`]
                const done = !!spriteUrls?.length
                return (
                  <div style={colSt}>
                    <span style={{ color: '#ffffff66', fontSize: 11, fontWeight: 'bold' }}>{label} ?좊땲</span>
                    {done ? (
                      <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 6, border: '1px solid #e9456066', overflow: 'hidden', cursor: 'zoom-in' }}
                        onClick={() => setEnlargedSprite({ urls: spriteUrls, poseKey, exprKey })}>
                        <SpriteAnimation urls={spriteUrls} fps={4} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#ffffff05', borderRadius: 6, border: '1px dashed #ffffff11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22, color: '#ffffff15' }}>?렄截?/span>
                      </div>
                    )}
                    {isGen ? (
                      <button style={{ border: '1px solid #e9456055', borderRadius: 6, padding: '4px 0', width: '100%', fontSize: 11, cursor: 'not-allowed', background: 'none', color: '#e94560' }}>
                        ???앹꽦 以?..
                      </button>
                    ) : (
                      <button
                        style={{ background: srcUrl ? 'rgba(233,69,96,0.15)' : 'none', border: `1px solid ${srcUrl ? '#e9456055' : '#ffffff11'}`, color: srcUrl ? '#e94560' : '#ffffff22', borderRadius: 6, padding: '4px 0', width: '100%', fontSize: 11, cursor: srcUrl && !busy ? 'pointer' : 'not-allowed', opacity: srcUrl && !busy ? 1 : 0.5 }}
                        onClick={async () => {
                          if (!srcUrl || busy) return
                          setSpriteGenerating(prev => ({ ...prev, [spriteKey]: true }))
                          try {
                            const urls = await generatePoseSprite(srcUrl, charId, spriteKey)
                            setPoseSprites(prev => ({ ...prev, [spriteKey]: urls }))
                            const { data: row } = await supabase.from('female_characters').select('pose_images').eq('id', charId).single()
                            const merged = { ...(row?.pose_images ?? {}), ...Object.fromEntries(urls.map((u, i) => [`${spriteKey}_sprite_${i}`, u])) }
                            await supabase.from('female_characters').update({ pose_images: merged }).eq('id', charId)
                          } catch (e: any) {
                            alert(`?좊땲硫붿씠???앹꽦 ?ㅽ뙣: ${e.message}`)
                          } finally {
                            setSpriteGenerating(prev => ({ ...prev, [spriteKey]: false }))
                          }
                        }}
                      >{done ? '?봽 ?ъ깮?? : '???좊땲 ?앹꽦'}</button>
                    )}
                    {srcUrl && (() => {
                      const hasHotspot = !!(selectedPoseImages[`${poseKey}_${exprKey}_hotspots`] ?? selectedPoseImages[`${poseKey}_aroused_hotspots`])
                      return (
                        <div style={{ fontSize: 10, textAlign: 'center', padding: '3px 0', color: hasHotspot ? '#66BB6A' : '#e9456088' }}>
                          {hasHotspot ? '?뱧 ?깃컧? ?곸슜?? : '?뱧 ?깃컧? 誘몄꽕??}
                        </div>
                      )
                    })()}
                  </div>
                )
              }

              return (
                <div key={poseKey} style={{ background: '#ffffff08', borderRadius: 10, padding: '10px 12px', marginBottom: 10, border: done ? '1px solid #c9a84c55' : '1px solid #ffffff11' }}>
                  {/* ?ㅻ뜑 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: done ? '#c9a84c' : '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                      {done ? '?? : '燧?} {poseLabel}
                    </span>
                  </div>

                  {/* ?λ텇 / ?덉젙 / ?λ텇?곸긽 / ?덉젙?곸긽 ??4???숈씪 ?ш린 */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {renderCol('aroused', '?λ텇', aroused, arousedVariants, colStyle)}
                    {renderCol('climax', '?덉젙', climax, climaxVariants, colStyle)}
                    {renderVideoCol('aroused', '?λ텇', colStyle)}
                    {renderVideoCol('climax', '?덉젙', { ...colStyle, borderRight: 'none', paddingRight: 0 })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ?レ뒪???쒕옒洹??먮뵒??紐⑤떖 */}
          {hotspotEditorInfo && (
            <HotspotEditor
              imageUrl={hotspotEditorInfo.imageUrl}
              poseKey={hotspotEditorInfo.poseKey}
              initialZones={hotspotEditorInfo.savedZones}
              onSave={async (zones) => {
                // ?좊땲 ?몄쭛?대㈃ sprite_hotspots, ?ъ쭊 ?몄쭛?대㈃ hotspots ???쒕줈 ?낅┰
                const key = hotspotEditorInfo.isSpriteEdit
                  ? `${hotspotEditorInfo.poseKey}_${hotspotEditorInfo.exprKey}_sprite_hotspots`
                  : `${hotspotEditorInfo.poseKey}_${hotspotEditorInfo.exprKey}_hotspots`
                setSelectedPoseImages(prev => ({ ...prev, [key]: zones as any }))
                setHotspotEditorInfo(null)

                // localStorage 諛깆뾽 (DB ?ㅽ뙣?대룄 ?덈줈怨좎묠 ??蹂듭썝)
                try {
                  const lsKey = `hotspots_${charId}`
                  const existing = JSON.parse(localStorage.getItem(lsKey) ?? '{}')
                  localStorage.setItem(lsKey, JSON.stringify({ ...existing, [key]: zones }))
                } catch {}

                // DB update (row媛 ?놁쑝硫??꾨Т寃껊룄 ???????꾨즺 ??????ы븿??
                try {
                  const { data: row, error: selErr } = await supabase
                    .from('female_characters').select('pose_images').eq('id', charId).maybeSingle()
                  if (selErr) throw selErr
                  if (row) {
                    const { error: upErr } = await supabase
                      .from('female_characters')
                      .update({ pose_images: { ...(row.pose_images ?? {}), [key]: zones } })
                      .eq('id', charId)
                    if (upErr) throw upErr
                  }
                } catch (e: any) {
                  console.error('?レ뒪??DB ????ㅽ뙣:', e)
                  alert(`?좑툘 DB ????ㅽ뙣: ${e?.message ?? e}\n?덈줈怨좎묠?대룄 ?대쾲 ?몄뀡?먯꽑 ?좎??⑸땲??`)
                  return
                }
                const label = hotspotEditorInfo.isSpriteEdit ? '?좊땲' : '?ъ쭊'
                alert(`??${hotspotEditorInfo.poseKey} ${hotspotEditorInfo.exprKey === 'aroused' ? '?λ텇' : '?덉젙'} ${label} ?깃컧? ????꾨즺`)
              }}
              onClose={() => setHotspotEditorInfo(null)}
            />
          )}

          {/* ?꾨즺 踰꾪듉 */}
          <button
            style={{ ...PR.finalBtn, opacity: busy ? 0.5 : 1, width: '100%' }}
            disabled={busy}
            onClick={handleSaveAndComplete}
          >
            {generating ? `??${genProgress}` : '?뮶 ??ν븯怨??꾨즺'}
          </button>
          <p style={{ color: '#ffffff33', fontSize: 11 }}>?쒖젙쨌?먯꽭 ?놁씠?????媛?? ?섏쨷??異붽??????덉뒿?덈떎.</p>
        </div>
      </div>
    )
  }

  const PR: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    enlargeOverlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' },
    enlargedImg: { maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: s(12), border: '2px solid #c9a84c55' },
    confirmBox: { background: '#1a1a2e', border: '1px solid #c9a84c55', borderRadius: s(16), padding: `${s(28)}px ${s(24)}px`, width: s(300), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s(12) },
    confirmTitle: { color: '#c9a84c', fontSize: s(15), fontWeight: 'bold', margin: 0, textAlign: 'center' as const },
    confirmPreview: { width: s(140), height: s(182), objectFit: 'cover', borderRadius: s(10), border: '2px solid #c9a84c44' },
    confirmSub: { color: '#ffffff66', fontSize: s(12), margin: 0, textAlign: 'center' as const },
    confirmBtns: { display: 'flex', gap: s(10), width: '100%' },
    cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: s(8), padding: `${s(10)}px`, fontSize: s(13), cursor: 'pointer' },
    okBtn: { flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)', color: '#fff', border: 'none', borderRadius: s(8), padding: `${s(10)}px`, fontSize: s(13), fontWeight: 'bold', cursor: 'pointer' },
    card: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: `${s(32)}px ${s(24)}px ${s(80)}px`, gap: s(16) },
    subtitle: { color: '#ffffff55', fontSize: s(13), margin: 0 },
    name: { color: '#c9a84c', fontSize: s(26), fontWeight: 'bold', margin: 0 },
    meta: { color: '#ffffff66', fontSize: s(13), margin: 0 },
    imgWrap: { background: 'rgba(0,0,0,0.3)', border: '1px solid #ffffff11', borderRadius: s(16), padding: s(12) },
    mainImg: { width: s(220), height: s(286), objectFit: 'cover', borderRadius: s(12), border: '2px solid #c9a84c44', display: 'block' },
    imgPlaceholder: { width: s(220), height: s(286), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff33', fontSize: s(13) },
    thumbRow: { display: 'flex', gap: s(8) },
    thumb: { width: s(60), height: s(78), objectFit: 'cover', borderRadius: s(8), cursor: 'pointer' },
    regenBtn: { background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c55', color: '#c9a84c', borderRadius: s(8), padding: `${s(8)}px ${s(20)}px`, fontSize: s(13), cursor: 'pointer' },
    finalBtn: { background: 'linear-gradient(90deg, #c9a84c, #e94560)', color: '#fff', border: 'none', borderRadius: s(10), padding: `${s(14)}px ${s(28)}px`, fontSize: s(15), fontWeight: 'bold', cursor: 'pointer' },
    backBtn: { background: 'transparent', border: '1px solid #ffffff22', color: '#ffffff55', borderRadius: s(8), padding: `${s(8)}px ${s(16)}px`, fontSize: s(13), cursor: 'pointer' },
  }

  const S: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)',
      display: 'flex', justifyContent: 'center', padding: `${s(24)}px ${s(16)}px`,
    },
    inner: { width: '100%', maxWidth: s(960), display: 'flex', flexDirection: 'column', gap: s(16) },
    header: { textAlign: 'center', padding: `${s(8)}px 0 ${s(4)}px` },
    backBtn: {
      background: 'transparent', border: '1px solid #ffffff22', color: '#ffffff66',
      borderRadius: s(6), padding: `${s(6)}px ${s(14)}px`, cursor: 'pointer', fontSize: s(13), marginBottom: s(12),
    },
    title: { color: '#c9a84c', fontSize: s(24), fontWeight: 'bold', margin: '0 0 4px' },
    subtitle: { color: '#ffffff44', fontSize: s(12), margin: 0 },
    card: {
      background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c22',
      borderRadius: s(16), padding: `${s(20)}px`, display: 'flex', flexDirection: 'column', gap: s(12),
    },
    cardTitle: { color: '#c9a84c', fontWeight: 'bold', fontSize: s(15), marginBottom: s(4) },
    row: { display: 'flex', alignItems: 'center', gap: s(10), flexWrap: 'wrap' },
    label: { color: '#ffffff88', fontSize: s(13), minWidth: s(72), flexShrink: 0 },
    hint: { color: '#ffffff44', fontSize: s(12) },
    input: {
      background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
      borderRadius: s(8), padding: `${s(8)}px ${s(12)}px`, color: '#fff', fontSize: s(14),
      outline: 'none', flex: 1, minWidth: 0,
    },
    textarea: {
      background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
      borderRadius: s(8), padding: `${s(8)}px ${s(12)}px`, color: '#fff', fontSize: s(13),
      outline: 'none', flex: 1, resize: 'none', fontFamily: 'inherit',
    },
    select: {
      background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
      borderRadius: s(8), padding: `${s(8)}px ${s(12)}px`, color: '#fff', fontSize: s(14),
      outline: 'none', flex: 1,
    },
    chips: { display: 'flex', gap: s(8), flexWrap: 'wrap' },
    chip: {
      background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
      borderRadius: s(20), padding: `${s(5)}px ${s(14)}px`, color: '#ffffff66', fontSize: s(13), cursor: 'pointer',
    },
    chipActive: { background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c', color: '#c9a84c' },
    sliderRow: { display: 'flex', alignItems: 'center', gap: s(10) },
    sliderLabel: { fontWeight: 'bold', fontSize: s(13), minWidth: s(36) },
    slider: { flex: 1, accentColor: '#c9a84c' },
    sliderVal: { fontWeight: 'bold', fontSize: s(14), minWidth: s(28), textAlign: 'right' },
    tagSection: { display: 'flex', flexDirection: 'column', gap: s(6) },
    tagLabel: { color: '#ffffff88', fontSize: s(13) },
    tagLimit: { color: '#ffffff44', fontSize: s(11) },
    tagGrid: { display: 'flex', flexWrap: 'wrap', gap: s(6) },
    tag: {
      background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
      borderRadius: s(20), padding: `${s(4)}px ${s(12)}px`, color: '#ffffff66', fontSize: s(12), cursor: 'pointer',
    },
    tagActive: { background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c', color: '#c9a84c' },
    tagActiveRed: { background: 'rgba(233,69,96,0.2)', border: '1px solid #e94560', color: '#e94560' },
    personalityRow: { display: 'flex', alignItems: 'center', gap: s(8) },
    persLabel: { fontWeight: 'bold', fontSize: s(12), minWidth: s(28) },
    persEdge: { color: '#ffffff44', fontSize: s(11), minWidth: s(36), textAlign: 'center' },
    hiddenBadge: {
      background: 'rgba(233,69,96,0.2)', border: '1px solid #e9456055',
      borderRadius: s(20), padding: `${s(2)}px ${s(10)}px`, color: '#e94560', fontSize: s(11), marginLeft: s(8),
    },
    poolNote: { color: '#ffffff33', fontSize: s(11), marginBottom: s(4) },
    autoBar: { flex: 1, height: s(6), background: 'rgba(255,255,255,0.08)', borderRadius: s(3), overflow: 'hidden' },
    autoFill: { height: '100%', borderRadius: s(3), transition: 'width 0.2s' },
    erogenousNote: { color: '#ffffff44', fontSize: s(11), margin: '0 0 4px' },
    erogenousRow: { display: 'flex', alignItems: 'center', gap: s(8), marginBottom: s(4) },
    erogenousLabel: { fontWeight: 'bold', fontSize: s(13), minWidth: s(72) },
    erogenousNote2: { color: '#ffffff33', fontSize: s(10), minWidth: 0 },
    eroLabel: { fontWeight: 'bold', fontSize: s(11), width: s(72), flexShrink: 0, color: '#ffffffcc' },
    eroDivider: { textAlign: 'center' as const, color: '#c9a84c88', fontSize: s(11), margin: `${s(8)}px 0 ${s(4)}px` },
    segments: { display: 'flex', gap: s(3), flex: 1 },
    segment: { flex: 1, height: s(20), borderRadius: s(3), cursor: 'pointer', transition: 'all 0.15s' },
    erogenousBarWrap: { flex: 1, height: s(6), background: 'rgba(255,255,255,0.08)', borderRadius: s(3), overflow: 'hidden' },
    erogenousBarFill: { height: '100%', borderRadius: s(4), transition: 'width 0.15s' },
    twoCol: { display: 'flex', gap: s(16), alignItems: 'flex-start' },
    leftCol: { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: s(16) },
    rightCol: { width: s(320), flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: s(16) },
    prefSectionLabel: { fontSize: s(11), color: '#ffffff88', margin: '2px 0 2px', display: 'flex', justifyContent: 'space-between' as const },
    prefTotal: { fontWeight: 'bold', color: '#c9a84c', fontSize: s(12) },
    prefVal: { fontWeight: 'bold', fontSize: s(13), width: s(24), textAlign: 'center' as const, flexShrink: 0, color: '#ffffffcc' },
    error: { color: '#e94560', fontSize: s(13), textAlign: 'center', margin: 0 },
    completeBtn: {
      background: 'linear-gradient(135deg, #c9a84c, #e94560)',
      border: 'none', borderRadius: s(12), padding: `${s(16)}px`,
      color: '#fff', fontWeight: 'bold', fontSize: s(16), cursor: 'pointer', marginTop: s(8),
    },
    setTab: { background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22', color: '#ffffff88', borderRadius: s(6), padding: `${s(5)}px ${s(12)}px`, fontSize: s(12), cursor: 'pointer' },
    setTabActive: { background: 'rgba(201,168,76,0.25)', border: '1px solid #c9a84c', color: '#c9a84c' },
  }

  // 2?④퀎: ?꾨줈???대?吏 ?좏깮 ?붾㈃
  if (phase === 'profile_review') {
    const activeImg = profileImages[selectedProfileIdx]
    const mainImgH = Math.min(Math.round(window.innerHeight * 0.55), 520)
    const mainImgW = Math.round(mainImgH * 3 / 4)
    const thumbH = Math.min(Math.round(window.innerHeight * 0.12), 100)
    const thumbW = Math.round(thumbH * 3 / 4)
    return (
      <div style={S.container}>
        {/* ?뺤젙 ?뺤씤 紐⑤떖 */}
        {confirmingProfile && (
          <div style={PR.overlay} onClick={() => setConfirmingProfile(false)}>
            <div style={PR.confirmBox} onClick={e => e.stopPropagation()}>
              <p style={PR.confirmTitle}>???대?吏濡??뺤젙?좉퉴??</p>
              <img src={activeImg} style={PR.confirmPreview} alt="?좏깮" />
              <p style={PR.confirmSub}>?뺤젙 ?????쇨뎬 湲곕컲?쇰줈 ?쒖젙쨌?먯꽭 ?대?吏媛 ?앹꽦?⑸땲??</p>
              <div style={PR.confirmBtns}>
                <button style={PR.cancelBtn} onClick={() => setConfirmingProfile(false)}>痍⑥냼</button>
                <button style={PR.okBtn} onClick={handleFinalizeProfile}>???닿구濡??뺤젙</button>
              </div>
            </div>
          </div>
        )}

        <div style={PR.card}>
          <p style={PR.subtitle}>{generating ? `????대?吏 ?앹꽦 以?.. (${genProgress})` : '留덉쓬???쒕뒗 ?대?吏瑜??좏깮?댁＜?몄슂'}</p>
          <h2 style={PR.name}>{nickname}</h2>
          <p style={PR.meta}>{age}??쨌 {married} 쨌 {job} 쨌 {location}</p>

          {/* 硫붿씤 ?대?吏 ?????뚮젅?댁뒪 ?좎쨲 + ?쒕옒洹?*/}
          <div
            ref={profileImgWrapRef}
            style={{ ...PR.imgWrap, padding: 0, width: mainImgW, height: mainImgH, overflow: 'hidden', borderRadius: 12, cursor: profileWasDragging.current ? 'grabbing' : profileZoomScale > 1 ? 'grab' : 'zoom-in', userSelect: 'none' }}
            onMouseDown={e => {
              if (e.button !== 0) return
              profileWasDragging.current = false
              profileDragRef.current = { startX: e.clientX, startY: e.clientY, panX: profilePan.x, panY: profilePan.y }
              const onMove = (ev: MouseEvent) => {
                if (!profileDragRef.current) return
                profileWasDragging.current = true
                setProfilePan({ x: profileDragRef.current.panX + ev.clientX - profileDragRef.current.startX, y: profileDragRef.current.panY + ev.clientY - profileDragRef.current.startY })
              }
              const onUp = () => {
                profileDragRef.current = null
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
                setProfilePan({ x: 0, y: 0 })
                setProfileZoomScale(1)
                setTimeout(() => { profileWasDragging.current = false }, 50)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
            onClick={() => { if (!profileWasDragging.current) setEnlargedProfile(true) }}
          >
            {activeImg
              ? <img src={activeImg} alt="?꾨줈?? draggable={false}
                  style={{ ...PR.mainImg, width: mainImgW, height: mainImgH, transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s', cursor: 'inherit' }} />
              : <div style={{ ...PR.imgPlaceholder, width: mainImgW, height: mainImgH }}>?앹꽦 以?..</div>
            }
          </div>

          {/* ?꾩껜?붾㈃ 紐⑤떖 */}
          {enlargedProfile && activeImg && (
            <div style={PR.enlargeOverlay} onClick={() => { setEnlargedProfile(false); setProfileZoomScale(1); setProfilePan({ x: 0, y: 0 }) }}>
              <div
                ref={profileEnlargedWrapRef}
                style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', userSelect: 'none', cursor: profileDragRef.current ? 'grabbing' : 'grab' }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => {
                  if (e.button !== 0) return
                  profileDragRef.current = { startX: e.clientX, startY: e.clientY, panX: profilePan.x, panY: profilePan.y }
                  const onMove = (ev: MouseEvent) => {
                    if (!profileDragRef.current) return
                    setProfilePan({ x: profileDragRef.current.panX + ev.clientX - profileDragRef.current.startX, y: profileDragRef.current.panY + ev.clientY - profileDragRef.current.startY })
                  }
                  const onUp = () => { profileDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); setProfilePan({ x: 0, y: 0 }); setProfileZoomScale(1) }
                  window.addEventListener('mousemove', onMove)
                  window.addEventListener('mouseup', onUp)
                }}
              >
                <img src={activeImg} alt="?뺣?" draggable={false} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '2px solid #c9a84c55', transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s' }} />
              </div>
              <div style={{ color: '#ffffff44', fontSize: 12, marginTop: 12 }}>?? ?뺣?/異뺤냼 쨌 ?쒕옒洹? ?대룞 쨌 諛붽묑 ?대┃?쇰줈 ?リ린</div>
            </div>
          )}

          {/* ?몃꽕??(2???댁긽) */}
          {profileImages.length > 1 && (
            <div style={PR.thumbRow}>
              {profileImages.map((url, i) => (
                <img key={i} src={url} alt={`v${i+1}`}
                  onClick={() => setSelectedProfileIdx(i)}
                  style={{ ...PR.thumb, width: thumbW, height: thumbH, border: i === selectedProfileIdx ? '2px solid #c9a84c' : '2px solid #ffffff22' }}
                />
              ))}
            </div>
          )}

          {/* ?ъ깮??/ 痍⑥냼 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', maxWidth: 280 }}>
            <button
              style={{ ...PR.regenBtn, opacity: generating ? 0.5 : 1, width: '100%' }}
              disabled={generating}
              onClick={handleRegenProfile}
            >
              {generating ? `???앹꽦 以?${genProgress}` : '?봽 5???ъ깮??}
            </button>
            {generating && (
              <button
                style={{ background: '#e9455688', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 20px', fontSize: 12, cursor: 'pointer', width: '100%' }}
                onClick={handleCancelProfile}
              >??痍⑥냼</button>
            )}
          </div>

          {/* ?뺤젙 踰꾪듉 */}
          {activeImg && !generating && (
            <button style={{ ...PR.finalBtn, width: '100%', maxWidth: 280 }} onClick={() => setConfirmingProfile(true)}>
              ?????대?吏濡??뺤젙 ???쒖젙쨌?먯꽭 ?앹꽦
            </button>
          )}

          <button style={PR.backBtn} onClick={() => setPhase('form')}>???쇱쑝濡??뚯븘媛湲?/button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.container}>
      <div style={S.inner}>
        {/* ?ㅻ뜑 */}
        <div style={S.header}>
          <button style={S.backBtn} onClick={onBack}>???ㅻ줈</button>
          <h1 style={S.title}>?몣 ?ъ꽦 罹먮┃???앹꽦</h1>
          <p style={S.subtitle}>李쎌“???꾩슜 ???뚮젅?댁뼱?먭쾶 怨듦컻?⑸땲??/p>
        </div>

        <div style={S.twoCol}>
        {/* ?쇱そ ??罹먮┃???뺣낫 */}
        <div style={S.leftCol}>
        {/* 湲곕낯 ?뺣낫 */}
        <div style={S.card}>
          <div style={S.cardTitle}>?뱥 湲곕낯 ?뺣낫</div>
          <div style={S.row}>
            <label style={S.label}>?됰꽕??/label>
            <input style={S.input} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="10???대궡, ?ㅻ챸 遺덇?" maxLength={10} />
          </div>
          <div style={S.row}>
            <label style={S.label}>?섏씠</label>
            <input style={{ ...S.input, width: 80 }} type="number" value={age} onChange={e => setAge(e.target.value)} min={20} max={49} />
            <span style={S.hint}>{parseInt(age) < 30 ? '20?' : parseInt(age) < 40 ? '30?' : '40?'}</span>
          </div>
          <div style={S.row}>
            <label style={S.label}>寃고샎?щ?</label>
            <div style={S.chips}>
              {MARRIED_TYPES.map(m => (
                <button key={m} style={{ ...S.chip, ...(married === m ? S.chipActive : {}) }} onClick={() => setMarried(m)}>{m}</button>
              ))}
            </div>
          </div>
          <div style={S.row}>
            <label style={S.label}>吏곸뾽</label>
            <input style={S.input} value={job} onChange={e => setJob(e.target.value)} placeholder="?? 媛꾪샇?? 諛붾━?ㅽ?" />
          </div>
          <div style={S.row}>
            <label style={S.label}>諛곗튂 ?μ냼</label>
            <select style={S.select} value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l} value={l} style={{ background: '#1a0a2e', color: '#fff' }}>{l}</option>)}
            </select>
          </div>
          <div style={S.row}>
            <label style={S.label}>泥댄삎</label>
            <div style={S.chips}>
              {BODY_TYPES.map(b => (
                <button key={b} style={{ ...S.chip, ...(bodyType === b ? S.chipActive : {}) }} onClick={() => setBodyType(b)}>{b}</button>
              ))}
            </div>
          </div>
          <div style={S.row}>
            <label style={S.label}>?먭린?뚭컻 <span style={{ color: '#ffffff33', fontSize: 11 }}>?먮룞?앹꽦</span></label>
            <div style={{ ...S.textarea, minHeight: 48, color: autoIntro ? '#ffffffcc' : '#ffffff33', fontSize: 13, padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
              {autoIntro || '湲곕낯 ?뺣낫? 愿?ъ궗瑜??낅젰?섎㈃ ?먮룞?쇰줈 ?앹꽦?⑸땲??'}
            </div>
          </div>
        </div>

        {/* ?몃え ?ㅽ꺈 */}
        <div style={S.card}>
          <div style={S.cardTitle}>?뭵 ?몃え ?ㅽ꺈</div>
          {/* ????蹂꾨룄 cm 媛?*/}
          <div style={S.sliderRow}>
            <span style={{ ...S.sliderLabel, color: '#4FC3F7' }}>??/span>
            <input type="range" min={140} max={185} step={5} value={heightCm}
              onChange={e => setHeightCm(Number(e.target.value))} style={S.slider} />
            <span style={{ ...S.sliderVal, color: '#4FC3F7', minWidth: 52 }}>{heightCm}cm</span>
          </div>
          {/* ?쇨뎬/紐몃ℓ/?⑥뀡 ???⑷퀎 180 怨좎젙, ?⑥뀡 ?먮룞 */}
          <div style={S.poolNote}>?쇨뎬 + 紐몃ℓ + ?⑥뀡 ?⑷퀎 {LOOK_TOTAL}pt 怨좎젙 쨌 ?⑥뀡 ?먮룞議곗젙</div>
          {[
            { label: '?쇨뎬', value: face, key: 'face' as const, color: '#FF6B9D' },
            { label: '紐몃ℓ', value: body, key: 'body' as const, color: '#FF5722' },
            { label: '?⑥뀡', value: fashion, key: 'auto' as const, color: '#c9a84c' },
          ].map(({ label, value, key, color }) => (
            <div key={label} style={S.sliderRow}>
              <span style={{ ...S.sliderLabel, color }}>{label}</span>
              {key === 'auto' ? (
                <div style={S.autoBar}>
                  <div style={{ ...S.autoFill, width: `${(value / (LOOK_TOTAL - LOOK_MIN * 2)) * 100}%`, background: color }} />
                </div>
              ) : (
                <input type="range" min={LOOK_MIN} max={LOOK_TOTAL - LOOK_MIN * 2} step={5}
                  value={value} onChange={e => setLook(key, Number(e.target.value))} style={S.slider} />
              )}
              <span style={{ ...S.sliderVal, color, ...(key === 'auto' ? { opacity: 0.6 } : {}) }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 愿?ъ궗 */}
        <div style={S.card}>
          <div style={S.cardTitle}>?뮠 愿?ъ궗 ?ㅼ젙</div>
          <div style={S.tagSection}>
            <div style={S.tagLabel}>愿?ъ궗 ?쒓렇 <span style={S.tagLimit}>(理쒕? 5媛?</span></div>
            <div style={S.tagGrid}>
              {INTEREST_TAGS.map(t => (
                <button key={t} style={{ ...S.tag, ...(interestTags.includes(t) ? S.tagActive : {}) }}
                  onClick={() => toggleTag(t, interestTags, setInterestTags, 5)}>{t}</button>
              ))}
            </div>
            <input style={{ ...S.input, marginTop: 8 }} value={interestCustom} onChange={e => setInterestCustom(e.target.value)} placeholder="吏곸젒?낅젰 (理쒕? 2媛? ?쇳몴 援щ텇)" />
          </div>
          <div style={S.tagSection}>
            <div style={S.tagLabel}>?レ뼱?섎뒗 寃?<span style={S.tagLimit}>(理쒕? 5媛?</span></div>
            <div style={S.tagGrid}>
              {DISLIKE_TAGS.map(t => (
                <button key={t} style={{ ...S.tag, ...(dislikeTags.includes(t) ? S.tagActiveRed : {}) }}
                  onClick={() => toggleTag(t, dislikeTags, setDislikeTags, 5)}>{t}</button>
              ))}
            </div>
            <input style={{ ...S.input, marginTop: 8 }} value={dislikeCustom} onChange={e => setDislikeCustom(e.target.value)} placeholder="吏곸젒?낅젰 (理쒕? 1媛?" />
          </div>
        </div>

        {/* ?깃꺽 ?щ씪?대뜑 */}
        <div style={S.card}>
          <div style={S.cardTitle}>?쭬 ?깃꺽 ?ㅼ젙</div>
          {[
            { key: 'introvert' as const, label: '?댁꽦', left: '?댁꽦??, right: '?명뼢??, color: '#4FC3F7' },
            { key: 'indirect' as const, label: '?붾쾿', left: '?고쉶??, right: '吏곸꽕??, color: '#66BB6A' },
            { key: 'friendly' as const, label: '?쒕룄', left: '移쒓렐??, right: '?꾨룄??, color: '#FF9800' },
          ].map(({ key, label, left, right, color }) => (
            <div key={key} style={S.personalityRow}>
              <span style={{ ...S.persLabel, color }}>{label}</span>
              <span style={S.persEdge}>{left}</span>
              <input type="range" min={1} max={5} value={personality[key]}
                onChange={e => setPersonality({ ...personality, [key]: Number(e.target.value) })}
                style={S.slider} />
              <span style={S.persEdge}>{right}</span>
              <span style={{ ...S.sliderVal, color }}>{personality[key]}</span>
            </div>
          ))}
          {/* ?곗씠??鍮꾩슜 遺?댁쑉 */}
          <div style={{ ...S.personalityRow, marginTop: 8 }}>
            <span style={{ ...S.persLabel, color: '#c9a84c' }}>鍮꾩슜</span>
            <span style={S.persEdge}>0%</span>
            <input type="range" min={0} max={100} step={5} value={dateCostShare}
              onChange={e => setDateCostShare(Number(e.target.value))}
              style={S.slider} />
            <span style={S.persEdge}>100%</span>
            <span style={{ ...S.sliderVal, color: '#c9a84c', minWidth: 32 }}>{dateCostShare}%</span>
          </div>
          <div style={{ color: '#ffffff44', fontSize: 10, marginBottom: 4, paddingLeft: 2 }}>
            ?뮩 ?곗씠??鍮꾩슜 遺?댁쑉 ??0%: ?⑥꽦 ?꾩븸 / 50%: ?붿튂?섏씠 / 100%: ?ъ꽦 ?꾩븸
          </div>

          <div style={S.row}>
            <label style={S.label}>李쎌“??硫붾え <span style={S.hint}>(?좏깮)</span></label>
            <textarea style={S.textarea} value={memo} onChange={e => setMemo(e.target.value)} placeholder="AI ??붿뿉 吏곸젒 二쇱엯?섎뒗 硫붾え (100???대궡)" maxLength={100} rows={2} />
          </div>
        </div>

        {/* ?깃컧? ???④? ?ㅽ꺈 */}
        <div style={{ ...S.card, borderColor: '#e9456033' }}>
          <div style={S.cardTitle}>?뵞 ?깃컧? ?ㅼ젙 <span style={S.hiddenBadge}>?뚮젅?댁뼱 鍮꾧났媛?/span></div>

          {/* ?쇰컲 ?깃컧? */}
          {genEroToast && (
            <div style={{ background: '#e94560', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
              ?좑툘 {genEroToast}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ffffff88', fontSize: 11 }}>?쇰컲 ?깃컧? 쨌 min 1 쨌 max 4 쨌 ?됰뜦???먮룞</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: (genEro.breast + genEro.neckEar + genEro.armpit + genEro.mouth + genThighAuto) === GEN_TOTAL ? '#c9a84c' : '#e94560' }}>
              {genEro.breast + genEro.neckEar + genEro.armpit + genEro.mouth + genThighAuto} / {GEN_TOTAL}pt
            </span>
          </div>
          {(['mouth','neckEar','armpit','breast'] as const).map(key => {
            const labelMap = { mouth:'?끒룹엯??, neckEar:'紐㈑룰?', armpit:'寃⑤뱶?묒씠', breast:'媛?? }
            const val = genEro[key]
            const pct = ((val - GEN_MIN) / (GEN_MAX - GEN_MIN)) * 100
            const col = `hsl(${Math.round(30 + pct * 3)}, 80%, 60%)`
            return (
              <div key={key} style={S.erogenousRow}>
                <span style={{ ...S.eroLabel, color: col }}>{labelMap[key]}</span>
                <input type="range" min={GEN_MIN} max={GEN_MAX} step={1} value={val}
                  onChange={e => setGenEro(key, Number(e.target.value))} style={S.slider} />
                <span style={{ color: col, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })}
          {/* ?됰뜦???덈쾮吏 ???먮룞 */}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>?됰뜦???덈쾮吏 (?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((genThighAuto - GEN_MIN) / (GEN_MAX - GEN_MIN)) * 100}%`, background: '#f77f00' }} /></div>
            <span style={{ color: '#f77f00', fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{genThighAuto}</span>
          </div>

          {/* ?듭떖 ?깃컧? */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? ?듭떖 ?깃컧? ??</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ffffff88', fontSize: 11 }}>?대━?좊━??min 4 쨌 吏??먮룞</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: (clitoris + vagina) === CORE_TOTAL ? '#c9a84c' : '#e94560' }}>
              {clitoris + vagina} / {CORE_TOTAL}pt
            </span>
          </div>
          {/* ?대━?좊━??*/}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor10(clitoris) }}>?대━?좊━??/span>
            <input type="range" min={CORE_MIN} max={CORE_MAX} step={1} value={clitoris}
              onChange={e => setClitoris(Math.min(CORE_MAX, Math.max(CORE_MIN, Number(e.target.value))))} style={S.slider} />
            <span style={{ color: sensColor10(clitoris), fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center', flexShrink: 0 }}>{clitoris}</span>
          </div>
          {/* 吏????먮룞 */}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor10(vagina) }}>吏?(?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((vagina - CORE_MIN) / (CORE_MAX - CORE_MIN)) * 100}%`, background: sensColor10(vagina) }} /></div>
            <span style={{ color: sensColor10(vagina), fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center', flexShrink: 0 }}>{vagina}</span>
          </div>
          {/* ??Ц ???낅┰ ?щ씪?대뜑 */}
          <div style={{ ...S.eroDivider, marginTop: 8 }}>?? ??Ц ??</div>
          <div style={{ color: '#ffffff88', fontSize: 11, marginBottom: 4 }}>?듭떖 ?깃컧? 쨌 ?낅┰ (-5~+5)</div>
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor(anal) }}>??Ц</span>
            <input type="range" min={ANAL_MIN} max={ANAL_MAX} step={1} value={anal}
              onChange={e => setAnal(Math.min(ANAL_MAX, Math.max(ANAL_MIN, Number(e.target.value))))} style={S.slider} />
            <span style={{ color: sensColor(anal), fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center', flexShrink: 0 }}>{anal}</span>
          </div>

          {/* ?ъ틦 ?먯떊??S/M ?깊뼢 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? ?섏쓽 S/M ?깊뼢 ??</div>
          <div style={{ color: '#ffffff44', fontSize: 11, marginBottom: 6 }}>??M (蹂듭쥌쨌?섎룞?? &nbsp;|&nbsp; S (吏諛걔룹＜?꾩쟻) ??/div>
          {SmSlider(smTendency, setSmTendency)}
        </div>

        </div>{/* /leftCol */}

        {/* ?ㅻⅨ履????⑥꽦 ?좏샇??*/}
        <div style={S.rightCol}>
        {/* ?⑥꽦 ?좏샇?????④? ?ㅽ꺈 */}
        <div style={{ ...S.card, borderColor: '#c9a84c33' }}>
          <div style={S.cardTitle}>?뮎 ?좏샇?섎뒗 ?⑥꽦 <span style={S.hiddenBadge}>?뚮젅?댁뼱 鍮꾧났媛?/span></div>

          {/* ?섏씠 ?좏샇 */}
          <div style={S.prefSectionLabel}>?섏씠 ?좏샇 <span style={S.prefTotal}>{prefAge20+prefAge30+prefAge40} / 100</span></div>
          {([['20?', prefAge20, 'age20'], ['30?', prefAge30, 'age30']] as const).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={AGE_MIN} max={PREF_TOTAL - AGE_MIN * 2} step={5} value={val}
                onChange={e => setPrefAgeVal(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>40? (?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${prefAge40}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefAge40}</span>
          </div>

          {/* ?щ젰 ?좏샇 ???낅┰ */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? ?щ젰 ?좏샇 ??</div>
          <div style={S.erogenousRow}>
            <span style={S.eroLabel}>?щ젰?좏샇</span>
            <input type="range" min={20} max={100} step={5} value={prefWealth}
              onChange={e => setPrefWealth(Number(e.target.value))} style={S.slider} />
            <span style={S.prefVal}>{prefWealth}</span>
          </div>

          {/* S1 ?몃え ?좏샇 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? S1 ?몃え ?좏샇 ??</div>
          <div style={S.prefSectionLabel}>?⑷퀎 <span style={S.prefTotal}>{prefFace+prefHeight+prefBodyLook+prefFashion} / 100</span></div>
          {([['?쇨뎬', prefFace, 'face'], ['??, prefHeight, 'height'], ['紐몃ℓ', prefBodyLook, 'bodyLook']] as [string,number,'face'|'height'|'bodyLook'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={LOOK_PREF_MIN} max={LOOK_PREF_MAX} step={5} value={val}
                onChange={e => setPrefLook(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>?⑥뀡 (?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefFashion - LOOK_PREF_MIN) / (LOOK_PREF_MAX - LOOK_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefFashion}</span>
          </div>

          {/* S2 ?깃꺽 ?좏샇 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? S2 ?깃꺽 ?좏샇 ??</div>
          <div style={S.prefSectionLabel}>?⑷퀎 <span style={S.prefTotal}>{prefIntel+prefHumor+prefVirtue+prefManner} / 100</span></div>
          {([['吏?곷뒫??, prefIntel, 'intel'], ['?좊㉧', prefHumor, 'humor'], ['?뺤꽦', prefVirtue, 'virtue']] as [string,number,'intel'|'humor'|'virtue'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={PERS_PREF_MIN} max={PERS_PREF_MAX} step={5} value={val}
                onChange={e => setPrefPersonality(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>留ㅻ꼫 (?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefManner - PERS_PREF_MIN) / (PERS_PREF_MAX - PERS_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefManner}</span>
          </div>
          {/* S3 諛쒓린 ?좏샇 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? S3 ?깃린 ?좏샇 ??</div>
          <div style={S.prefSectionLabel}>?⑷퀎 <span style={S.prefTotal}>{prefPower+prefDuration+prefHardness+prefTech} / 100</span></div>
          {([['諛쒓린??, prefPower, 'power'], ['吏?띾젰', prefDuration, 'duration'], ['?⑤떒??, prefHardness, 'hardness']] as [string,number,'power'|'duration'|'hardness'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={ERECT_PREF_MIN} max={ERECT_PREF_MAX} step={5} value={val}
                onChange={e => setPrefErect(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>?뚰겕??(?먮룞)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefTech - ERECT_PREF_MIN) / (ERECT_PREF_MAX - ERECT_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefTech}</span>
          </div>

          {/* ?깃린 ?ш린 ?좏샇 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? ?깃린 ?ш린 ?좏샇 ??</div>
          <div style={S.prefSectionLabel}>?⑷퀎 <span style={S.prefTotal}>{prefSize.size + prefSize.girth} / 100</span></div>
          {([['湲몄씠', 'size'], ['?먭퍡', 'girth']] as [string, 'size'|'girth'][]).map(([label, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={SIZE_PREF_MIN} max={100 - SIZE_PREF_MIN} step={5} value={prefSize[key]}
                onChange={e => setPrefSizeStat(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{prefSize[key]}</span>
            </div>
          ))}

          {/* ?좏샇 ?먯꽭 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>?? ?좏샇 ?먯꽭 (?⑷퀎 10) ??</div>
          <div style={S.prefSectionLabel}>?⑷퀎 <span style={S.prefTotal}>{prefPose.missionary + prefPose.doggy + prefPose.cowgirl + poseSideAuto} / {POSE_TOTAL}</span></div>

          {(['?뺤긽??,'?꾨같??,'?ъ꽦?곸쐞'] as const).map((label, i) => {
            const key = (['missionary','doggy','cowgirl'] as const)[i]
            const val = prefPose[key]
            const poseColor = val >= 4 ? '#c9a84c' : val >= 2 ? '#66BB6A' : '#e94560'
            return (
              <div key={key} style={S.erogenousRow}>
                <span style={{ ...S.eroLabel, color: poseColor }}>{label}</span>
                <input type="range" min={POSE_MIN} max={POSE_MAX} step={1} value={val}
                  onChange={e => setPose(key, Number(e.target.value))} style={{ ...S.slider, accentColor: poseColor }} />
                <span style={{ color: poseColor, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })}
          {/* 踰꾪꽣?뚮씪???먮룞 */}
          {(() => {
            const val = poseSideAuto
            const poseColor = val >= 4 ? '#c9a84c' : val >= 2 ? '#66BB6A' : '#e94560'
            return (
              <div style={S.erogenousRow}>
                <span style={{ ...S.eroLabel, color: '#ffffff66' }}>踰꾪꽣?뚮씪??(?먮룞)</span>
                <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((val - POSE_MIN) / (POSE_MAX - POSE_MIN)) * 100}%`, background: poseColor }} /></div>
                <span style={{ color: poseColor, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })()}

        </div>

        {/* ?몃え ?ㅻ챸 */}
        <div style={{ ...S.card, borderColor: '#4FC3F733', marginTop: 0 }}>
          <div style={S.cardTitle}>?렓 ?몃え ?ㅻ챸 <span style={{ color: '#ffffff44', fontSize: 12, fontWeight: 'normal' }}>?대?吏 ?앹꽦??諛섏쁺?⑸땲??/span></div>

          {/* 癒몃━??*/}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>癒몃━??/div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: '?묐컻', val: 'black hair' },
                { label: '媛덉깋', val: 'dark brown hair' },
                { label: '諛앹? 媛덉깋', val: 'light brown hair' },
                { label: '湲덈컻', val: 'blonde hair' },
                { label: '鍮④컙??, val: 'red hair' },
                { label: '遺꾪솉', val: 'pink hair' },
              ].map(({ label, val }) => (
                <button key={val}
                  style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: hairColor === val ? '1.5px solid #c9a84c' : '1px solid #ffffff33', background: hairColor === val ? '#c9a84c22' : 'transparent', color: hairColor === val ? '#c9a84c' : '#ffffff88' }}
                  onClick={() => setHairColor(hairColor === val ? '' : val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 癒몃━ 湲몄씠 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>癒몃━ 湲몄씠</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: '吏㏃? 癒몃━', val: 'short hair' },
                { label: '?⑤컻', val: 'bob cut hair' },
                { label: '湲?癒몃━', val: 'long hair' },
              ].map(({ label, val }) => (
                <button key={val}
                  style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: hairLength === val ? '1.5px solid #c9a84c' : '1px solid #ffffff33', background: hairLength === val ? '#c9a84c22' : 'transparent', color: hairLength === val ? '#c9a84c' : '#ffffff88' }}
                  onClick={() => setHairLength(hairLength === val ? '' : val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 異붽? ?ㅻ챸 */}
          <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>異붽? ?ㅻ챸 (?좏깮)</div>
          <textarea
            style={{ ...S.textarea, minHeight: 60 }}
            value={appearanceDesc}
            onChange={e => setAppearanceDesc(e.target.value)}
            placeholder="?? wavy hair, small lips, tattoo, fair skin..."
            maxLength={200}
            rows={2}
          />
          <span style={{ color: '#ffffff33', fontSize: 11 }}>{appearanceDesc.length}/200??/span>
          <span style={{ color: '#FF9800', fontSize: 11, marginLeft: 8 }}>?좑툘 異붽? ?ㅻ챸? ?곸뼱濡??낅젰</span>
        </div>

        {error && <p style={S.error}>{error}</p>}
        <button
          style={{ ...S.completeBtn, opacity: generating ? 0.7 : 1, cursor: generating ? 'not-allowed' : 'pointer' }}
          onClick={handleComplete}
          disabled={generating}
        >
          {generating ? `?렓 ${genProgress || '?대?吏 ?앹꽦 以?..'}` : isEdit ? '?ㅼ쓬 ???대?吏 ?몄쭛' : '??罹먮┃???깅줉'}
        </button>
        {generating && (
          <button
            style={{ marginTop: 8, width: '100%', background: '#e9455688', border: 'none', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer' }}
            onClick={handleCancelProfile}
          >??痍⑥냼</button>
        )}
        </div>{/* /rightCol */}
        </div>{/* /twoCol */}
      </div>
    </div>
  )
}

const IS: Record<string, React.CSSProperties> = {
  section: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #ffffff11', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { color: '#c9a84c', fontSize: 14, fontWeight: 'bold' },
  hint: { color: '#ffffff44', fontSize: 12, margin: 0 },
  thumbRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  thumb: { width: 56, height: 72, objectFit: 'cover' as const, borderRadius: 8, border: '1px solid #ffffff22' },
  thumbEmpty: { width: 56, height: 72, borderRadius: 8, background: '#ffffff11' },
  genBtn: { background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c55', color: '#c9a84c', borderRadius: 8, padding: '9px 20px', fontSize: 13, cursor: 'pointer', width: '100%' },
  modal: { position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 16, overflowY: 'auto' as const, padding: '20px 10px', cursor: 'zoom-out' },
  enlargedImg: { width: 168, height: 216, objectFit: 'cover' as const, borderRadius: 10, border: '2px solid #c9a84c55' },
  setTabs: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const },
  setTab: { background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22', color: '#ffffff88', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  setTabActive: { background: 'rgba(201,168,76,0.25)', border: '1px solid #c9a84c', color: '#c9a84c' },
}
