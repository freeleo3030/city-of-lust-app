// Animation Engine
// Gemini → emotion+intensity+gesture → animKey → clip file (webm)
// 클립 파일 추가/변경 시 CLIP_REGISTRY만 수정, Gemini/RelationshipEngine 불변

export type AnimKey =
  | 'neutral_subtle' | 'neutral_normal'
  | 'happy_subtle' | 'happy_normal' | 'happy_strong'
  | 'shy_subtle' | 'shy_normal' | 'shy_strong'
  | 'annoyed_normal' | 'annoyed_strong'
  | 'surprised_normal'
  | 'sad_normal'
  | 'laugh_normal'
  | 'touched_normal'

export type PoolType = 'idle' | 'listening' | 'talking' | 'reaction'

// 클립 등록: key → variation 파일 목록
// 파일이 없는 항목은 빈 배열 → fallback 처리
const CLIP_REGISTRY: Record<AnimKey, string[]> = {
  neutral_subtle:   [],  // neutral_subtle_01.webm, neutral_subtle_02.webm
  neutral_normal:   [],  // neutral_normal_01.webm, neutral_normal_02.webm
  happy_subtle:     [],
  happy_normal:     [],
  happy_strong:     [],
  shy_subtle:       [],
  shy_normal:       [],
  shy_strong:       [],
  annoyed_normal:   [],
  annoyed_strong:   [],
  surprised_normal: [],
  sad_normal:       [],
  laugh_normal:     [],
  touched_normal:   [],
}

// gesture → animKey 우선 힌트 (없으면 emotion+intensity로 결정)
const GESTURE_HINT: Partial<Record<string, AnimKey>> = {
  look_away:   'shy_subtle',
  cross_arms:  'annoyed_normal',
  nod:         'neutral_normal',
  smile:       'happy_subtle',
  laugh:       'laugh_normal',
}

// 최근 사용 클립 추적 (캐릭터별)
const recentlyUsed: Map<string, string[]> = new Map()
const RECENT_WINDOW = 3

function pickClip(charId: string, candidates: string[]): string | null {
  if (candidates.length === 0) return null
  const used = recentlyUsed.get(charId) ?? []
  const fresh = candidates.filter(c => !used.includes(c))
  const pool = fresh.length > 0 ? fresh : candidates
  const picked = pool[Math.floor(Math.random() * pool.length)]
  const next = [...used, picked].slice(-RECENT_WINDOW)
  recentlyUsed.set(charId, next)
  return picked
}

// animKey → clip URL 반환 (없으면 null → 정적 이미지 fallback)
export function resolveClip(
  charId: string,
  animKey: string,
  gesture: string,
  charBaseUrl: string,
): string | null {
  // gesture 힌트로 key override 시도
  const gestureKey = GESTURE_HINT[gesture] as AnimKey | undefined
  const primaryKey = (gestureKey ?? animKey) as AnimKey

  const primary = CLIP_REGISTRY[primaryKey]
  if (primary && primary.length > 0) {
    const clip = pickClip(charId, primary)
    if (clip) return `${charBaseUrl}/clips/${clip}`
  }

  // fallback: animKey 그대로
  if (gestureKey && animKey !== gestureKey) {
    const fallback = CLIP_REGISTRY[animKey as AnimKey]
    if (fallback && fallback.length > 0) {
      const clip = pickClip(charId, fallback)
      if (clip) return `${charBaseUrl}/clips/${clip}`
    }
  }

  return null
}

// 클립 등록 (EchoMimic 생성 후 파일 추가할 때 여기에 등록)
export function registerClips(key: AnimKey, files: string[]) {
  CLIP_REGISTRY[key] = files
}

// v1 베이 클립 목록 (파일 생성 후 채워 넣기)
export function registerBayClips() {
  // 4개 파일 통과 후 아래에 추가:
  // registerClips('neutral_normal',   ['neutral_normal_01.webm', 'neutral_normal_02.webm'])
  // registerClips('happy_normal',     ['happy_normal_01.webm'])
  // registerClips('shy_normal',       ['shy_normal_01.webm'])
  // registerClips('annoyed_normal',   ['annoyed_normal_01.webm'])
}
