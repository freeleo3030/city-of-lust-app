import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import LocationPage from './LocationPage'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'

// ── SVG 아바타 캐릭터 ──────────────────────────────────────
function SVGAvatar({ moving, facing }: { moving: boolean; facing: 'left' | 'right' }) {
  const dur = '0.42s'
  const play = moving ? 'running' : 'paused'
  const glow = moving
    ? 'drop-shadow(0 0 10px #e94560) drop-shadow(0 0 22px #e9456055)'
    : 'drop-shadow(0 0 6px #c9a84cbb)'

  return (
    <svg
      width="52" height="90" viewBox="0 0 52 90"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined, filter: glow, overflow: 'visible' }}
    >
      {/* 발 그림자 */}
      <ellipse cx="26" cy="86" rx="18" ry="5" fill="#c9a84c" opacity={moving ? 0.45 : 0.18} />

      {/* 오른쪽 다리 (뒤) */}
      <g style={{ transformOrigin: '31px 56px', animation: `legR ${dur} ease-in-out infinite`, animationPlayState: play }}>
        <rect x="26" y="56" width="11" height="24" rx="5.5" fill="#1a103a" />
        <ellipse cx="31" cy="81" rx="9" ry="5" fill="#b89040" />
      </g>

      {/* 왼쪽 다리 (앞) */}
      <g style={{ transformOrigin: '21px 56px', animation: `legL ${dur} ease-in-out infinite`, animationPlayState: play }}>
        <rect x="15" y="56" width="11" height="24" rx="5.5" fill="#2a1a5e" />
        <ellipse cx="21" cy="81" rx="9" ry="5" fill="#c9a84c" />
      </g>

      {/* 몸통 + 팔 그룹 (bob) */}
      <g style={{ animation: `bodyBob ${dur} ease-in-out infinite`, animationPlayState: play }}>

        {/* 오른팔 (뒤) */}
        <g style={{ transformOrigin: '37px 36px', animation: `armR ${dur} ease-in-out infinite`, animationPlayState: play }}>
          <rect x="37" y="34" width="10" height="22" rx="5" fill="#a87838" />
          <circle cx="42" cy="57" r="5" fill="#a87838" />
        </g>

        {/* 몸통 */}
        <rect x="14" y="28" width="24" height="30" rx="8" fill="#e94560" />
        {/* 칼라 V라인 */}
        <path d="M21,28 L26,36 L31,28" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinejoin="round" />
        {/* 벨트 */}
        <rect x="14" y="54" width="24" height="5" rx="2.5" fill="#c9a84c" opacity="0.85" />
        {/* 버클 */}
        <rect x="23" y="54.5" width="6" height="4" rx="1.5" fill="#ffe082" />

        {/* 왼팔 (앞) */}
        <g style={{ transformOrigin: '15px 36px', animation: `armL ${dur} ease-in-out infinite`, animationPlayState: play }}>
          <rect x="5" y="34" width="10" height="22" rx="5" fill="#c9a84c" />
          <circle cx="10" cy="57" r="5" fill="#c9a84c" />
        </g>
      </g>

      {/* 머리 (bob) */}
      <g style={{ animation: `bodyBob ${dur} ease-in-out infinite`, animationPlayState: play }}>
        {/* 목 */}
        <rect x="22" y="24" width="8" height="7" rx="4" fill="#c9a84c" />
        {/* 얼굴 */}
        <circle cx="26" cy="14" r="13" fill="#c9a84c" />
        {/* 머리카락 */}
        <path d="M13,13 Q14,1 26,1 Q38,1 39,13 Q35,6 26,6.5 Q17,6 13,13Z" fill="#1a1a2e" />
        {/* 눈 */}
        <circle cx="21" cy="14" r="2.8" fill="#1a1a2e" />
        <circle cx="31" cy="14" r="2.8" fill="#1a1a2e" />
        {/* 눈 하이라이트 */}
        <circle cx="22" cy="13" r="1.1" fill="white" />
        <circle cx="32" cy="13" r="1.1" fill="white" />
        {/* 입 */}
        <path d="M21,19 Q26,23 31,19" stroke="#1a1a2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// ── BFS 경로 탐색 ──────────────────────────────────────────
function bfs(startId: string, goalId: string): string[] {
  if (startId === goalId) return [startId]
  const adj: Record<string, string[]> = {}
  for (const [a, b] of ROAD_EDGES) {
    ;(adj[a] ??= []).push(b)
    ;(adj[b] ??= []).push(a)
  }
  const visited = new Set([startId])
  const queue: string[][] = [[startId]]
  while (queue.length) {
    const path = queue.shift()!
    const cur = path[path.length - 1]
    for (const next of adj[cur] ?? []) {
      if (next === goalId) return [...path, next]
      if (!visited.has(next)) { visited.add(next); queue.push([...path, next]) }
    }
  }
  return [startId]
}

// 클릭 위치(%) 에서 가장 가까운 노드 찾기
function nearestNode(px: number, py: number): string {
  let best = ROAD_NODES[0].id
  let bestD = Infinity
  for (const n of ROAD_NODES) {
    const d = (n.x - px) ** 2 + (n.y - py) ** 2
    if (d < bestD) { bestD = d; best = n.id }
  }
  return best
}

// 도로 교차점 노드 (아바타 이동 경로용)
const ROAD_NODES = [
  // 수평 도로 y좌표: 11, 25, 42, 58, 75, 90
  // 수직 도로 x좌표: 8, 22, 38, 50, 65, 80, 88
  { id: 'n00', x:  8, y: 11 }, { id: 'n10', x: 22, y: 11 }, { id: 'n20', x: 38, y: 11 },
  { id: 'n30', x: 50, y: 11 }, { id: 'n40', x: 65, y: 11 }, { id: 'n50', x: 80, y: 11 },
  { id: 'n01', x:  8, y: 25 }, { id: 'n11', x: 22, y: 25 }, { id: 'n21', x: 38, y: 25 },
  { id: 'n31', x: 50, y: 25 }, { id: 'n41', x: 65, y: 25 }, { id: 'n51', x: 80, y: 25 }, { id: 'n61', x: 88, y: 25 },
  { id: 'n02', x:  8, y: 42 }, { id: 'n12', x: 22, y: 42 }, { id: 'n22', x: 38, y: 42 },
  { id: 'n32', x: 50, y: 42 }, { id: 'n42', x: 65, y: 42 }, { id: 'n52', x: 80, y: 42 }, { id: 'n62', x: 88, y: 42 },
  { id: 'n03', x:  8, y: 58 }, { id: 'n13', x: 22, y: 58 }, { id: 'n23', x: 38, y: 58 },
  { id: 'n33', x: 50, y: 58 }, { id: 'n43', x: 65, y: 58 }, { id: 'n53', x: 80, y: 58 }, { id: 'n63', x: 88, y: 58 },
  { id: 'n04', x:  8, y: 75 }, { id: 'n14', x: 22, y: 75 }, { id: 'n24', x: 38, y: 75 },
  { id: 'n34', x: 50, y: 75 }, { id: 'n44', x: 65, y: 75 }, { id: 'n54', x: 80, y: 75 }, { id: 'n64', x: 88, y: 75 },
  { id: 'n05', x:  8, y: 90 }, { id: 'n15', x: 22, y: 90 }, { id: 'n25', x: 38, y: 90 },
  { id: 'n35', x: 50, y: 90 }, { id: 'n45', x: 65, y: 90 }, { id: 'n55', x: 80, y: 90 }, { id: 'n65', x: 88, y: 90 },
]

// 도로 세그먼트 (노드 연결)
const ROAD_EDGES: [string, string][] = [
  // 수평 도로 (y=11)
  ['n00','n10'],['n10','n20'],['n20','n30'],['n30','n40'],['n40','n50'],
  // 수평 도로 (y=25)
  ['n01','n11'],['n11','n21'],['n21','n31'],['n31','n41'],['n41','n51'],['n51','n61'],
  // 수평 도로 (y=42)
  ['n02','n12'],['n12','n22'],['n22','n32'],['n32','n42'],['n42','n52'],['n52','n62'],
  // 수평 도로 (y=58)
  ['n03','n13'],['n13','n23'],['n23','n33'],['n33','n43'],['n43','n53'],['n53','n63'],
  // 수평 도로 (y=75)
  ['n04','n14'],['n14','n24'],['n24','n34'],['n34','n44'],['n44','n54'],['n54','n64'],
  // 수평 도로 (y=90)
  ['n05','n15'],['n15','n25'],['n25','n35'],['n35','n45'],['n45','n55'],['n55','n65'],
  // 수직 도로 (x=8)
  ['n00','n01'],['n01','n02'],['n02','n03'],['n03','n04'],['n04','n05'],
  // 수직 도로 (x=22)
  ['n10','n11'],['n11','n12'],['n12','n13'],['n13','n14'],['n14','n15'],
  // 수직 도로 (x=38)
  ['n20','n21'],['n21','n22'],['n22','n23'],['n23','n24'],['n24','n25'],
  // 수직 도로 (x=50)
  ['n30','n31'],['n31','n32'],['n32','n33'],['n33','n34'],['n34','n35'],
  // 수직 도로 (x=65)
  ['n40','n41'],['n41','n42'],['n42','n43'],['n43','n44'],['n44','n45'],
  // 수직 도로 (x=80)
  ['n50','n51'],['n51','n52'],['n52','n53'],['n53','n54'],['n54','n55'],
  // 수직 도로 (x=88)
  ['n61','n62'],['n62','n63'],['n63','n64'],['n64','n65'],
]

function CityRoads({ width, height }: { width: number; height: number }) {
  const nodeMap = Object.fromEntries(ROAD_NODES.map(n => [n.id, n]))
  const toPixel = (x: number, y: number) => ({
    px: (x / 100) * width,
    py: (y / 100) * height,
  })

  return (
    <svg
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      width={width} height={height}
    >
      <defs>
        {/* 도로 그림자 효과 */}
        <filter id="roadGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 도로 외곽선 (어두운 테두리) */}
      {ROAD_EDGES.map(([aId, bId], i) => {
        const a = nodeMap[aId], b = nodeMap[bId]
        const { px: ax, py: ay } = toPixel(a.x, a.y)
        const { px: bx, py: by } = toPixel(b.x, b.y)
        return <line key={`outline-${i}`} x1={ax} y1={ay} x2={bx} y2={by}
          stroke="#3a3a5a" strokeWidth={16} strokeLinecap="round" opacity={0.9} />
      })}

      {/* 도로 본체 (회색 아스팔트) */}
      {ROAD_EDGES.map(([aId, bId], i) => {
        const a = nodeMap[aId], b = nodeMap[bId]
        const { px: ax, py: ay } = toPixel(a.x, a.y)
        const { px: bx, py: by } = toPixel(b.x, b.y)
        return <line key={`road-${i}`} x1={ax} y1={ay} x2={bx} y2={by}
          stroke="#4a4a6a" strokeWidth={11} strokeLinecap="round" />
      })}

      {/* 도로 중앙선 (골드 점선) */}
      {ROAD_EDGES.map(([aId, bId], i) => {
        const a = nodeMap[aId], b = nodeMap[bId]
        const { px: ax, py: ay } = toPixel(a.x, a.y)
        const { px: bx, py: by } = toPixel(b.x, b.y)
        return <line key={`center-${i}`} x1={ax} y1={ay} x2={bx} y2={by}
          stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round"
          strokeDasharray="6 8" opacity={0.7} />
      })}

      {/* 교차로 원 */}
      {ROAD_NODES.map(n => {
        const { px, py } = toPixel(n.x, n.y)
        return (
          <circle key={n.id} cx={px} cy={py} r={4}
            fill="#2a2a4a" stroke="#c9a84c" strokeWidth={1.5} opacity={0.8} />
        )
      })}
    </svg>
  )
}

// 도로 x: 8,22,38,50,65,80,88 / y: 11,25,42,58,75,90
// 핀 바깥선이 도로 바깥선에 붙는 위치: 도로중심 ± (도로반폭8px + 핀반폭39px) → x±4%, y±8%
const LOCATIONS = [
  // ── 왼쪽 (건전한 구역) ──
  { id:  1, name: '대학교',   emoji: '🎓', x: 12, y: 19, color: '#29B6F6', desc: '젊음과 열정의 캠퍼스' },   // 블록(0,0) 좌상: 8+4, 11+8
  { id:  2, name: '도서관',   emoji: '📚', x: 34, y: 17, color: '#4FC3F7', desc: '조용한 지식의 공간' },     // 블록(1,0) 우하: 38-4, 25-8
  { id:  3, name: '병원',     emoji: '🏥', x: 12, y: 34, color: '#00E676', desc: '청순한 간호사들의 성지' }, // 블록(0,1) 좌하: 8+4, 42-8
  { id:  4, name: '약국',     emoji: '💊', x: 34, y: 33, color: '#69F0AE', desc: '가까운 이웃 약사님' },     // 블록(1,1) 우상: 38-4, 25+8
  { id:  5, name: '공공기관', emoji: '🏛️', x: 12, y: 50, color: '#78909C', desc: '딱딱한 공무원의 세계' }, // 블록(0,2) 좌상: 8+4, 42+8
  { id:  6, name: '경찰서',   emoji: '🚔', x: 34, y: 50, color: '#7C4DFF', desc: '규율과 권위의 공간' },     // 블록(1,2) 우하: 38-4, 58-8
  { id:  7, name: '헬스장',   emoji: '💪', x: 12, y: 67, color: '#FF5722', desc: '몸을 만드는 곳' },         // 블록(0,3) 좌하: 8+4, 75-8

  // ── 가운데 (중립 구역) ──
  { id:  8, name: '카페',     emoji: '☕', x: 42, y: 19, color: '#c9a84c', desc: '가벼운 만남의 장소' },     // 블록(2,0) 좌상: 38+4, 11+8
  { id:  9, name: '쇼핑몰',   emoji: '🛍️', x: 61, y: 17, color: '#E91E63', desc: '패션과 스타일의 천국' }, // 블록(3,0) 우하: 65-4, 25-8
  { id: 10, name: '공원',     emoji: '🌳', x: 42, y: 34, color: '#66BB6A', desc: '자연 속의 달콤한 만남' }, // 블록(2,1) 좌하: 38+4, 42-8
  { id: 11, name: '노래방',   emoji: '🎤', x: 61, y: 50, color: '#FF80AB', desc: '둘만의 달콤한 시간' },     // 블록(3,2) 우상: 65-4, 42+8
  { id: 12, name: '해변',     emoji: '🏖️', x: 42, y: 82, color: '#26C6DA', desc: '뜨거운 태양 아래 만남' }, // 블록(2,4) 좌하: 38+4, 90-8
  { id: 13, name: '비행장',   emoji: '✈️', x: 61, y: 82, color: '#FF9800', desc: '떠나는 자와 오는 자' },   // 블록(3,4) 우하: 65-4, 90-8

  // ── 오른쪽 (유흥 구역) ──
  { id: 14, name: '회사',     emoji: '🏢', x: 69, y: 19, color: '#90A4AE', desc: '커리어 우먼들의 세계' },   // 블록(4,0) 좌상: 65+4, 11+8
  { id: 15, name: '고급레스토랑', emoji: '🍷', x: 84, y: 17, color: '#c9a84c', desc: '특별한 밤을 위한 만찬' }, // 블록(5,0) 우하: 88-4, 25-8
  { id: 16, name: '레스토랑', emoji: '🍽️', x: 76, y: 34, color: '#FF6B9D', desc: '로맨틱한 저녁 식사' },   // 블록(4,1) 우하: 80-4, 42-8
  { id: 17, name: '바',       emoji: '🍸', x: 84, y: 33, color: '#AB47BC', desc: '술 한 잔의 여유' },         // 블록(5,1) 우상: 88-4, 25+8
  { id: 18, name: '클럽',     emoji: '🎵', x: 69, y: 50, color: '#e94560', desc: 'DJ 부스·무대·댄스 플로어가 있는 나이트클럽' }, // 블록(4,2) 좌상: 65+4, 42+8
  { id: 19, name: '성인샵',   emoji: '🔞', x: 84, y: 50, color: '#F06292', desc: '은밀한 욕망을 채우는 곳' }, // 블록(5,2) 우상: 88-4, 42+8
  { id: 20, name: '호텔',     emoji: '🏨', x: 76, y: 67, color: '#FFD700', desc: '은밀한 밤을 위한 공간' }, // 블록(4,3) 우하: 80-4, 75-8
  { id: 21, name: '룸싸롱',   emoji: '🥂', x: 84, y: 66, color: '#F48FB1', desc: '고급스러운 밤의 세계' }, // 블록(5,3) 우상: 88-4, 58+8
  { id: 22, name: '모텔',     emoji: '🛏️', x: 84, y: 82, color: '#EF9A9A', desc: '저렴하고 은밀한 밤' },   // 블록(5,4) 우하: 88-4, 90-8
]

export default function MapPage({ character, onViewCharacter, gold = 500, onCreatorMode, femaleChars = [], onStartDate, onStartSexScene }: { character?: any; onViewCharacter?: () => void; gold?: number; onCreatorMode?: () => void; femaleChars?: FemaleCharacterData[]; onStartDate?: (char: FemaleCharacterData) => void; onStartSexScene?: (char: FemaleCharacterData, pose: string) => void }) {
  const [selected, setSelected] = useState<typeof LOCATIONS[0] | null>(null)
  const [entering, setEntering] = useState<typeof LOCATIONS[0] | null>(null)
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

  // 아바타 상태
  const [avatarNode, setAvatarNode] = useState('n32')          // 현재 있는 교차로
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 42 }) // 현재 화면 위치(%)
  const [moving, setMoving] = useState(false)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const pathRef = useRef<string[]>([])
  const stepRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destPosRef = useRef<{ x: number; y: number } | null>(null)

  // 지도 크기 감지
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setMapSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 한 칸씩 이동
  const stepMove = useCallback(() => {
    const path = pathRef.current
    const idx = stepRef.current
    if (idx >= path.length) {
      // 경로 완료 → 건물 앞으로 최종 이동
      if (destPosRef.current) {
        setAvatarPos(destPosRef.current)
        destPosRef.current = null
      }
      setMoving(false)
      return
    }
    const nodeId = path[idx]
    const node = ROAD_NODES.find(n => n.id === nodeId)!
    setAvatarPos(prev => {
      if (node.x < prev.x) setFacing('left')
      else if (node.x > prev.x) setFacing('right')
      return { x: node.x, y: node.y }
    })
    setAvatarNode(nodeId)
    stepRef.current = idx + 1
    timerRef.current = setTimeout(stepMove, 360)
  }, [])

  // 건물 핀 클릭 → 해당 건물 앞까지 이동
  const handlePinClick = useCallback((e: React.MouseEvent, loc: typeof LOCATIONS[0]) => {
    e.stopPropagation()
    setSelected(prev => prev?.id === loc.id ? null : loc)
    const goal = nearestNode(loc.x, loc.y)
    if (timerRef.current) clearTimeout(timerRef.current)
    const path = bfs(avatarNode, goal)
    pathRef.current = path
    stepRef.current = 0
    destPosRef.current = { x: loc.x, y: loc.y }
    setMoving(true)
    stepMove()
  }, [avatarNode, stepMove])

  // 지도 빈 공간 클릭 → 가장 가까운 교차로로 이동
  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const pxPct = ((e.clientX - rect.left) / rect.width) * 100
    const pyPct = ((e.clientY - rect.top) / rect.height) * 100
    const goal = nearestNode(pxPct, pyPct)
    if (goal === avatarNode) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const path = bfs(avatarNode, goal)
    pathRef.current = path
    stepRef.current = 0
    destPosRef.current = null
    setMoving(true)
    stepMove()
  }, [avatarNode, stepMove])

  // 언마운트 시 타이머 정리
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (entering) return <LocationPage location={entering} femaleChars={femaleChars} onBack={() => setEntering(null)} onStartDate={onStartDate} onStartSexScene={onStartSexScene} />

  return (
    <div style={styles.container}>
      {/* 상단 HUD */}
      <div style={styles.hud}>
        <div style={styles.hudLeft}>
          <span style={styles.cityName}>🌆 루스트 시티</span>
        </div>
        <div style={styles.hudRight}>
          <div style={styles.stat}>매력도 <span style={styles.statVal}>Lv.1</span></div>
          <div style={styles.stat}>골드 <span style={styles.statVal}>💰 {gold.toLocaleString()}G</span></div>
          <button style={styles.logoutBtn} onClick={onViewCharacter}>내 캐릭터</button>
          <button style={styles.creatorBtn} onClick={onCreatorMode}>👑 창조자</button>
        </div>
      </div>

      {/* 지도 영역 */}
      <div style={styles.mapArea} ref={mapRef} onClick={handleMapClick}>
        {/* 도시 배경 */}
        <div style={styles.cityBg}>
          {/* 배경 건물들 */}
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              ...styles.building,
              left: `${5 + i * 8}%`,
              height: `${80 + Math.sin(i) * 40}px`,
              width: `${30 + (i % 3) * 15}px`,
              opacity: 0.3 + (i % 3) * 0.1,
            }} />
          ))}

          {/* 도로망 SVG */}
          {mapSize.width > 0 && <CityRoads width={mapSize.width} height={mapSize.height} />}

          {/* 남자 아바타 — 위치 컨테이너 */}
          <div style={{
            position: 'absolute',
            left: `${avatarPos.x}%`,
            top: `${avatarPos.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            transition: 'left 0.36s linear, top 0.36s linear',
            pointerEvents: 'none',
          }}>
            {character?.walkingVideoUrl ? (
              /* 실사 영상 아바타 */
              <div style={{
                transform: facing === 'left' ? 'scaleX(-1)' : undefined,
                filter: moving
                  ? 'drop-shadow(0 0 10px #e94560) drop-shadow(0 0 20px #e9456055)'
                  : 'drop-shadow(0 0 6px #c9a84cbb)',
              }}>
                <video
                  src={character.walkingVideoUrl}
                  autoPlay loop muted playsInline
                  style={{
                    width: 72, height: 96,
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              </div>
            ) : (
              /* SVG 폴백 아바타 */
              <SVGAvatar moving={moving} facing={facing} />
            )}
            {moving && (
              <div style={{
                position: 'absolute', top: -10, left: '50%',
                transform: 'translateX(-50%)',
                width: 7, height: 7,
                borderRadius: '50%',
                background: '#c9a84c',
                animation: 'pulse 0.6s infinite',
              }} />
            )}
          </div>

          {/* 장소 핀들 */}
          {LOCATIONS.map(loc => (
            <button
              key={loc.id}
              style={{
                ...styles.pin,
                left: `${loc.x}%`,
                top: `${loc.y}%`,
                borderColor: loc.color,
                boxShadow: selected?.id === loc.id ? `0 0 20px ${loc.color}` : `0 0 8px ${loc.color}66`,
              }}
              onClick={(e) => handlePinClick(e, loc)}
            >
              <span style={styles.pinEmoji}>{loc.emoji}</span>
              <span style={{ ...styles.pinLabel, color: loc.color }}>{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 장소 상세 패널 */}
      {selected && (
        <div style={styles.panel}>
          <div style={{ ...styles.panelAccent, background: selected.color }} />
          <div style={styles.panelContent}>
            <span style={styles.panelEmoji}>{selected.emoji}</span>
            <div>
              <h2 style={{ ...styles.panelName, color: selected.color }}>{selected.name}</h2>
              <p style={styles.panelDesc}>{selected.desc}</p>
            </div>
          </div>
          <button style={{ ...styles.enterBtn, background: selected.color }} onClick={() => setEntering(selected)}>
            입장하기
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0d0d1a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  hud: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'rgba(0,0,0,0.6)',
    borderBottom: '1px solid #c9a84c33',
    boxShadow: '0 1px 8px rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  hudLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  hudRight: { display: 'flex', alignItems: 'center', gap: 16 },
  cityName: { color: '#c9a84c', fontWeight: 'bold', fontSize: 18 },
  stat: { color: '#ffffff66', fontSize: 13 },
  statVal: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  logoutBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid #ffffff22',
    color: '#ffffff88',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: 12,
  },
  creatorBtn: {
    background: 'rgba(201,168,76,0.15)',
    border: '1px solid #c9a84c66',
    color: '#c9a84c',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cityBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, #0a0a1f 0%, #1a0a2e 40%, #0d0d1a 100%)',
    overflow: 'hidden',
  },
  building: {
    position: 'absolute',
    bottom: 0,
    background: 'linear-gradient(180deg, #1a1a3e, #0d0d2a)',
    borderTop: '1px solid #ffffff11',
  },
  pin: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.75)',
    border: '2px solid',
    borderRadius: 14,
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s',
    zIndex: 5,
  },
  pinEmoji: { fontSize: 36 },
  pinLabel: { fontSize: 16, fontWeight: 'bold', whiteSpace: 'nowrap' },
  panel: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(13,13,26,0.95)',
    border: '1px solid #c9a84c44',
    borderRadius: 16,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 320,
    zIndex: 20,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  },
  panelAccent: {
    width: 4,
    height: 48,
    borderRadius: 2,
    flexShrink: 0,
  },
  panelContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  panelEmoji: { fontSize: 32 },
  panelName: { fontSize: 18, fontWeight: 'bold', margin: 0 },
  panelDesc: { color: '#888', fontSize: 13, margin: '4px 0 0' },
  enterBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
}
