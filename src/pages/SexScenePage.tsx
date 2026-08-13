import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'
import type { HotspotZone } from '../lib/generateCharImages'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type ToolKey = 'penis' | 'tongue' | 'hand' | 'dildo' | 'vibrator' | 'gel' | 'whip' | 'anal_dildo'
type SectorKey = 'body' | 'toy' | 'sm'
type RestraintKey = 'handcuff' | 'legcuff' | 'blindfold' | 'collar'
type CuffPair = {
  id: string
  left:  { x: number; y: number }
  right: { x: number; y: number }
  mid:   { x: number; y: number }
  leftSize: number; rightSize: number
  leftRotate: number; rightRotate: number
}
type ScenePhase = 'foreplay' | 'aroused' | 'climax' | 'afterglow'
type ErogenousKey = 'breast' | 'neck' | 'ear' | 'thigh' | 'clitoris' | 'vagina' | 'anal' | 'mouth'

// ─── 핫스팟 좌표 — fallback용 하드코딩 ─────────────────────────────────────

const HOTSPOTS: Record<string, HotspotZone[]> = {
  missionary: [
    { key: 'mouth',    label: '입',             cx: 50, cy: 18, rx: 10, ry: 5,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',             cx: 50, cy: 27, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',            cx: 36, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',            cx: 64, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',           cx: 37, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',           cx: 63, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 22, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 78, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스',     cx: 50, cy: 81, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',             cx: 50, cy: 86, rx: 7,  ry: 4,  color: '#e94560' },
  ],
  doggy: [
    { key: 'mouth',    label: '입',             cx: 23, cy: 22, rx: 12, ry: 9,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',             cx: 32, cy: 30, rx: 8,  ry: 5,  color: '#c77dff' },
    { key: 'ear',      label: '귀',             cx: 22, cy: 22, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',           cx: 42, cy: 60, rx: 10, ry: 10, color: '#ff6b9d' },
    { key: 'anal',     label: '항문',           cx: 56, cy: 53, rx: 7,  ry: 5,  color: '#c9a84c' },
    { key: 'vagina',   label: '질',             cx: 55, cy: 62, rx: 8,  ry: 5,  color: '#e94560' },
    { key: 'clitoris', label: '클리토리스',     cx: 54, cy: 68, rx: 7,  ry: 4,  color: '#e94560' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 30, cy: 82, rx: 18, ry: 11, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 72, cy: 82, rx: 14, ry: 11, color: '#f77f00' },
  ],
  cowgirl: [
    { key: 'mouth',    label: '입',             cx: 47, cy: 13, rx: 12, ry: 8,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',             cx: 47, cy: 23, rx: 7,  ry: 4,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',            cx: 33, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',            cx: 61, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',           cx: 35, cy: 38, rx: 16, ry: 13, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',           cx: 60, cy: 37, rx: 14, ry: 12, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 22, cy: 75, rx: 13, ry: 16, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 75, cy: 75, rx: 11, ry: 16, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스',     cx: 49, cy: 79, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',             cx: 49, cy: 84, rx: 7,  ry: 4,  color: '#e94560' },
  ],
  side: [
    { key: 'mouth',    label: '입',             cx: 50, cy: 28, rx: 11, ry: 7,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',             cx: 50, cy: 37, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀',             cx: 38, cy: 27, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',           cx: 36, cy: 48, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴',           cx: 62, cy: 47, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 22, cy: 65, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지', cx: 76, cy: 63, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스',     cx: 50, cy: 76, rx: 8,  ry: 4,  color: '#e94560' },
    { key: 'vagina',   label: '질',             cx: 50, cy: 81, rx: 7,  ry: 4,  color: '#e94560' },
    { key: 'anal',     label: '항문',           cx: 50, cy: 87, rx: 6,  ry: 4,  color: '#c9a84c' },
  ],
}

// ─── 도구 설정 ───────────────────────────────────────────────────────────────

interface ToolDef {
  key: ToolKey
  label: string
  sector: SectorKey
}

// 도구 × 부위 유효성 매트릭스
// 양수 = 흥분도 상승 배율, 음수 = 흥분도 하락 페널티
const TOOL_ZONE_MATRIX: Record<ToolKey, Record<ErogenousKey, number>> = {
  tongue:     { breast:1.2,  neck:1.1,  ear:1.1,  thigh:1.1,  clitoris:1.3,  vagina:1.2,  anal:1.1,  mouth:1.2  },
  hand:       { breast:1.1,  neck:-0.2, ear:-0.2, thigh:1.1,  clitoris:1.2,  vagina:1.3,  anal:1.1,  mouth:-0.2 },
  penis:      { breast:1.1,  neck:-0.2, ear:-0.2, thigh:-0.2, clitoris:1.2,  vagina:1.5,  anal:1.1,  mouth:1.1  },
  dildo:      { breast:-0.2, neck:-0.2, ear:-0.2, thigh:-0.2, clitoris:1.1,  vagina:1.2,  anal:1.1,  mouth:-0.2 },
  vibrator:   { breast:1.1,  neck:-0.2, ear:-0.2, thigh:-0.2, clitoris:1.2,  vagina:1.2,  anal:1.1,  mouth:-0.2 },
  gel:        { breast:0,    neck:0,    ear:0,    thigh:0,    clitoris:0,    vagina:0,    anal:0,    mouth:0    }, // 단독 사용 무효과
  // 채찍: SM 도구 착용 개수(0~4)에 따라 WHIP_LEVEL_MATRIX 사용
  whip:       { breast:1.05, neck:-0.2, ear:-0.2, thigh:1.05, clitoris:1.1,  vagina:1.1,  anal:1.05, mouth:-0.2 },
  anal_dildo: { breast:-0.2, neck:-0.2, ear:-0.2, thigh:-0.2, clitoris:-0.2, vagina:-0.2, anal:1.3,  mouth:-0.2 },
}

// 젤+손/딜도/진동기 콤보 배율 (breast/thigh/anal=1.1×, clitoris/vagina=1.15×)
const GEL_COMBO_MATRIX: Record<ErogenousKey, number> = {
  breast:1.2, neck:-0.2, ear:-0.2, thigh:1.2, clitoris:1.3, vagina:1.2, anal:1.2, mouth:-0.2,
}

// 채찍 × SM 도구 착용 개수 (0=미착용 ~ 4=전부) 배율 매트릭스
const WHIP_LEVEL_MATRIX: Record<ErogenousKey, number>[] = [
  { breast:1.05, neck:-0.2, ear:-0.2, thigh:1.05, clitoris:1.1,  vagina:1.1,  anal:1.05, mouth:-0.2 }, // 0개
  { breast:1.05, neck:-0.2, ear:-0.2, thigh:1.05, clitoris:1.1,  vagina:1.1,  anal:1.05, mouth:-0.2 }, // 1개
  { breast:1.1,  neck:-0.2, ear:-0.2, thigh:1.1,  clitoris:1.2,  vagina:1.2,  anal:1.1,  mouth:-0.2 }, // 2개
  { breast:1.2,  neck:-0.2, ear:-0.2, thigh:1.2,  clitoris:1.3,  vagina:1.3,  anal:1.2,  mouth:-0.2 }, // 3개
  { breast:1.3,  neck:-0.2, ear:-0.2, thigh:1.3,  clitoris:1.4,  vagina:1.5,  anal:1.3,  mouth:-0.2 }, // 4개
]

const TOOL_DEFS: ToolDef[] = [
  // 신체
  { key: 'penis',      label: '성기',      sector: 'body' },
  { key: 'tongue',     label: '혀',        sector: 'body' },
  { key: 'hand',       label: '손',        sector: 'body' },
  // 도구
  { key: 'dildo',      label: '딜도',      sector: 'toy'  },
  { key: 'vibrator',   label: '진동기',    sector: 'toy'  },
  { key: 'gel',        label: '마사지젤',  sector: 'toy'  },
  // SM
  { key: 'whip',       label: '채찍',      sector: 'sm'   },
  { key: 'anal_dildo', label: '애널딜도',  sector: 'sm'   },
]

const RESTRAINT_DEFS: { key: RestraintKey; label: string }[] = [
  { key: 'handcuff',  label: '수갑' },
  { key: 'legcuff',   label: '족갑' },
  { key: 'blindfold', label: '안대' },
  { key: 'collar',    label: '개목걸이' },
]

const SECTORS: { key: SectorKey; label: string }[] = [
  { key: 'body', label: '신체' },
  { key: 'toy',  label: '도구' },
  { key: 'sm',   label: 'SM' },
]

// 자세별 구속 오버레이 위치 (이미지 % 기준)
const RESTRAINT_POS: Record<string, Record<RestraintKey, { x: number; y: number; rotate?: number }>> = {
  missionary: {
    handcuff:  { x: 50, y: 56 },
    legcuff:   { x: 50, y: 90 },
    blindfold: { x: 50, y: 18 },
    collar:    { x: 50, y: 28 },
  },
  doggy: {
    handcuff:  { x: 50, y: 42 },
    legcuff:   { x: 50, y: 90 },
    blindfold: { x: 23, y: 16, rotate: -20 },
    collar:    { x: 32, y: 28, rotate: -15 },
  },
  cowgirl: {
    handcuff:  { x: 50, y: 58 },
    legcuff:   { x: 50, y: 90 },
    blindfold: { x: 47, y: 12 },
    collar:    { x: 47, y: 23 },
  },
  side: {
    handcuff:  { x: 50, y: 58 },
    legcuff:   { x: 50, y: 88 },
    blindfold: { x: 50, y: 27 },
    collar:    { x: 50, y: 37 },
  },
}

// ─── SVG 도구 아이콘 ─────────────────────────────────────────────────────────

function ToolSvg({ toolKey, pressed, size = 80 }: { toolKey: ToolKey; pressed: boolean; size?: number }) {
  const anim = (name: string) => pressed ? `${name} 0.3s ease-in-out infinite alternate` : 'none'
  const s = size

  switch (toolKey) {
    case 'penis':
      return (
        <img
          src="/icons/penis.png"
          width={s} height={s}
          style={{ display: 'block', objectFit: 'contain', animation: anim('sx-thrust'), filter: 'invert(60%) sepia(80%) saturate(400%) hue-rotate(300deg)' }}
          alt=""
        />
      )
    case 'dildo':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-thrust'), display: 'block' }}>
          <ellipse cx="40" cy="16" rx="14" ry="15" fill="#f9a8c9" stroke="#ec4899" strokeWidth="3" />
          <rect x="27" y="28" width="26" height="38" rx="10" fill="#f9a8c9" stroke="#ec4899" strokeWidth="3" />
          <ellipse cx="40" cy="68" rx="10" ry="6" fill="#f9a8c9" stroke="#ec4899" strokeWidth="2" />
        </svg>
      )
    case 'anal_dildo':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-thrust'), display: 'block' }}>
          <ellipse cx="40" cy="14" rx="11" ry="13" fill="#c9a84c" stroke="#a07830" strokeWidth="3" />
          <rect x="30" y="24" width="20" height="32" rx="8" fill="#c9a84c" stroke="#a07830" strokeWidth="3" />
          <ellipse cx="40" cy="62" rx="16" ry="8" fill="#c9a84c" stroke="#a07830" strokeWidth="3" />
        </svg>
      )
    case 'tongue':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-tongue'), transformOrigin: '40px 10px', display: 'block' }}>
          <path d="M40 10 Q24 28 28 52 Q32 72 40 72 Q48 72 52 52 Q56 28 40 10Z" fill="#ff6b9d" stroke="#e94560" strokeWidth="3" />
          <line x1="40" y1="38" x2="40" y2="62" stroke="#c94060" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    case 'hand':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-fingers'), transformOrigin: '40px 65px', display: 'block' }}>
          <rect x="14" y="22" width="12" height="32" rx="6" fill="#ffd6a0" stroke="#c9a84c" strokeWidth="2.5" />
          <rect x="30" y="14" width="12" height="40" rx="6" fill="#ffd6a0" stroke="#c9a84c" strokeWidth="2.5" />
          <rect x="46" y="20" width="12" height="36" rx="6" fill="#ffd6a0" stroke="#c9a84c" strokeWidth="2.5" />
          <rect x="20" y="52" width="38" height="20" rx="8" fill="#ffd6a0" stroke="#c9a84c" strokeWidth="2.5" />
        </svg>
      )
    case 'vibrator':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-vibrate'), display: 'block' }}>
          <rect x="26" y="8" width="28" height="58" rx="14" fill="#a78bfa" stroke="#7c3aed" strokeWidth="3" />
          <ellipse cx="40" cy="8" rx="14" ry="8" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="2" />
          <line x1="14" y1="28" x2="22" y2="32" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
          <line x1="58" y1="28" x2="66" y2="24" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
          <line x1="14" y1="44" x2="22" y2="40" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
          <line x1="58" y1="44" x2="66" y2="48" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'gel':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ display: 'block' }}>
          <rect x="26" y="14" width="28" height="40" rx="12" fill="#7dd3fc" stroke="#38bdf8" strokeWidth="3" />
          <rect x="32" y="8"  width="16" height="10" rx="4"  fill="#bae6fd" stroke="#38bdf8" strokeWidth="2" />
          <path d="M36 6 Q40 2 44 6" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M36 58 Q40 72 44 58" fill="#38bdf8" opacity="0.7"
            style={{ animation: pressed ? 'sx-drip 0.6s ease-in infinite' : 'none' }} />
        </svg>
      )
    case 'whip':
      return (
        <svg width={s} height={s} viewBox="0 0 80 80" style={{ animation: anim('sx-whip'), transformOrigin: '10px 10px', display: 'block' }}>
          <path d="M10 10 Q46 22 68 64" stroke="#e94560" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M62 56 L72 60 L68 70 Z" fill="#e94560" />
          <circle cx="10" cy="10" r="9" fill="#c9a84c" stroke="#a07830" strokeWidth="2" />
        </svg>
      )
    default:
      return <span style={{ fontSize: s * 0.6 }}>🔧</span>
  }
}

// 구속 SVG 오버레이
// 가죽 수갑/족갑 고리 — 앞면(아래 반원) 진하게, 뒷면(위 반원) 흐리게
function LeatherCuffRing({ x, y, size, color, label, rotate, onDrag, onResize, onRotate }: {
  x: number; y: number; size: number; color: string; label: string; rotate: number
  onDrag: (e: React.MouseEvent) => void
  onResize: (e: React.MouseEvent) => void
  onRotate: (centerX: number, centerY: number, e: React.MouseEvent) => void
}) {
  const rx = size, ry = Math.round(size * 0.55)
  const cx = rx + 8, cy = ry + 8
  const w = rx * 2 + 16, h = ry * 2 + 16

  // 반원 path 헬퍼 — sweep=0: 위쪽(뒤), sweep=1: 아래쪽(앞)
  const arc = (sweep: 0 | 1, rxi: number, ryi: number) =>
    `M ${cx - rxi} ${cy} A ${rxi} ${ryi} 0 0 ${sweep} ${cx + rxi} ${cy}`

  const divRef = React.useRef<HTMLDivElement>(null)

  const handleRotateDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const el = divRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top  + rect.height / 2
    onRotate(centerX, centerY, e)
  }

  return (
    <div ref={divRef} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rotate}deg)`, zIndex: 50, userSelect: 'none' }}>
      <div onMouseDown={onDrag} style={{ cursor: 'grab', display: 'inline-block' }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`lg-${label}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6b3a1f" />
              <stop offset="40%" stopColor="#3d1f0a" />
              <stop offset="100%" stopColor="#1a0a00" />
            </radialGradient>
          </defs>

          {/* ── 뒷면 (위 반원) — 거의 안 보이게 ── */}
          <path d={arc(0, rx, ry)}     fill="none" stroke="#0a0400"             strokeWidth="18" opacity="0.08" />
          <path d={arc(0, rx, ry)}     fill="none" stroke={`url(#lg-${label})`} strokeWidth="14" opacity="0.08" />
          <path d={arc(0, rx, ry)}     fill="none" stroke={color}               strokeWidth="2"  opacity="0.07" />
          <path d={arc(0, rx-6, ry-6)} fill="none" stroke="#ffffff08"           strokeWidth="1"  strokeDasharray="4 5" />

          {/* ── 앞면 (아래 반원) — 진하게 ── */}
          <path d={arc(1, rx, ry)}     fill="none" stroke="#0a0400"             strokeWidth="18" />
          <path d={arc(1, rx, ry)}     fill="none" stroke={`url(#lg-${label})`} strokeWidth="14" />
          <path d={arc(1, rx, ry)}     fill="none" stroke={color}               strokeWidth="2.5" opacity="0.7" />
          <path d={arc(1, rx-6, ry-6)} fill="none" stroke="#ffffff33"           strokeWidth="1"  strokeDasharray="4 5" />

          {/* 버클 점 (뒤쪽 상단) */}
          <circle cx={cx} cy={cy - ry} r="5" fill={color} stroke="#000" strokeWidth="1.5" opacity="0.35" />
        </svg>
      </div>
      {/* 리사이즈 핸들 */}
      <div onMouseDown={onResize} style={{
        position: 'absolute', right: -4, bottom: -4,
        width: 20, height: 20, cursor: 'nwse-resize',
        background: color, borderRadius: 4, opacity: 0.9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#000', fontWeight: 'bold', boxShadow: '0 1px 4px #000a',
      }}>↔</div>
      {/* 회전 핸들 */}
      <div onMouseDown={handleRotateDown} style={{
        position: 'absolute', left: '50%', top: -22, transform: 'translateX(-50%)',
        width: 20, height: 20, cursor: 'alias',
        background: '#1a1a2e', border: `1.5px solid ${color}`,
        borderRadius: '50%', opacity: 0.9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: color, boxShadow: '0 1px 4px #000a',
      }}>↻</div>
      <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#ffffff77', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

// 체인 링크 SVG — 베지어 곡선, 고리 안쪽 끝 연결, 중간 핸들 absolute div
function ChainLinks({ ax, ay, mx, my, bx, by, w, h, color, leftSize, rightSize, onMidDrag }: {
  ax:number; ay:number; mx:number; my:number; bx:number; by:number
  w:number; h:number; color:string; leftSize:number; rightSize:number
  onMidDrag: (e: React.MouseEvent) => void
}) {
  const toX = (v: number) => v / 100 * w
  const toY = (v: number) => v / 100 * h

  // 고리 중심 (px)
  const lx = toX(ax), ly = toY(ay)
  const rx = toX(bx), ry = toY(by)
  const ctrl = [toX(mx), toY(my)]

  // 두 중심 사이 단위 벡터
  const dx = rx - lx, dy = ry - ly
  const dist = Math.sqrt(dx*dx + dy*dy) || 1
  const ux = dx/dist, uy = dy/dist

  // 각 고리의 안쪽 끝점 (중심에서 상대방 방향으로 고리 반지름만큼 이동)
  const lrx = leftSize,  lry = Math.round(leftSize  * 0.55)
  const rrx = rightSize, rry = Math.round(rightSize * 0.55)
  // 타원 경계 근사: r = rx*ry / sqrt((ry*ux)^2 + (rx*uy)^2)
  const lEdge = (lrx*lry) / Math.sqrt((lry*ux)**2 + (lrx*uy)**2)
  const rEdge = (rrx*rry) / Math.sqrt((rry*ux)**2 + (rrx*uy)**2)

  const [x1, y1] = [lx + ux*lEdge,  ly + uy*lEdge ]  // 왼 고리 오른쪽 끝
  const [x2, y2] = [rx - ux*rEdge,  ry - uy*rEdge ]  // 오른 고리 왼쪽 끝
  const [cx2, cy2] = ctrl

  // 2차 베지어 곡선
  const curvePath = `M ${x1} ${y1} Q ${cx2} ${cy2} ${x2} ${y2}`

  // 은색 금속 느낌 색상
  const metalFill   = '#c8c8c8'
  const metalStroke = '#555555'
  const metalShine  = '#eeeeee'

  // 곡선 위 체인 링크
  const arcLen = Math.sqrt((x2-x1)**2 + (y2-y1)**2) * 1.2
  const n = Math.max(2, Math.floor(arcLen / 14))
  const gradId = `chain-grad-${ax.toFixed(0)}-${ay.toFixed(0)}`
  const links: React.ReactNode[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const bpx = (1-t)*(1-t)*x1 + 2*(1-t)*t*cx2 + t*t*x2
    const bpy = (1-t)*(1-t)*y1 + 2*(1-t)*t*cy2 + t*t*y2
    const tx2 = 2*(1-t)*(cx2-x1) + 2*t*(x2-cx2)
    const ty2 = 2*(1-t)*(cy2-y1) + 2*t*(y2-cy2)
    const ang = Math.atan2(ty2, tx2) * 180 / Math.PI
    const isH = i % 2 === 0
    links.push(
      <g key={i} transform={`rotate(${ang},${bpx},${bpy})`}>
        {/* 링크 몸체 */}
        <ellipse cx={bpx} cy={bpy}
          rx={isH ? 9 : 5} ry={isH ? 5 : 9}
          fill={`url(#${gradId})`} stroke={metalStroke} strokeWidth="2" />
        {/* 광택 하이라이트 */}
        <ellipse cx={bpx - (isH?2:0)} cy={bpy - (isH?0:2)}
          rx={isH ? 4 : 2} ry={isH ? 2 : 4}
          fill={metalShine} fillOpacity="0.45" />
      </g>
    )
  }

  // 중간 핸들 absolute 위치 (%)
  const midLeft = `${mx}%`, midTop = `${my}%`

  return (
    <>
      {/* 체인 SVG — pointerEvents 없음 */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:40, overflow:'visible', pointerEvents:'none' }}
        viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#e8e8e8" />
            <stop offset="50%"  stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#606060" />
          </radialGradient>
        </defs>
        <path d={curvePath} fill="none" stroke="#88888844" strokeWidth="1" />
        {links}
      </svg>
      {/* 중간 핸들 — absolute div, zIndex 60으로 모든 것 위 */}
      <div
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onMidDrag(e) }}
        style={{
          position:'absolute', left: midLeft, top: midTop,
          transform:'translate(-50%,-50%)',
          zIndex: 60, cursor:'crosshair', userSelect:'none',
          width: 28, height: 28, borderRadius: '50%',
          background: color, border: '2.5px solid #000',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: 13, fontWeight:'bold', color:'#000',
          boxShadow:'0 2px 6px #000a',
        }}>✦</div>
    </>
  )
}

// 안대 오버레이 (크기·회전 핸들 포함)
function BlindfoldOverlay({ pos, size, rotate, onDrag, onResize, onRotate }: {
  pos: { x: number; y: number }
  size: number; rotate: number
  onDrag: (e: React.MouseEvent) => void
  onResize: (e: React.MouseEvent) => void
  onRotate: (cx: number, cy: number, e: React.MouseEvent) => void
}) {
  const divRef = React.useRef<HTMLDivElement>(null)
  const bw = Math.round(320 * size), bh = Math.round(90 * size)
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const r = divRef.current?.getBoundingClientRect()
    if (!r) return
    onRotate(r.left + r.width/2, r.top + r.height/2, e)
  }
  return (
    <div ref={divRef} style={{
      position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
      transform:`translate(-50%,-50%) rotate(${rotate}deg)`,
      zIndex:25, userSelect:'none',
    }}>
      {/* 안대 본체 */}
      <div onMouseDown={onDrag} style={{ cursor:'grab' }}>
        <svg width={bw} height={bh} viewBox="0 0 320 90">
          <defs>
            <radialGradient id="bf-grad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#2a0a1a" />
              <stop offset="100%" stopColor="#0d0010" />
            </radialGradient>
          </defs>
          {/* 측면 끈 */}
          <rect x="0"   y="36" width="48"  height="18" rx="9" fill="#111" stroke="#e9456088" strokeWidth="2" />
          <rect x="272" y="36" width="48"  height="18" rx="9" fill="#111" stroke="#e9456088" strokeWidth="2" />
          {/* 안대 중앙 패드 — 물결 모양 */}
          <path d="M48 18 Q90 5 130 20 Q160 32 190 20 Q230 5 272 18 L272 72 Q230 85 190 70 Q160 58 130 70 Q90 85 48 72 Z"
            fill="url(#bf-grad)" stroke="#e94560" strokeWidth="3" />
          {/* 광택 라인 */}
          <path d="M60 30 Q130 18 200 28 Q240 33 262 30"
            fill="none" stroke="#ff80a0" strokeWidth="1.5" opacity="0.4" />
          {/* 스티치 */}
          <path d="M55 44 Q160 36 265 44" fill="none" stroke="#e9456044" strokeWidth="1" strokeDasharray="6 5" />
          <path d="M55 56 Q160 64 265 56" fill="none" stroke="#e9456044" strokeWidth="1" strokeDasharray="6 5" />
          {/* 중앙 장식 버클 */}
          <rect x="148" y="36" width="24" height="18" rx="4" fill="#c9a84c" stroke="#8b6914" strokeWidth="1.5" />
          <line x1="160" y1="36" x2="160" y2="54" stroke="#8b6914" strokeWidth="1.5" />
        </svg>
      </div>
      {/* 리사이즈 핸들 */}
      <div onMouseDown={(e) => { e.stopPropagation(); onResize(e) }} style={{
        position:'absolute', right:-6, bottom:-6, width:22, height:22,
        cursor:'nwse-resize', background:'#e94560', borderRadius:4,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, color:'#fff', fontWeight:'bold', boxShadow:'0 1px 4px #000a',
      }}>↔</div>
      {/* 회전 핸들 */}
      <div onMouseDown={handleRotate} style={{
        position:'absolute', left:'50%', top:-22, transform:'translateX(-50%)',
        width:20, height:20, cursor:'alias',
        background:'#1a1a2e', border:'1.5px solid #e94560', borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, color:'#e94560', boxShadow:'0 1px 4px #000a',
      }}>↻</div>
    </div>
  )
}

// 개목걸이 — 가죽 고리 + 위쪽 쇠사슬 + 끝 그립
function CollarOverlay({ x, y, rotate, size, onDrag, onResize, onRotate }: {
  x:number; y:number; rotate:number; size:number
  onDrag:(e:React.MouseEvent)=>void
  onResize:(e:React.MouseEvent)=>void
  onRotate:(cx:number,cy:number,e:React.MouseEvent)=>void
}) {
  const divRef = React.useRef<HTMLDivElement>(null)
  const ringSize = Math.round(80 * size)
  const rx = ringSize, ry = Math.round(ringSize * 0.55)
  const chainLen = 360
  const gripLen = 80                   // 손잡이 길이
  const pad = 8
  const totalH = ry * 2 + pad + chainLen + gripLen + pad
  const cxSvg = rx + pad
  const cySvg = ry + pad               // 고리 중심 y (위쪽)
  const chainStartY = cySvg + ry       // 고리 하단 연결점
  const chainEndY = pad + ry*2 + chainLen  // 쇠사슬 끝 (손잡이 바로 위)
  const gripTop = chainEndY            // 손잡이 시작 y (아래쪽)

  const arc = (sweep:0|1, rxi:number, ryi:number) =>
    `M ${cxSvg-rxi} ${cySvg} A ${rxi} ${ryi} 0 0 ${sweep} ${cxSvg+rxi} ${cySvg}`

  // 쇠사슬 링크 생성
  const chainLinks: React.ReactNode[] = []
  const n = Math.floor(chainLen / 14)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const cy2 = chainStartY + t * (chainEndY - chainStartY)
    const isH = i % 2 === 0
    chainLinks.push(
      <g key={i}>
        <ellipse cx={cxSvg} cy={cy2} rx={isH?9:5} ry={isH?5:9}
          fill="url(#chain-grad)" stroke="#555" strokeWidth="2"/>
        <ellipse cx={isH?cxSvg-2:cxSvg} cy={isH?cy2:cy2-2} rx={isH?4:2} ry={isH?2:4}
          fill="#eee" fillOpacity="0.45"/>
      </g>
    )
  }

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const r = divRef.current?.getBoundingClientRect()
    if (!r) return
    onRotate(r.left + r.width/2, r.top + r.height/2, e)
  }

  const w = rx * 2 + pad * 2

  return (
    <div ref={divRef} style={{
      position:'absolute', left:`${x}%`, top:`${y}%`,
      transform:`translate(-50%,-50%) rotate(${rotate}deg)`,
      zIndex:50, userSelect:'none',
    }}>
      <div onMouseDown={onDrag} style={{ cursor:'grab', display:'inline-block' }}>
        <svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`} style={{ display:'block' }}>
          <defs>
            <radialGradient id="collar-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6b3a1f"/>
              <stop offset="40%" stopColor="#3d1f0a"/>
              <stop offset="100%" stopColor="#1a0a00"/>
            </radialGradient>
            <radialGradient id="chain-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%"   stopColor="#e8e8e8"/>
              <stop offset="50%"  stopColor="#a0a0a0"/>
              <stop offset="100%" stopColor="#606060"/>
            </radialGradient>
          </defs>

          {/* 쇠사슬 (위쪽) */}
          {chainLinks}

          {/* 끝 그립 핸들 (길쭉한 가죽 손잡이) */}
          <rect x={cxSvg-18} y={gripTop} width={36} height={gripLen} rx="10"
            fill="#3d1f0a" stroke="#0a0400" strokeWidth="2.5"/>
          <rect x={cxSvg-14} y={gripTop+3} width={28} height={gripLen-6} rx="7"
            fill="#6b3a1f" stroke="none"/>
          {/* 스티치 선 */}
          {Array.from({length: Math.floor(gripLen/12)}).map((_,i) => (
            <line key={i}
              x1={cxSvg-8} y1={gripTop+6+i*12} x2={cxSvg-8} y2={gripTop+10+i*12}
              stroke="#ffffff28" strokeWidth="0.8"/>
          ))}
          {Array.from({length: Math.floor(gripLen/12)}).map((_,i) => (
            <line key={i}
              x1={cxSvg+8} y1={gripTop+6+i*12} x2={cxSvg+8} y2={gripTop+10+i*12}
              stroke="#ffffff28" strokeWidth="0.8"/>
          ))}

          {/* 고리 뒷면 위쪽 (흐림) */}
          <path d={arc(1,rx,ry)} fill="none" stroke="#0a0400"            strokeWidth="18" opacity="0.08"/>
          <path d={arc(1,rx,ry)} fill="none" stroke="url(#collar-grad)" strokeWidth="14" opacity="0.08"/>
          <path d={arc(1,rx,ry)} fill="none" stroke="#e94560"            strokeWidth="2"  opacity="0.07"/>
          {/* 고리 앞면 아래쪽 (보이는 부분) */}
          <path d={arc(0,rx,ry)} fill="none" stroke="#0a0400"            strokeWidth="18"/>
          <path d={arc(0,rx,ry)} fill="none" stroke="url(#collar-grad)" strokeWidth="14"/>
          <path d={arc(0,rx,ry)} fill="none" stroke="#e94560"            strokeWidth="2.5" opacity="0.7"/>
          <path d={arc(0,rx-6,ry-6)} fill="none" stroke="#ffffff33"      strokeWidth="1" strokeDasharray="4 5"/>
          {/* 버클 (하단 연결점 - 체인과 연결) */}
          <circle cx={cxSvg} cy={cySvg+ry} r="6" fill="#c9a84c" stroke="#8b6914" strokeWidth="1.5"/>
        </svg>
      </div>
      {/* 리사이즈 */}
      <div onMouseDown={(e)=>{e.stopPropagation();onResize(e)}} style={{
        position:'absolute', right:-4, bottom:-4, width:20, height:20,
        cursor:'nwse-resize', background:'#e94560', borderRadius:4,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, color:'#fff', fontWeight:'bold', boxShadow:'0 1px 4px #000a',
      }}>↔</div>
      {/* 회전 — 쇠사슬과 겹치지 않게 오른쪽으로 */}
      <div onMouseDown={handleRotate} style={{
        position:'absolute', left:'70%', top:-22,
        width:20, height:20, cursor:'alias',
        background:'#1a1a2e', border:'1.5px solid #e94560', borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, color:'#e94560', boxShadow:'0 1px 4px #000a',
      }}>↻</div>
    </div>
  )
}

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
  const [currentPoseKey, setCurrentPoseKey] = useState(poseKey)
  const [showPoseSelect, setShowPoseSelect] = useState(false)
  const [failEnding, setFailEnding] = useState(false)
  const [femaleArousal, setFemaleArousal] = useState(0)
  const [maleArousal, setMaleArousal] = useState(0)
  const [phase, setPhase] = useState<ScenePhase>('foreplay')
  const [activeTool, setActiveTool] = useState<ToolKey>('hand')
  const activeToolRef = useRef<ToolKey>('hand')
  const [sector, setSector] = useState<SectorKey>('body')
  const [pressedTool, setPressedTool] = useState<ToolKey | null>(null)
  const [restraints, setRestraints] = useState<Set<RestraintKey>>(new Set())
  const [restraintDragPos, setRestraintDragPos] = useState<Record<string, { x: number; y: number }>>({})
  const draggingRestraint = useRef<{ key: RestraintKey; offsetX: number; offsetY: number } | null>(null)
  // 안대 크기/각도
  const [blindfoldSize,   setBlindfoldSize]   = useState(1)   // 배율 0.5~2.5
  const [blindfoldRotate, setBlindfoldRotate] = useState(0)
  // 개목걸이 위치/각도/크기 (단일)
  const [collarState, setCollarState] = useState({ x: 50, y: 15, rotate: 0, size: 1 })
  // SM 도구 드래그 중 여부 → 남성 흥분도 정지용
  const isDraggingSM = useRef(false)
  // 수갑/족갑: 배열 + 마지막 위치 기억
  const [handcuffs, setHandcuffs] = useState<CuffPair[]>([])
  const [legcuffs,  setLegcuffs]  = useState<CuffPair[]>([])
  const lastHandcuffs = useRef<CuffPair[]>([])
  const lastLegcuffs  = useRef<CuffPair[]>([])
  const [imgDims, setImgDims] = useState({ w: 400, h: 600 })
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [toolAnim, setToolAnim] = useState<{ cx: number; cy: number } | null>(null)
  const toolAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelScrollRef = useRef<HTMLDivElement>(null)
  React.useEffect(() => { if (panelScrollRef.current) panelScrollRef.current.scrollTop = 0 }, [])

  // 이미지 컨테이너 실제 픽셀 크기 추적 (체인 링크 계산용)
  React.useEffect(() => {
    const el = imageContainerRef.current
    if (!el) return
    // getBoundingClientRect = 화면 px (zoom 반영) → clientX 델타와 동일 단위
    const update = () => { const r = el.getBoundingClientRect(); setImgDims({ w: r.width, h: r.height }) }
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // 수갑/족갑 추가 (최대 2쌍, 초과 시 전체 제거)
  const newCuffPair = (y: number): CuffPair => ({
    id: Date.now().toString(),
    left:  { x: 28, y }, right: { x: 72, y }, mid: { x: 50, y },
    leftSize: 80, rightSize: 80,
    leftRotate: 0, rightRotate: 0,
  })
  const toggleHandcuffs = () => setHandcuffs(p => {
    if (p.length >= 1) { lastHandcuffs.current = p; return [] }
    return lastHandcuffs.current.length > 0 ? lastHandcuffs.current : [newCuffPair(30)]
  })
  const toggleLegcuffs = () => setLegcuffs(p => {
    if (p.length >= 1) {
      const next = p.slice(0, -1)
      if (next.length === 0) lastLegcuffs.current = p
      return next
    }
    return lastLegcuffs.current.length > 0 ? lastLegcuffs.current : [newCuffPair(75)]
  })

  // 수갑/족갑 쌍 업데이트 헬퍼
  const updateCuff = (type: 'hand' | 'leg', id: string, patch: Partial<CuffPair>) => {
    const setter = type === 'hand' ? setHandcuffs : setLegcuffs
    setter(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  // feedback state 제거 — chatLog로 통합
  const [femaleFlash, setFemaleFlash] = useState(false)
  const [pointPopup, setPointPopup] = useState<{ value: number; cx: number; cy: number; id: number } | null>(null)
  const pointPopupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointPopupId = useRef(0)
  const [orgasmCount, setOrgasmCount] = useState(0)
  const [orgasmFlash, setOrgasmFlash] = useState(false)
  const [maleFlash, setMaleFlash] = useState(false)
  const [ended, setEnded] = useState(false)
  const gelApplied = useRef(false)
  const toolUseCount = useRef<Record<string, number>>({})
  const lastUsedTool = useRef<string>('')
  const lastActionTime = useRef<number>(0)
  const lastZoneKey = useRef<string>('')
  const consecutiveCount = useRef<number>(0)
  const lastGroupKey = useRef<string>('')
  const groupCount = useRef<number>(0)
  const [chatLog, setChatLog] = useState<{ text: string; color: string; id: number }[]>([])
  const chatLogRef = useRef<HTMLDivElement>(null)
  const chatIdRef = useRef(0)

  // 3초 무행동 시 여캐 흥분도 초당 10씩 감소
  useEffect(() => {
    const timer = setInterval(() => {
      if (ended || failEnding) return
      if (Date.now() - lastActionTime.current > 3000) {
        setFemaleArousal(prev => Math.max(0, prev - 10))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [ended, failEnding])

  // 포즈 이미지 URL 추출
  const poseImages = femaleChar.poseImages ?? {}
  const arousedImg = poseImages[`${currentPoseKey}_aroused`] ?? ''
  const climaxImg  = poseImages[`${currentPoseKey}_climax`]  ?? ''

  // 스프라이트 URL 추출
  const spriteUrls: string[] = [0, 1, 2]
    .map(i => poseImages[`${currentPoseKey}_aroused_sprite_${i}`] ?? poseImages[`${currentPoseKey}_sprite_${i}`] ?? '')
    .filter(Boolean)
  const climaxSpriteUrls: string[] = [0, 1, 2]
    .map(i => poseImages[`${currentPoseKey}_climax_sprite_${i}`] ?? '')
    .filter(Boolean)
  console.log('[SexScene] poseKey:', currentPoseKey, '| poseImages keys:', Object.keys(poseImages), '| spriteUrls:', spriteUrls.length)

  // 나이 배율
  const age = femaleChar.age ?? 25
  const ageMult = age < 30 ? 0.8 : age < 40 ? 1.0 : 1.2

  // 남캐 SM 궁합 배율 (male: 음수=S, 양수=M / female: 음수=M, 양수=S)
  // 같은 부호 = 상생(S지배+M복종), 다른 부호 = 충돌
  const maleSM = maleChar?.smTendency ?? 0
  const femaleSM = femaleChar.smTendency ?? 0
  const smCompatMult = maleSM * femaleSM > 0 ? 1.5
                     : maleSM * femaleSM < 0 ? 0.5
                     : 1.0

  // 남캐 성기/테크닉 스탯 (기본값: 50/50/25/25)
  const mPenisSize   = maleChar?.penisSize     ?? 50
  const mPenisGirth  = maleChar?.penisGirth    ?? 50
  const mHardness    = maleChar?.erectHardness ?? 25
  const mTechnique   = maleChar?.erectTechnique ?? 25

  // 채찍 배율 계산 (smTendency: 음수=M성향=채찍 좋아함, 양수=S성향=싫어함→음수)
  // SM 효과 50% 적용 (smMod 보정 반절) + 남녀 SM 궁합 적용
  const getWhipMult = useCallback(() => {
    const sm = femaleChar.smTendency ?? 0
    if (sm > 0) return -(sm / 20) * smCompatMult  // S성향: 감소 (궁합 충돌 시 더 큰 감소)
    const base = 1.5 + (-sm * 0.025)  // M성향: smMod 반절
    const restrained = restraints.has('handcuff') && restraints.has('legcuff')
    return Math.min(3.0, base) * (restrained ? 1.3 : 1.0) * smCompatMult
  }, [femaleChar.smTendency, restraints, smCompatMult])

  // 도구 배율 계산 (매트릭스 기반, 음수 = 흥분도 하락)
  const getToolMult = useCallback((toolKey: ToolKey, zoneKey: string): number => {
    if (toolKey === 'whip' || toolKey === 'anal_dildo') {
      const sm = femaleChar.smTendency ?? 0
      if (sm > 0) return -(sm / 20) * smCompatMult  // S성향: 감소 (궁합 반영)
      if (toolKey === 'anal_dildo') {
        const base = TOOL_ZONE_MATRIX.anal_dildo[zoneKey as ErogenousKey] ?? 0
        const smMod = 1.0 + (-sm * 0.025)  // M성향: 반절 보정
        return base <= 0 ? base : Math.min(3.0, base * smMod) * smCompatMult
      }
      const level = Math.min(4, restraints.size)
      const base = WHIP_LEVEL_MATRIX[level][zoneKey as ErogenousKey] ?? 0
      if (base <= 0) return base
      const smMod = 1.0 + (-sm * 0.025)  // M성향: 반절 보정
      return Math.min(3.0, base * smMod) * smCompatMult
    }
    // 젤 콤보: 젤 적용 후 손/딜도/진동기 사용 시
    if (gelApplied.current && (toolKey === 'hand' || toolKey === 'dildo' || toolKey === 'vibrator')) {
      const base = TOOL_ZONE_MATRIX[toolKey]?.[zoneKey as ErogenousKey] ?? 0
      const bonus = GEL_COMBO_MATRIX[zoneKey as ErogenousKey] ?? 1
      return base * bonus
    }
    return TOOL_ZONE_MATRIX[toolKey]?.[zoneKey as ErogenousKey] ?? 0
  }, [femaleChar.smTendency, restraints, smCompatMult])

  // 현재 섹터의 도구 목록
  const sectorTools = TOOL_DEFS.filter(t => t.sector === sector)

  // 흥분도에 따른 페이즈 결정 + 멀티 오르가즘 (430/460/500)
  useEffect(() => {
    if (ended) return
    const thresholds = [430, 460, 500]
    const nextThreshold = thresholds[orgasmCount]
    if (nextThreshold !== undefined && femaleArousal >= nextThreshold) {
      setOrgasmFlash(true)
      setTimeout(() => setOrgasmFlash(false), 1800)
      if (orgasmCount >= 2) {
        setPhase('climax')
        setEnded(true)
        setTimeout(() => onEnd('success'), 3000)
      }
      setOrgasmCount(prev => prev + 1)
    } else if (femaleArousal >= 100 && phase === 'foreplay') {
      setPhase('aroused')
    }
  }, [femaleArousal, orgasmCount, phase, ended, onEnd])

  const triggerFail = useCallback(() => {
    if (ended) return
    setEnded(true)
    setFailEnding(true)
  }, [ended])

  useEffect(() => {
    if (maleArousal >= 100 && !ended) triggerFail()
  }, [maleArousal, ended, triggerFail])

  // activeToolRef 동기화 (interval 클로저에서 최신 tool 읽기 위해)
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])

  // 남캐 흥분도 자동 증가
  // penis 사용 시: 1초마다 +3 / 다른 도구: 3초마다 +1 (누적 방식)
  const maleArousalAccum = useRef(0)
  useEffect(() => {
    if (ended) return
    const id = setInterval(() => {
      if (isDraggingSM.current || ended || failEnding) return
      const isPenis = activeToolRef.current === 'penis'
      maleArousalAccum.current += isPenis ? 3 : 1
      if (isPenis || maleArousalAccum.current >= 3) {
        const add = isPenis ? 3 : 1
        maleArousalAccum.current = isPenis ? 0 : maleArousalAccum.current - 3
        setMaleArousal(prev => {
          setMaleFlash(true)
          setTimeout(() => setMaleFlash(false), 300)
          return prev + add
        })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ended, failEnding])

  const getEroSensitivity = (key: string) => {
    const eroKey = (key === 'neck' || key === 'ear') ? 'neckEar' : key
    return femaleChar.erogenous?.[eroKey as keyof typeof femaleChar.erogenous] ?? 2
  }

  // ─── 피드백 메시지 풀 ────────────────────────────────────────────────────────
  const MSGS = {
    gain_low:          ['살짝 반응하는 것 같아...', '음...♥', '느끼는 것 같아', '조금 좋은가봐', '흠...기분 좀 나아지네'],
    gain_mid:          ['으응...♥', '좋아...계속해줘', '거기야...♥', '점점 좋아지고 있어', '아...거기 괜찮아'],
    gain_high:         ['아앙!♥', '너무 좋아!!', '으윽...♥♥', '거기 엄청 좋아!!', '아...미칠 것 같아♥'],
    gain_climax:       ['아아앙!!♥♥', '더...더 해줘!!', '너무 좋아 죽겠어♥♥', '계속...제발 계속!!'],
    no_reaction:       ['반응이 없어...', '별로 느끼지 못하는 것 같아', '...(무반응)', '흠, 관심 없는 곳이야'],
    bad_tool:          ['거기에 그건 아니야...', '이상해...', '그게 왜 거기에 가는 거야?', '이건 좀 아닌 것 같아'],
    bad_sensitivity:   ['싫어! 거기는 건드리지 마!', '기분 나빠...', '그곳은 싫다고!', '하지 마...', '거기만은 안 돼'],
    restrict_vagina:   ['아직 거기는 안 돼...', '더 분위기를 만들어줘', '아직 준비가 안 됐어', '천천히 해줘'],
    restrict_penis:    ['아직 삽입은 안 돼...', '좀 더 애무해줘', '성급하다...', '먼저 충분히 달궈줘'],
    restrict_climax:   ['지금은 성기로만...♥', '그냥 넣어줘...♥', '다른 건 필요 없어', '이것만으로 충분해...♥'],
    consec_same:       ['같은 데만 하면 질려...', '다른 곳도 해줘', '거기만 하면 싫어', '좀 바꿔봐', '변화를 줘'],
    consec_group:      ['좌우로만 왔다갔다 하지마...', '너무 단순해...', '다른 곳도 건드려줘', '그것만 반복하면 지겨워'],
  }
  const rnd = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

  // 대화창 로그 추가 헬퍼
  const addChat = (text: string, color: string) => {
    setChatLog(prev => [...prev.slice(-49), { text, color, id: ++chatIdRef.current }])
  }

  // 핫스팟 클릭
  const handleZoneClick = useCallback((zone: HotspotZone) => {
    if (ended || phase === 'climax') return
    const now = Date.now()
    if (now - lastActionTime.current < 500) return
    lastActionTime.current = now

    const isPhotoAroused = femaleArousal < 100
    const isSpriteAroused = femaleArousal >= 100 && femaleArousal < 200
    const isPhotoClimax = femaleArousal >= 400

    const showPointPopup = (value: number, cx: number, cy: number) => {
      if (pointPopupTimer.current) clearTimeout(pointPopupTimer.current)
      setPointPopup({ value, cx, cy, id: ++pointPopupId.current })
      pointPopupTimer.current = setTimeout(() => setPointPopup(null), 1200)
    }

    const showPenalty = (msg: string, cx = 50, cy = 50) => {
      setFemaleArousal(prev => Math.max(0, prev - 10))
      setFemaleFlash(true)
      setTimeout(() => setFemaleFlash(false), 300)
      showPointPopup(-20, cx, cy)
      addChat(`⚠ ${msg}`, '#e94560')
    }

    if (isPhotoAroused && (zone.key === 'vagina' || zone.key === 'anal')) {
      return showPenalty(rnd(MSGS.restrict_vagina), zone.cx, zone.cy)
    }
    if (isPhotoAroused && activeTool === 'penis') {
      return showPenalty(rnd(MSGS.restrict_penis), zone.cx, zone.cy)
    }
    if (isSpriteAroused && activeTool === 'penis') {
      return showPenalty(rnd(MSGS.restrict_penis), zone.cx, zone.cy)
    }
    if (isPhotoClimax && activeTool !== 'penis') {
      return showPenalty(rnd(MSGS.restrict_climax), zone.cx, zone.cy)
    }
    if (isPhotoClimax && activeTool === 'penis' && zone.key !== 'vagina' && zone.key !== 'anal') {
      return showPenalty('지금은 그곳이 아니야... 안으로 들어와야 해.', zone.cx, zone.cy)
    }

    // 도구 사용 횟수 제한 (3회 초과 시 penalty)
    // 제외: SM 장구류(수갑/족갑/안대/개목걸이), 젤, 그리고 절정사진에서 penis
    const UNLIMITED_TOOLS = new Set(['handcuff', 'legcuff', 'blindfold', 'collar', 'gel'])
    if (!UNLIMITED_TOOLS.has(activeTool) && !(isPhotoClimax && activeTool === 'penis')) {
      // 다른 도구로 바꿨으면 이전 도구 카운트 리셋
      if (lastUsedTool.current && lastUsedTool.current !== activeTool) {
        toolUseCount.current[lastUsedTool.current] = 0
      }
      lastUsedTool.current = activeTool
      const count = (toolUseCount.current[activeTool] ?? 0) + 1
      toolUseCount.current[activeTool] = count
      if (count > 3) {
        return showPenalty('이제 그건 별로야... 다른 걸 써봐', zone.cx, zone.cy)
      }
    }

    // 연속 공략 체크
    const pairedZones = ['breast', 'thigh', 'ear']
    const isPaired = pairedZones.includes(zone.key)
    const sideKey = isPaired ? `${zone.key}_${zone.cx < 50 ? 'L' : 'R'}` : zone.key

    if (!isPhotoClimax) {
      if (sideKey === lastZoneKey.current) {
        consecutiveCount.current += 1
      } else {
        lastZoneKey.current = sideKey
        consecutiveCount.current = 1
      }
      if (consecutiveCount.current >= 4) {
        return showPenalty(rnd(MSGS.consec_same), zone.cx, zone.cy)
      }

      if (isPaired) {
        if (zone.key === lastGroupKey.current) {
          groupCount.current += 1
        } else {
          lastGroupKey.current = zone.key
          groupCount.current = 1
        }
        if (groupCount.current >= 7) {
          return showPenalty(rnd(MSGS.consec_group), zone.cx, zone.cy)
        }
      } else {
        lastGroupKey.current = ''
        groupCount.current = 0
      }
    }

    // 젤 적용 상태 관리
    if (activeTool === 'gel') {
      gelApplied.current = true
      showPointPopup(0, zone.cx, zone.cy)
      addChat('촉촉하게 발라줬어...♥', '#c9a84c')
      return
    }
    const isGelCombo = gelApplied.current && (activeTool === 'hand' || activeTool === 'dildo' || activeTool === 'vibrator')
    if (!isGelCombo) gelApplied.current = false

    const sensitivity = getEroSensitivity(zone.key)
    const toolMult = getToolMult(activeTool, zone.key)
    const posePref = (femaleChar.prefPose?.[currentPoseKey as keyof typeof femaleChar.prefPose] ?? 3) / 3
    const sensMod = sensitivity * 0.5  // sensitivity 효과 50% 적용

    // 남캐 발기 스탯 vs 여캐 발기 선호: 초과면 보너스, 미달이면 페널티
    // penis 도구 사용 시만 적용 (각 stat: diff >= 0 → +diff/200, diff < 0 → +diff/100)
    const malePrefBonus = activeTool === 'penis' ? (() => {
      const pref = femaleChar.prefErect ?? { power: 25, duration: 25, hardness: 25, tech: 25 }
      const stats = [
        { m: maleChar?.erectPower    ?? 25, f: pref.power },
        { m: maleChar?.erectDuration ?? 25, f: pref.duration },
        { m: mHardness,                     f: pref.hardness },
        { m: mTechnique,                    f: pref.tech },
      ]
      return stats.reduce((sum, { m, f }) => {
        const diff = m - f
        return sum + (diff >= 0 ? diff / 200 : diff / 100)
      }, 0)
    })() : 0

    // 성기 크기: 길이+두께 합산(기준 100) → penis 도구 additive 보너스
    const maleSizeBonus = activeTool === 'penis'
      ? (mPenisSize + mPenisGirth - 100) / 200
      : 0

    const gain = toolMult < 0
      ? toolMult * 20
      : sensitivity < 0
        ? sensMod * 5
        : toolMult * ageMult * posePref * 2 + sensMod + malePrefBonus + maleSizeBonus

    setFemaleArousal(prev => Math.min(500, Math.max(0, prev + gain)))
    setFemaleFlash(true)
    setTimeout(() => setFemaleFlash(false), 300)

    if (gain !== 0) showPointPopup(Math.round(gain), zone.cx, zone.cy)

    if (toolAnimTimer.current) clearTimeout(toolAnimTimer.current)
    setToolAnim({ cx: zone.cx, cy: zone.cy })
    toolAnimTimer.current = setTimeout(() => setToolAnim(null), 700)

    // 젤 콤보 소모
    if (isGelCombo) gelApplied.current = false

    let msgText: string
    let msgColor: string
    if (isGelCombo && gain > 0) {
      msgText = `젤 덕분에 더 좋아...♥ `+ (rnd(MSGS.gain_mid))
      msgColor = '#c9a84c'
    } else if (toolMult < 0) {
      msgText = rnd(MSGS.bad_tool)
      msgColor = '#e94560'
    } else if (sensitivity < 0) {
      msgText = rnd(MSGS.bad_sensitivity)
      msgColor = '#e94560'
    } else if (gain === 0) {
      msgText = rnd(MSGS.no_reaction)
      msgColor = '#ffffff44'
    } else if (gain >= 20) {
      msgText = femaleArousal >= 800 ? rnd(MSGS.gain_climax) : rnd(MSGS.gain_high)
      msgColor = '#ff6b9d'
    } else if (gain >= 10) {
      msgText = rnd(MSGS.gain_mid)
      msgColor = '#c9a84c'
    } else {
      msgText = rnd(MSGS.gain_low)
      msgColor = '#ffffff88'
    }

    addChat(msgText, msgColor)
  }, [ended, phase, femaleArousal, femaleChar.erogenous, activeTool, getToolMult, ageMult])

  // chatLog 자동 스크롤
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [chatLog])

  // 구속 토글
  const toggleRestraint = (key: RestraintKey) => {
    setRestraints(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // 흥분도 구간별 표시 모드
  const displayMode = femaleArousal >= 400 ? 'photo_climax'
    : femaleArousal >= 200 ? 'sprite_climax'
    : femaleArousal >= 100 ? 'sprite_aroused'
    : 'photo_aroused'

  const currentSpriteUrls = displayMode === 'sprite_climax'
    ? (climaxSpriteUrls.length >= 1 ? climaxSpriteUrls : spriteUrls)
    : spriteUrls
  const showSprite = (displayMode === 'sprite_aroused' || displayMode === 'sprite_climax') && currentSpriteUrls.length >= 1
  const showClimax = displayMode === 'photo_climax'
  const disappointedImg = femaleChar.expressionImages?.[3] ?? femaleChar.imageUrl ?? ''
  const imgSrc = failEnding ? disappointedImg : (femaleArousal >= 200 ? climaxImg : arousedImg)

  const exprKey: 'aroused' | 'climax' = femaleArousal >= 200 ? 'climax' : 'aroused'
  const climaxSpriteStored  = poseImages[`${currentPoseKey}_climax_sprite_hotspots`]  as unknown as HotspotZone[] | undefined
  const arousedSpriteStored = poseImages[`${currentPoseKey}_aroused_sprite_hotspots`] as unknown as HotspotZone[] | undefined
  const climaxStored  = poseImages[`${currentPoseKey}_climax_hotspots`]  as unknown as HotspotZone[] | undefined
  const arousedStored = poseImages[`${currentPoseKey}_aroused_hotspots`] as unknown as HotspotZone[] | undefined
  const hotspots: HotspotZone[] = (() => {
    if (exprKey === 'climax') {
      if (showSprite && climaxSpriteStored?.length) return climaxSpriteStored
      return climaxStored?.length ? climaxStored : (arousedStored?.length ? arousedStored : (HOTSPOTS[currentPoseKey] ?? HOTSPOTS['missionary']))
    }
    if (showSprite && arousedSpriteStored?.length) return arousedSpriteStored
    return arousedStored?.length ? arousedStored : (HOTSPOTS[currentPoseKey] ?? HOTSPOTS['missionary'])
  })()

  // 구속 오버레이 위치 (자세 fallback: missionary)
  const restraintPos = RESTRAINT_POS[currentPoseKey] ?? RESTRAINT_POS['missionary']

  // 드래그 핸들러
  const handleRestraintMouseDown = useCallback((key: RestraintKey, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cur = restraintDragPos[key] ?? restraintPos[key] ?? { x: 50, y: 50 }
    const curPxX = (cur.x / 100) * rect.width
    const curPxY = (cur.y / 100) * rect.height
    draggingRestraint.current = {
      key,
      offsetX: e.clientX - rect.left - curPxX,
      offsetY: e.clientY - rect.top  - curPxY,
    }
    isDraggingSM.current = true
    const onMove = (me: MouseEvent) => {
      const r = imageContainerRef.current?.getBoundingClientRect()
      if (!r || !draggingRestraint.current) return
      const x = Math.min(100, Math.max(0, ((me.clientX - r.left - draggingRestraint.current.offsetX) / r.width)  * 100))
      const y = Math.min(100, Math.max(0, ((me.clientY - r.top  - draggingRestraint.current.offsetY) / r.height) * 100))
      setRestraintDragPos(prev => ({ ...prev, [key]: { x, y } }))
    }
    const onUp = () => {
      isDraggingSM.current = false
      draggingRestraint.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [restraintDragPos, restraintPos])

  // 수갑/족갑 포인트 드래그 (left/right/mid)
  const startCuffDrag = useCallback((
    type: 'hand' | 'leg', id: string, field: 'left' | 'right' | 'mid', cur: { x: number; y: number }, e: React.MouseEvent
  ) => {
    e.stopPropagation()
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const ox = e.clientX - rect.left - (cur.x / 100) * rect.width
    const oy = e.clientY - rect.top  - (cur.y / 100) * rect.height
    isDraggingSM.current = true
    const onMove = (me: MouseEvent) => {
      const r = imageContainerRef.current?.getBoundingClientRect()
      if (!r) return
      updateCuff(type, id, { [field]: {
        x: Math.min(100, Math.max(0, ((me.clientX - r.left - ox) / r.width)  * 100)),
        y: Math.min(100, Math.max(0, ((me.clientY - r.top  - oy) / r.height) * 100)),
      }})
    }
    const onUp = () => { isDraggingSM.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // 수갑/족갑 고리 크기 조절
  const startCuffResize = useCallback((
    type: 'hand' | 'leg', id: string, field: 'leftSize' | 'rightSize', curSize: number, e: React.MouseEvent
  ) => {
    e.stopPropagation()
    const startX = e.clientX
    const onMove = (me: MouseEvent) => updateCuff(type, id, { [field]: Math.max(24, Math.min(180, curSize + me.clientX - startX)) })
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // 수갑/족갑 고리 회전 — 마우스와 고리 중심 각도로 계산
  const startCuffRotate = useCallback((
    type: 'hand' | 'leg', id: string, field: 'leftRotate' | 'rightRotate',
    centerX: number, centerY: number, curRotate: number, e: React.MouseEvent
  ) => {
    e.stopPropagation()
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    // 드래그 시작 시 마우스와 중심 사이 각도
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI
    const onMove = (me: MouseEvent) => {
      const angle = Math.atan2(me.clientY - centerY, me.clientX - centerX) * 180 / Math.PI
      updateCuff(type, id, { [field]: curRotate + (angle - startAngle) })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // 안대 드래그
  const startBlindfoldDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cur = restraintDragPos['blindfold'] ?? restraintPos['blindfold'] ?? { x: 50, y: 20 }
    const ox = e.clientX - rect.left - (cur.x/100)*rect.width
    const oy = e.clientY - rect.top  - (cur.y/100)*rect.height
    isDraggingSM.current = true
    const onMove = (me: MouseEvent) => {
      const r = imageContainerRef.current?.getBoundingClientRect(); if (!r) return
      setRestraintDragPos(prev => ({ ...prev, blindfold: {
        x: Math.min(100,Math.max(0,((me.clientX-r.left-ox)/r.width)*100)),
        y: Math.min(100,Math.max(0,((me.clientY-r.top-oy)/r.height)*100)),
      }}))
    }
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [restraintDragPos, restraintPos])

  const startBlindfoldResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); isDraggingSM.current = true
    const sx = e.clientX, cur = blindfoldSize
    const onMove = (me: MouseEvent) => setBlindfoldSize(Math.max(0.3, Math.min(3, cur + (me.clientX-sx)*0.008)))
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [blindfoldSize])

  const startBlindfoldRotate = useCallback((cx: number, cy: number, e: React.MouseEvent) => {
    isDraggingSM.current = true
    const sa = Math.atan2(e.clientY-cy, e.clientX-cx)*180/Math.PI, cur = blindfoldRotate
    const onMove = (me: MouseEvent) => setBlindfoldRotate(cur + Math.atan2(me.clientY-cy, me.clientX-cx)*180/Math.PI - sa)
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [blindfoldRotate])

  // 개목걸이 핸들러
  const startCollarDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = imageContainerRef.current?.getBoundingClientRect(); if (!rect) return
    const ox = e.clientX - rect.left - (collarState.x/100)*rect.width
    const oy = e.clientY - rect.top  - (collarState.y/100)*rect.height
    isDraggingSM.current = true
    const onMove = (me: MouseEvent) => {
      const r = imageContainerRef.current?.getBoundingClientRect(); if (!r) return
      setCollarState(p => ({ ...p,
        x: Math.min(100,Math.max(0,((me.clientX-r.left-ox)/r.width)*100)),
        y: Math.min(100,Math.max(0,((me.clientY-r.top-oy)/r.height)*100)),
      }))
    }
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [collarState])

  const startCollarResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); isDraggingSM.current = true
    const sx = e.clientX, cur = collarState.size
    const onMove = (me: MouseEvent) => setCollarState(p => ({ ...p, size: Math.max(0.3, Math.min(3, cur + (me.clientX-sx)*0.008)) }))
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [collarState.size])

  const startCollarRotate = useCallback((cx: number, cy: number, e: React.MouseEvent) => {
    isDraggingSM.current = true
    const sa = Math.atan2(e.clientY-cy, e.clientX-cx)*180/Math.PI, cur = collarState.rotate
    const onMove = (me: MouseEvent) => setCollarState(p => ({ ...p, rotate: cur + Math.atan2(me.clientY-cy, me.clientX-cx)*180/Math.PI - sa }))
    const onUp = () => { isDraggingSM.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [collarState.rotate])

  return (
    <div style={{
      background: '#0d0d1a', overflow: 'hidden', userSelect: 'none',
      position: 'fixed', top: 0, left: 0,
      width: window.innerWidth, height: window.innerHeight,
      zoom: 0.5,
      fontSize: 24,
    }}>

      {/* 상단 게이지 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,13,26,0.95)', borderBottom: '1px solid #ffffff11',
        padding: '8px 16px 4px', display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <ArousalGauge value={femaleArousal} max={500} label="💗 흥분도" color="#e94560" flash={femaleFlash} />
        <ArousalGauge value={maleArousal}   label="💙 남캐"   color="#4a90e2" flash={maleFlash} />
        <div style={{ color: '#ffffff44', fontSize: 11, letterSpacing: 2, textAlign: 'center' }}>
          {displayMode === 'photo_aroused' ? '전희' : displayMode === 'sprite_aroused' ? '흥분' : displayMode === 'sprite_climax' ? '절정 진입' : '절정 ✨'}
        </div>
      </div>

      {/* 콘텐츠 영역: 이미지 + 패널 가로 배치 (top은 게이지바 실제높이 기준) */}
      <div style={{ position: 'absolute', top: 100, bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'row' }}>

        {/* 이미지 + 핫스팟 */}
        <div ref={imageContainerRef} style={{ position: 'relative', height: '100%', flexShrink: 0 }}>
          {failEnding ? (
            <img src={imgSrc} style={{ height: '100%', width: 'auto', display: 'block', borderRadius: 8 }} alt="" draggable={false} />
          ) : showSprite ? (
            <SpriteAnimation urls={currentSpriteUrls} fps={4} style={{ height: '100%', width: 'auto', display: 'block', borderRadius: 8 }} />
          ) : (
            <img src={imgSrc} style={{ height: '100%', width: 'auto', display: 'block', borderRadius: 8 }} alt="" draggable={false} />
          )}

          {/* 실패 종료 텍스트 오버레이 */}
          {failEnding && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 8,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 20px 36px',
              animation: 'fadeInFail 0.6s ease',
              pointerEvents: 'auto',
            }}>
              <div style={{ fontSize: 36, color: '#e94560', fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 }}>
                실망이야...
              </div>
              <div style={{ fontSize: 24, color: '#ffffff99', marginBottom: 20 }}>
                {femaleChar.nickname ?? '그녀'}가 자리를 떠났다
              </div>
              <button
                onClick={() => onEnd('fail')}
                style={{
                  padding: '10px 28px', fontSize: 16, fontWeight: 'bold',
                  background: '#e94560', color: '#fff', border: 'none', borderRadius: 8,
                  cursor: 'pointer', letterSpacing: 1,
                }}
              >
                나가기
              </button>
            </div>
          )}

          {/* failEnding 중엔 모든 오버레이 숨김 */}
          {!failEnding && <>{/* 수갑 쌍들 */}
          {handcuffs.map(c => (
            <React.Fragment key={c.id}>
              <ChainLinks ax={c.left.x} ay={c.left.y} mx={c.mid.x} my={c.mid.y} bx={c.right.x} by={c.right.y}
                w={imgDims.w} h={imgDims.h} color="#bbbbbb"
                leftSize={c.leftSize} rightSize={c.rightSize}
                onMidDrag={(e) => startCuffDrag('hand', c.id, 'mid', c.mid, e)} />
              <LeatherCuffRing x={c.left.x}  y={c.left.y}  size={c.leftSize}  color="#aaaaaa" label="왼손"  rotate={c.leftRotate}
                onDrag={(e) => startCuffDrag('hand', c.id, 'left', c.left, e)}
                onResize={(e) => startCuffResize('hand', c.id, 'leftSize', c.leftSize, e)}
                onRotate={(cx, cy, e) => startCuffRotate('hand', c.id, 'leftRotate', cx, cy, c.leftRotate, e)} />
              <LeatherCuffRing x={c.right.x} y={c.right.y} size={c.rightSize} color="#aaaaaa" label="오른손" rotate={c.rightRotate}
                onDrag={(e) => startCuffDrag('hand', c.id, 'right', c.right, e)}
                onResize={(e) => startCuffResize('hand', c.id, 'rightSize', c.rightSize, e)}
                onRotate={(cx, cy, e) => startCuffRotate('hand', c.id, 'rightRotate', cx, cy, c.rightRotate, e)} />
            </React.Fragment>
          ))}
          {/* 족갑 쌍들 */}
          {legcuffs.map(c => (
            <React.Fragment key={c.id}>
              <ChainLinks ax={c.left.x} ay={c.left.y} mx={c.mid.x} my={c.mid.y} bx={c.right.x} by={c.right.y}
                w={imgDims.w} h={imgDims.h} color="#c9a84c"
                leftSize={c.leftSize} rightSize={c.rightSize}
                onMidDrag={(e) => startCuffDrag('leg', c.id, 'mid', c.mid, e)} />
              <LeatherCuffRing x={c.left.x}  y={c.left.y}  size={c.leftSize}  color="#c9a84c" label="왼발"  rotate={c.leftRotate}
                onDrag={(e) => startCuffDrag('leg', c.id, 'left', c.left, e)}
                onResize={(e) => startCuffResize('leg', c.id, 'leftSize', c.leftSize, e)}
                onRotate={(cx, cy, e) => startCuffRotate('leg', c.id, 'leftRotate', cx, cy, c.leftRotate, e)} />
              <LeatherCuffRing x={c.right.x} y={c.right.y} size={c.rightSize} color="#c9a84c" label="오른발" rotate={c.rightRotate}
                onDrag={(e) => startCuffDrag('leg', c.id, 'right', c.right, e)}
                onResize={(e) => startCuffResize('leg', c.id, 'rightSize', c.rightSize, e)}
                onRotate={(cx, cy, e) => startCuffRotate('leg', c.id, 'rightRotate', cx, cy, c.rightRotate, e)} />
            </React.Fragment>
          ))}

          {/* 안대 */}
          {restraints.has('blindfold') && (() => {
            const pos = restraintDragPos['blindfold'] ?? restraintPos['blindfold'] ?? { x: 50, y: 22 }
            return <BlindfoldOverlay pos={pos} size={blindfoldSize} rotate={blindfoldRotate}
              onDrag={startBlindfoldDrag} onResize={startBlindfoldResize} onRotate={startBlindfoldRotate} />
          })()}
          {/* 개목걸이 */}
          {restraints.has('collar') && (
            <CollarOverlay x={collarState.x} y={collarState.y} rotate={collarState.rotate} size={collarState.size}
              onDrag={startCollarDrag} onResize={startCollarResize} onRotate={startCollarRotate} />
          )}

          {/* 도구 액션 오버레이 — 클릭 시 700ms 동안 해당 신체 부위에 표시 */}
          {toolAnim && (
            <div style={{
              position: 'absolute',
              left: `${toolAnim.cx}%`,
              top: `${toolAnim.cy}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 50,
              filter: 'drop-shadow(0 0 12px #ffffffaa)',
              animation: 'toolFadeOut 0.7s ease forwards',
            }}>
              <ToolSvg toolKey={activeTool} pressed={true} size={192} />
            </div>
          )}

          {/* 포인트 팝업 — 행위 결과 숫자 */}
          {pointPopup && (
            <div key={pointPopup.id} style={{
              position: 'absolute',
              left: `${pointPopup.cx}%`,
              top: `${pointPopup.cy - 8}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none', zIndex: 55,
              fontSize: 44, fontWeight: 'bold',
              color: pointPopup.value >= 0 ? '#66FF99' : '#FF4466',
              textShadow: pointPopup.value >= 0
                ? '0 0 14px #00ff66, 0 2px 4px #000'
                : '0 0 14px #ff0044, 0 2px 4px #000',
              animation: 'pointFloat 1.2s ease forwards',
            }}>
              {pointPopup.value >= 0 ? `+${pointPopup.value}` : `${pointPopup.value}`}
            </div>
          )}

          {/* 핫스팟 오버레이 — zIndex:10 (수갑/족갑 아래) */}
          {(
            <svg
              key={currentPoseKey}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
            >
              {hotspots.map((zone, i) => {
                const isHovered = hoveredZone === `${zone.key}-${i}`
                return (
                  <g key={i} transform={`rotate(${zone.rotation ?? 0}, ${zone.cx}, ${zone.cy})`}>
                    <ellipse
                      cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry}
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
            const hearts = sensitivity <= 0 ? '✕'.repeat(Math.max(1, Math.abs(sensitivity))) : '♥'.repeat(sensitivity)
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


          {/* 절정 오버레이 */}
          {showClimax && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(233,69,96,0.15)', borderRadius: 8,
            }}>
              <div style={{ fontSize: 40, textAlign: 'center', textShadow: '0 0 30px #e94560' }}>✨</div>
            </div>
          )}

          {/* 멀티 오르가즘 플래시 */}
          {orgasmFlash && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 8, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,180,200,0.35)',
              animation: 'none',
            }}>
              <div style={{ fontSize: 36, textShadow: '0 0 20px #fff' }}>💦</div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, textShadow: '0 0 10px #e94560', marginTop: 6 }}>
                {orgasmCount === 1 ? '1차 오르가즘!' : orgasmCount === 2 ? '2차 오르가즘!' : '3차 오르가즘!'}
              </div>
            </div>
          )}
          </>}
        </div>

      {/* 사이드 패널: 이미지 바로 오른쪽에 flex child로 배치 */}
        <div style={{
          flexShrink: 0, width: 340, height: '100%',
          background: 'rgba(10,10,22,0.97)', borderLeft: '1px solid #ffffff18',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          position: 'relative',
        }}>
          {/* failEnding 시 사이드 패널 전체 비활성화 오버레이 */}
          {failEnding && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.55)',
              pointerEvents: 'all',
            }} />
          )}
          {/* 전체 목록 — 섹터 헤더 + 도구 펼쳐서 표시 (overflowY 없음) */}
          <div ref={panelScrollRef} id="tool-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* 빈 헤더 버퍼: 게이지바 겹침으로 신체 잘릴 경우 대비 */}
            <div style={{ padding: '7px 20px', borderBottom: '1px solid #ffffff18', flexShrink: 0, height: 42 }} />
            {SECTORS.map(sec => {
              const tools = TOOL_DEFS.filter(t => t.sector === sec.key)
              const isSectorActive = sector === sec.key
              return (
                <div key={sec.key}>
                  {/* 섹터 헤더 */}
                  <div
                    className="panel-header"
                    onClick={() => setSector(sec.key)}
                    style={{
                      padding: '7px 20px',
                      background: isSectorActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                      borderLeft: isSectorActive ? '5px solid #c9a84c' : '5px solid #ffffff11',
                      borderBottom: '1px solid #ffffff18',
                      color: isSectorActive ? '#c9a84c' : '#ffffff66',
                      fontSize: 28, fontWeight: 'bold', letterSpacing: 2, cursor: 'default',
                    }}
                  >
                    {sec.label}
                  </div>

                  {/* 도구 목록 */}
                  {tools.map(t => {
                    const isActive = activeTool === t.key
                    return (
                      <button
                        key={t.key}
                        tabIndex={-1}
                        className="panel-tool"
                        onClick={() => { setSector(sec.key); setActiveTool(t.key) }}
                        style={{
                          width: '100%', border: 'none', cursor: 'pointer',
                          background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
                          borderLeft: isActive ? '5px solid #c9a84c' : '5px solid transparent',
                          borderBottom: '1px solid #ffffff08',
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14,
                          padding: '5px 12px 5px 20px',
                          transition: 'all 0.12s',
                        }}
                      >
                        <ToolSvg toolKey={t.key} pressed={false} size={66} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                          <span className="panel-tool-label" style={{ fontSize: 34, color: isActive ? '#c9a84c' : '#ffffffcc', fontWeight: isActive ? 'bold' : 'normal' }}>
                            {t.label}
                          </span>
                          <span className="panel-tool-mult" style={{ fontSize: 24, color: '#ffffff44' }}>
                            ×{t.key === 'whip' ? getWhipMult().toFixed(2) : (Object.values(TOOL_ZONE_MATRIX[t.key]).filter(v => v && v > 0)[0] ?? 1).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    )
                  })}

                  {/* SM 구속 토글 */}
                  {sec.key === 'sm' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 16px' }}>
                      {/* 수갑 (최대 2쌍) */}
                      {(() => {
                        const cnt = handcuffs.length
                        const on = cnt > 0
                        return (
                          <button tabIndex={-1} onClick={toggleHandcuffs} className="panel-sm-btn"
                            style={{ background: on ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${on ? '#e94560' : '#ffffff22'}`,
                              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                              color: on ? '#e94560' : '#ffffff55', fontSize: 26,
                              boxShadow: on ? '0 0 8px #e9456066' : 'none' }}>
                            수갑{cnt > 0 ? ` ×${cnt}` : ''}
                          </button>
                        )
                      })()}
                      {/* 족갑 (최대 2개, +/- 버튼) */}
                      {(() => {
                        const cnt = legcuffs.length
                        const on = cnt > 0
                        const btnBase: React.CSSProperties = {
                          border: `1px solid ${on ? '#e94560' : '#ffffff22'}`,
                          cursor: 'pointer', fontSize: 22, fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: on ? '0 0 8px #e9456066' : 'none',
                        }
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ color: on ? '#e94560' : '#ffffff55', fontSize: 26, padding: '0 4px' }}>
                              족갑{cnt > 0 ? ` ×${cnt}` : ''}
                            </div>
                            <button tabIndex={-1}
                              onClick={() => setLegcuffs(p => p.length < 2 ? [...p, newCuffPair(75)] : p)}
                              style={{ ...btnBase, background: cnt < 2 ? 'rgba(233,69,96,0.15)' : 'rgba(255,255,255,0.03)',
                                color: cnt < 2 ? '#e94560' : '#ffffff33',
                                borderRadius: '6px 0 0 6px', width: 32, height: 36,
                                borderRight: 'none', opacity: cnt >= 2 ? 0.4 : 1 }}>+</button>
                            <button tabIndex={-1}
                              onClick={() => setLegcuffs(p => { const next = p.slice(0,-1); if(next.length===0) lastLegcuffs.current=p; return next })}
                              style={{ ...btnBase, background: cnt > 0 ? 'rgba(233,69,96,0.15)' : 'rgba(255,255,255,0.03)',
                                color: cnt > 0 ? '#e94560' : '#ffffff33',
                                borderRadius: '0 6px 6px 0', width: 32, height: 36,
                                opacity: cnt === 0 ? 0.4 : 1 }}>−</button>
                          </div>
                        )
                      })()}
                      {/* 안대 / 개목걸이 (기존 단일 토글) */}
                      {RESTRAINT_DEFS.filter(r => r.key !== 'handcuff' && r.key !== 'legcuff').map(r => {
                        const on = restraints.has(r.key)
                        return (
                          <button key={r.key} tabIndex={-1} onClick={() => toggleRestraint(r.key)} className="panel-sm-btn"
                            style={{ background: on ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${on ? '#e94560' : '#ffffff22'}`,
                              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                              color: on ? '#e94560' : '#ffffff55', fontSize: 26,
                              boxShadow: on ? '0 0 8px #e9456066' : 'none' }}>
                            {r.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 테크닉 섹션 */}
          <div>
            <div className="panel-tech-header" style={{
              padding: '7px 20px', background: 'rgba(255,255,255,0.03)',
              borderLeft: '5px solid #ffffff11', borderBottom: '1px solid #ffffff18',
              color: '#ffffff66', fontSize: 28, fontWeight: 'bold', letterSpacing: 2,
            }}>테크닉</div>
            <button
              tabIndex={-1}
              disabled={maleArousal <= 0}
              onClick={() => setShowPoseSelect(true)}
              className="panel-tech-btn"
              style={{
                width: '100%', padding: '10px 0', borderRadius: 0, cursor: maleArousal > 0 ? 'pointer' : 'not-allowed',
                background: maleArousal > 0 ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                border: 'none', borderBottom: '1px solid #ffffff18',
                color: maleArousal > 0 ? '#c9a84c' : '#ffffff33', fontSize: 28, fontWeight: 'bold',
              }}
            >
              체위 변경
            </button>
          </div>

          {/* 포기 — 항상 하단 고정 */}
          <button
            tabIndex={-1}
            onClick={() => triggerFail()}
            style={{
              width: '100%', border: 'none',
              borderTop: '1px solid #ffffff18', padding: '18px',
              background: 'transparent', color: '#ffffff44', fontSize: 32, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            포기
          </button>
        </div>

        {/* 대화창 */}
        <div style={{
          flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
          background: 'rgba(8,8,18,0.98)', borderLeft: '1px solid #ffffff18',
        }}>
          {/* 헤더 위 여백 (게이지바 높이 맞춤) */}
          <div style={{ height: 42, flexShrink: 0, borderBottom: '1px solid #ffffff18' }} />

          {/* 헤더 */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid #ffffff18', flexShrink: 0,
            fontSize: 26, fontWeight: 'bold', color: '#c9a84c', letterSpacing: 2,
          }}>
            💬 {femaleChar.nickname ?? ''}
          </div>

          {/* 메시지 로그 */}
          <div
            ref={chatLogRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '14px 18px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            {chatLog.length === 0 && (
              <div style={{ color: '#ffffff22', fontSize: 22, textAlign: 'center', marginTop: 40 }}>
                신체 부위를 자극해보세요
              </div>
            )}
            {chatLog.map(msg => (
              <div key={msg.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: 12,
                  borderLeft: `3px solid ${msg.color}`,
                  padding: '10px 16px',
                  fontSize: 28, fontWeight: msg.color === '#e94560' ? 'bold' : 'normal',
                  color: msg.color,
                  lineHeight: 1.4, maxWidth: '100%',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>{/* flex row 닫기 */}


      {/* 체위 선택 모달 */}
      {showPoseSelect && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{ fontSize: 32, color: '#c9a84c', fontWeight: 'bold', marginBottom: 8 }}>체위 변경</div>
          <div style={{ fontSize: 24, color: '#ffffff66', marginBottom: 28 }}>
            남캐 흥분도 −30% · 여캐 흥분도 −50%
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { key: 'missionary', label: '정상위'   },
              { key: 'doggy',      label: '후배위'   },
              { key: 'cowgirl',    label: '여성상위' },
              { key: 'side',       label: '버터플라이' },
            ].map(p => {
              const isCurrent = p.key === currentPoseKey
              return (
                <button key={p.key} tabIndex={-1}
                  onClick={() => {
                    if (isCurrent) return
                    setCurrentPoseKey(p.key)
                    setHoveredZone(null)
                    setMaleArousal(prev => Math.max(0, Math.round(prev * 0.7)))
                    setFemaleArousal(prev => Math.max(0, Math.round(prev * 0.5)))
                    toolUseCount.current = {}
                    setShowPoseSelect(false)
                    addChat(`체위를 바꿨어... (${p.label}) 처음부터 다시 달궈줘`, '#c9a84c')
                  }}
                  style={{
                    width: 140, height: 100, borderRadius: 12, cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCurrent ? '#c9a84c' : '#ffffff22'}`,
                    color: isCurrent ? '#c9a84c' : '#ffffff99',
                    fontSize: 30, fontWeight: 'bold',
                    opacity: isCurrent ? 0.5 : 1,
                  }}
                >
                  {p.label}
                  {isCurrent && <div style={{ fontSize: 18, color: '#c9a84c88' }}>현재</div>}
                </button>
              )
            })}
          </div>
          <button tabIndex={-1} onClick={() => setShowPoseSelect(false)}
            style={{
              marginTop: 28, padding: '10px 36px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: '1px solid #ffffff33',
              color: '#ffffff55', fontSize: 24,
            }}
          >취소</button>
        </div>
      )}

      <style>{`
        /* 도구 패널 반응형 — 화면 높이에 따라 폰트·패딩 축소 */
        @media (max-height: 800px) {
          #tool-panel .panel-header     { font-size: 22px !important; padding: 5px 16px !important; }
          #tool-panel .panel-tool       { padding: 7px 14px !important; }
          #tool-panel .panel-tool-label { font-size: 22px !important; }
          #tool-panel .panel-tool-mult  { font-size: 18px !important; }
          #tool-panel .panel-sm-btn     { font-size: 20px !important; padding: 4px 10px !important; }
          .panel-tech-header            { font-size: 22px !important; padding: 5px 16px !important; }
          .panel-tech-btn               { font-size: 22px !important; }
        }
        @media (max-height: 640px) {
          #tool-panel .panel-header     { font-size: 17px !important; padding: 3px 12px !important; }
          #tool-panel .panel-tool       { padding: 4px 12px !important; }
          #tool-panel .panel-tool-label { font-size: 17px !important; }
          #tool-panel .panel-tool-mult  { font-size: 14px !important; }
          #tool-panel .panel-sm-btn     { font-size: 16px !important; padding: 3px 8px !important; }
          .panel-tech-header            { font-size: 17px !important; padding: 3px 12px !important; }
          .panel-tech-btn               { font-size: 17px !important; }
        }
        @keyframes fadeInFail {
          from { opacity: 0; transform: scale(1.03); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          0%   { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -80%); }
        }
        @keyframes sx-thrust {
          from { transform: translateY(0px); }
          to   { transform: translateY(-6px); }
        }
        @keyframes sx-tongue {
          from { transform: scaleX(1) scaleY(1); }
          to   { transform: scaleX(0.85) scaleY(1.12); }
        }
        @keyframes sx-fingers {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-18deg); }
        }
        @keyframes sx-vibrate {
          from { transform: translateX(-3px); }
          to   { transform: translateX(3px); }
        }
        @keyframes sx-drip {
          from { transform: translateY(0px) scale(1); opacity: 0.5; }
          to   { transform: translateY(10px) scale(0.7); opacity: 0; }
        }
        @keyframes sx-whip {
          from { transform: rotate(0deg); }
          to   { transform: rotate(30deg); }
        }
        @keyframes toolFadeOut {
          0%   { opacity: 1;   transform: translate(-50%, -50%) scale(1.1); }
          60%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0;   transform: translate(-50%, -60%) scale(0.8); }
        }
        @keyframes pointFloat {
          0%   { opacity: 1;   transform: translate(-50%, -100%) scale(1.1); }
          60%  { opacity: 1;   transform: translate(-50%, -130%) scale(1.0); }
          100% { opacity: 0;   transform: translate(-50%, -160%) scale(0.85); }
        }
      `}</style>
    </div>
  )
}
