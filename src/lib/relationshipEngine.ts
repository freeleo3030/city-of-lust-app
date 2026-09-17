// ─── Interaction Result 타입 (Gemini fallback 보호) ───────────────────────
export const INTERACTION_RESULTS = [
  'neutral',
  'good_conversation',
  'made_laugh',
  'shared_interest',
  'good_compliment',
  'showed_empathy',
  'remembered_detail',
  'shared_secret',
  'respected_boundary',
  'kept_promise',
  'good_date',
  'successful_flirt',
  'awkward_moment',
  'poor_conversation',
  'inappropriate_question',
  'manner_violation',
  'ignored_boundary',
  'broke_promise',
  'dishonesty',
  'conflict_resolved',
  'good_apology',
] as const

export type InteractionResult = typeof INTERACTION_RESULTS[number]

export function safeInteractionResult(raw: string): InteractionResult {
  return (INTERACTION_RESULTS as readonly string[]).includes(raw)
    ? (raw as InteractionResult)
    : 'neutral'
}

// ─── Event Table (Base Delta) ───────────────────────────────────────────────
interface BaseDelta {
  affection: number
  trust: number
  comfort: number
  attraction: number
  conflict: number
}

export const EVENT_TABLE: Record<InteractionResult, BaseDelta> = {
  neutral:               { affection: 0,  trust: 0,   comfort: +1, attraction: 0,  conflict: 0  },
  good_conversation:     { affection: +3, trust: +1,  comfort: +3, attraction: +1, conflict: -1 },
  made_laugh:            { affection: +4, trust: +1,  comfort: +4, attraction: +2, conflict: -2 },
  shared_interest:       { affection: +4, trust: +2,  comfort: +3, attraction: +2, conflict: 0  },
  good_compliment:       { affection: +3, trust: 0,   comfort: +1, attraction: +3, conflict: 0  },
  showed_empathy:        { affection: +5, trust: +4,  comfort: +4, attraction: +1, conflict: -2 },
  remembered_detail:     { affection: +5, trust: +4,  comfort: +3, attraction: +1, conflict: 0  },
  shared_secret:         { affection: +4, trust: +5,  comfort: +3, attraction: 0,  conflict: 0  },
  respected_boundary:    { affection: +3, trust: +5,  comfort: +4, attraction: 0,  conflict: -2 },
  kept_promise:          { affection: +5, trust: +5,  comfort: +2, attraction: +1, conflict: -2 },
  good_date:             { affection: +8, trust: +3,  comfort: +5, attraction: +4, conflict: -2 },
  successful_flirt:      { affection: +5, trust: +1,  comfort: +1, attraction: +6, conflict: 0  },
  awkward_moment:        { affection: -1, trust: 0,   comfort: -3, attraction: -1, conflict: +1 },
  poor_conversation:     { affection: -2, trust: 0,   comfort: -3, attraction: -1, conflict: +1 },
  inappropriate_question:{ affection: -3, trust: -3,  comfort: -5, attraction: -2, conflict: +3 },
  manner_violation:      { affection: -6, trust: -5,  comfort: -5, attraction: -3, conflict: +6 },
  ignored_boundary:      { affection: -8, trust: -10, comfort: -8, attraction: -4, conflict: +10 },
  broke_promise:         { affection: -7, trust: -10, comfort: -4, attraction: -2, conflict: +8 },
  dishonesty:            { affection: -8, trust: -12, comfort: -5, attraction: -2, conflict: +10 },
  conflict_resolved:     { affection: +5, trust: +5,  comfort: +4, attraction: +1, conflict: -8 },
  good_apology:          { affection: +3, trust: +4,  comfort: +3, attraction: 0,  conflict: -6 },
}

// ─── Trust Level 라벨 ───────────────────────────────────────────────────────
export type TrustLevel = 'guarded' | 'exploring' | 'comfortable' | 'trusting' | 'deep_trust'

export function getTrustLevel(trust: number): TrustLevel {
  if (trust < 20) return 'guarded'
  if (trust < 40) return 'exploring'
  if (trust < 60) return 'comfortable'
  if (trust < 80) return 'trusting'
  return 'deep_trust'
}

// ─── Stage ──────────────────────────────────────────────────────────────────
export type RelationshipStage = 'stranger' | 'interested' | 'dating' | 'intimate' | 'relationship'

export interface RelationshipState {
  affection: number   // 0~500
  attraction: number  // 0~100
  trust: number       // 0~100
  comfort: number     // 0~100
  conflict: number    // 0~100
  stage: RelationshipStage
}

export function calcStage(s: RelationshipState): RelationshipStage {
  // relationship는 이벤트 게이트 필요 — 자동 승급 안 함
  if (s.stage === 'relationship') return 'relationship'

  if (
    s.affection >= 280 &&
    s.trust >= 60 &&
    s.comfort >= 60 &&
    s.attraction >= 60 &&
    s.conflict < 40
  ) return 'intimate'

  if (
    s.affection >= 150 &&
    s.trust >= 35 &&
    s.comfort >= 35 &&
    s.attraction >= 40 &&
    s.conflict < 60
  ) return 'dating'

  if (s.affection >= 60 && s.attraction >= 30) return 'interested'

  return 'stranger'
}

export function canUnlockSex(s: RelationshipState): boolean {
  return (
    s.affection >= 280 &&
    s.trust >= 60 &&
    s.comfort >= 60 &&
    s.attraction >= 60 &&
    s.conflict < 40
  )
}

// ─── NPC Preference Modifier ─────────────────────────────────────────────────
// target_trait → NPC 성격 수치 기반 배율 (0.5 ~ 1.5)
const TRAIT_STAT_MAP: Record<string, string> = {
  humor:       'friendly',   // 유머 선호 → friendly 수치로 근사
  empathy:     'introvert',  // 공감 중요도 → 내성적일수록 감정 중시
  appearance:  'friendly',
  fashion:     'friendly',
  reliability: 'indirect',
  interest:    'introvert',
}

function getPreferenceModifier(targetTrait: string, personality: Record<string, number>): number {
  const statKey = TRAIT_STAT_MAP[targetTrait]
  if (!statKey) return 1.0
  const val = personality[statKey] ?? 3  // 1~5
  // 1→0.7, 3→1.0, 5→1.4
  return 0.7 + (val - 1) * 0.175
}

// ─── Repetition Modifier ─────────────────────────────────────────────────────
// 최근 N턴 안에 같은 result가 몇 번 나왔는지로 감소
function getRepetitionModifier(result: InteractionResult, recentResults: InteractionResult[]): number {
  const count = recentResults.slice(-10).filter(r => r === result).length
  if (count <= 1) return 1.0
  if (count === 2) return 0.7
  if (count === 3) return 0.4
  return 0.2
}

// ─── 최종 Delta 계산 ─────────────────────────────────────────────────────────
export function calcDelta(
  result: InteractionResult,
  targetTrait: string,
  personality: Record<string, number>,
  recentResults: InteractionResult[],
): BaseDelta {
  const base = EVENT_TABLE[result]
  const prefMod = getPreferenceModifier(targetTrait, personality)
  const repMod  = getRepetitionModifier(result, recentResults)
  const mod = prefMod * repMod

  const round = (n: number) => Math.round(n * mod)

  return {
    affection:  round(base.affection),
    trust:      round(base.trust),
    comfort:    round(base.comfort),
    attraction: round(base.attraction),
    conflict:   round(base.conflict),
  }
}

// ─── Animation Intensity 레벨 ─────────────────────────────────────────────────
export type IntensityLevel = 'subtle' | 'normal' | 'strong'

export function getIntensityLevel(intensity: number): IntensityLevel {
  if (intensity <= 0.3) return 'subtle'
  if (intensity <= 0.65) return 'normal'
  return 'strong'
}

// ─── 클립 키 생성 (나중에 Animation Engine에서 사용) ─────────────────────────
export function getAnimationKey(emotion: string, intensity: number): string {
  return `${emotion}_${getIntensityLevel(intensity)}`
}
