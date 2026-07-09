import { useState } from 'react'
import { supabase } from '../lib/supabase'
import LocationPage from './LocationPage'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'

const LOCATIONS = [
  // ── 왼쪽 (건전한 구역) ──
  { id:  1, name: '대학교',   emoji: '🎓', x:  8, y: 12, color: '#29B6F6', desc: '젊음과 열정의 캠퍼스' },
  { id:  2, name: '도서관',   emoji: '📚', x: 20, y: 25, color: '#4FC3F7', desc: '조용한 지식의 공간' },
  { id:  3, name: '병원',     emoji: '🏥', x:  8, y: 40, color: '#00E676', desc: '청순한 간호사들의 성지' },
  { id:  4, name: '약국',     emoji: '💊', x: 22, y: 53, color: '#69F0AE', desc: '가까운 이웃 약사님' },
  { id:  5, name: '공공기관', emoji: '🏛️', x:  8, y: 66, color: '#78909C', desc: '딱딱한 공무원의 세계' },
  { id:  6, name: '경찰서',   emoji: '🚔', x: 20, y: 78, color: '#7C4DFF', desc: '규율과 권위의 공간' },
  { id:  7, name: '헬스장',   emoji: '💪', x:  8, y: 90, color: '#FF5722', desc: '몸을 만드는 곳' },

  // ── 가운데 (중립 구역) ──
  { id:  8, name: '카페',     emoji: '☕', x: 38, y: 10, color: '#c9a84c', desc: '가벼운 만남의 장소' },
  { id:  9, name: '쇼핑몰',   emoji: '🛍️', x: 48, y: 25, color: '#E91E63', desc: '패션과 스타일의 천국' },
  { id: 10, name: '공원',     emoji: '🌳', x: 35, y: 42, color: '#66BB6A', desc: '자연 속의 달콤한 만남' },
  { id: 11, name: '노래방',   emoji: '🎤', x: 50, y: 58, color: '#FF80AB', desc: '둘만의 달콤한 시간' },
  { id: 12, name: '해변',     emoji: '🏖️', x: 38, y: 75, color: '#26C6DA', desc: '뜨거운 태양 아래 만남' },
  { id: 13, name: '비행장',   emoji: '✈️', x: 50, y: 90, color: '#FF9800', desc: '떠나는 자와 오는 자' },

  // ── 오른쪽 (유흥 구역) ──
  { id: 14, name: '회사',     emoji: '🏢', x: 65, y: 10, color: '#90A4AE', desc: '커리어 우먼들의 세계' },
  { id: 15, name: '레스토랑', emoji: '🍽️', x: 78, y: 22, color: '#FF6B9D', desc: '로맨틱한 저녁 식사' },
  { id: 16, name: '고급레스토랑', emoji: '🍷', x: 88, y: 35, color: '#c9a84c', desc: '특별한 밤을 위한 만찬' },
  { id: 17, name: '바',       emoji: '🍸', x: 65, y: 48, color: '#AB47BC', desc: '술 한 잔의 여유' },
  { id: 18, name: '클럽',     emoji: '🎵', x: 80, y: 60, color: '#e94560', desc: 'DJ 부스·무대·댄스 플로어가 있는 나이트클럽' },
  { id: 19, name: '성인샵',   emoji: '🔞', x: 68, y: 73, color: '#F06292', desc: '은밀한 욕망을 채우는 곳' },
  { id: 20, name: '호텔',     emoji: '🏨', x: 85, y: 78, color: '#FFD700', desc: '은밀한 밤을 위한 공간' },
  { id: 21, name: '룸싸롱',   emoji: '🥂', x: 72, y: 88, color: '#F48FB1', desc: '고급스러운 밤의 세계' },
  { id: 22, name: '모텔',     emoji: '🛏️', x: 88, y: 90, color: '#EF9A9A', desc: '저렴하고 은밀한 밤' },
]

export default function MapPage({ onViewCharacter, gold = 500, onCreatorMode, femaleChars = [] }: { character?: any; onViewCharacter?: () => void; gold?: number; onCreatorMode?: () => void; femaleChars?: FemaleCharacterData[] }) {
  const [selected, setSelected] = useState<typeof LOCATIONS[0] | null>(null)
  const [entering, setEntering] = useState<typeof LOCATIONS[0] | null>(null)

  if (entering) return <LocationPage location={entering} femaleChars={femaleChars} onBack={() => setEntering(null)} />

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
      <div style={styles.mapArea}>
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
              onClick={() => setSelected(selected?.id === loc.id ? null : loc)}
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
    background: 'rgba(0,0,0,0.7)',
    border: '2px solid',
    borderRadius: 12,
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s',
    zIndex: 5,
  },
  pinEmoji: { fontSize: 24 },
  pinLabel: { fontSize: 11, fontWeight: 'bold', whiteSpace: 'nowrap' },
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
