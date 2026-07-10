import React, { useState, useEffect } from 'react'
import { generateProfileImage, generateExpressionImages, generatePoseImages, generatePoseVariants, deleteImageFromStorage, CONVERSATION_EXPRESSIONS, POSES, POSE_EXPRESSIONS, POSE_BACKGROUNDS } from '../lib/generateCharImages'
import { supabase } from '../lib/supabase'

export interface FemaleCharacterData {
  id: string
  nickname: string
  age: number
  married: '미혼' | '기혼' | '돌싱'
  job: string
  location: string
  bodyType: '글래머' | '베이글' | '슬랜더' | '머슬'
  intro: string
  // 외모
  heightCm: number
  face: number
  body: number
  fashion: number
  // 관심사
  interestTags: string[]
  interestCustom: string
  dislikeTags: string[]
  dislikeCustom: string
  // 성격 슬라이더 (1~5)
  personality: { introvert: number; indirect: number; friendly: number }
  // 메모
  memo: string
  // 성감대 (숨김 스탯, 0~5)
  erogenous: {
    breast: number; neckEar: number; thigh: number; clitoris: number
    vagina: number; anal: number; mouth: number
  }
  // 남성 선호도 (숨김 스탯)
  prefAge: { age20: number; age30: number; age40: number }         // 합계=100, age40 자동
  prefLook: { face: number; height: number; body: number; fashion: number }  // 합계=100, fashion 자동
  prefWealth: number  // 재력선호 20~100 (S1/S2 별도)
  prefPersonality: { intel: number; humor: number; virtue: number; manner: number } // 합계=100, manner 자동
  prefErect: { power: number; duration: number; hardness: number; tech: number }    // 합계=100, tech 자동
  prefPose: { missionary: number; doggy: number; cowgirl: number; side: number }
  smTendency: number     // 여캐 자신의 S/M 성향: -100(완전 M) ~ +100(완전 S)
  prefSmTendency: number // 선호하는 남성 S/M 성향: -100(M남 선호) ~ +100(S남 선호)
  // 외모 설명 (이미지 생성용)
  appearanceDesc?: string
  hairColor?: string
  hairLength?: string
  glasses?: boolean
  // 이미지
  imageUrl?: string
  expressionImages?: string[]          // 5장: 평상시~절정 (대화 화면용)
  poseImages?: Record<string, string>  // 4자세 × 3표정 = 12장 (sex 씬용)
  createdAt: string
}

const LOCATIONS = [
  '대학교','도서관','병원','약국','공공기관','경찰서','헬스장','카페',
  '쇼핑몰','공원','노래방','해변','비행장','회사','레스토랑','고급레스토랑',
  '바','클럽','호텔',
]
const INTEREST_TAGS = ['음식/술','여행','패션','운동','독서','영화','음악','요리','쇼핑','반려동물','미술','게임','야외활동','자기계발','연애','정치/사회']
const DISLIKE_TAGS = ['흡연','음주','무례한 말','과한 스킨십','돈 자랑','우유부단','리드 못함','지각','전 얘기','거짓말','위생 불량','대화 중 폰만 봄','질투/통제','정치 얘기','운동 강요']
const BODY_TYPES = ['글래머','베이글','슬랜더','머슬'] as const
const MARRIED_TYPES = ['미혼','기혼','돌싱'] as const

const EROGENOUS_ZONES = [
  { key: 'breast',   label: '가슴',    note: '글래머/베이글은 3+ 권장' },
  { key: 'neckEar',  label: '목·귀',   note: '도도형은 낮게 설정' },
  { key: 'thigh',    label: '허벅지',  note: '애무 선행 부위' },
  { key: 'clitoris', label: '클리토리스', note: '핵심 성감대 — 낮게 설정 비권장' },
  { key: 'vagina',   label: '질 내부', note: 'G스팟 반응은 4+ 권장' },
  { key: 'anal',     label: '항문',    note: '0=거부 반응' },
  { key: 'mouth',    label: '입·입술', note: '구강 선호도' },
] as const

function buildFemalePrompt(c: Partial<FemaleCharacterData>): string {
  const ageLabel = (c.age ?? 25) < 30 ? 'mid-20s' : (c.age ?? 25) < 40 ? 'early 30s' : 'early 40s'
  const bodyDesc = c.bodyType === '글래머' ? 'voluptuous curvy body' : c.bodyType === '베이글' ? 'slim waist with curves' : c.bodyType === '머슬' ? 'athletic toned body' : 'slender slim body'
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

function smLabel(v: number) {
  return v <= -60 ? '극 M' : v < -20 ? 'M 성향' : v >= 60 ? '극 S' : v > 20 ? 'S 성향' : '중립'
}
function SmSlider(val: number, set: (v: number) => void) {
  const color = val < -20 ? '#e94560' : val > 20 ? '#c9a84c' : '#ffffff66'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 52, color }}>{smLabel(val)}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ffffff33' }}>
          <span>M −100</span><span>0</span><span>S +100</span>
        </div>
        <input type="range" min={-100} max={100} step={5} value={val}
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
  const d = initialData
  const [nickname, setNickname] = useState(d?.nickname ?? '')
  const [age, setAge] = useState(d ? String(d.age) : '25')
  const [married, setMarried] = useState<'미혼'|'기혼'|'돌싱'>(d?.married ?? '미혼')
  const [job, setJob] = useState(d?.job ?? '')
  const [location, setLocation] = useState(d?.location ?? LOCATIONS[0])
  const [bodyType, setBodyType] = useState<'글래머'|'베이글'|'슬랜더'|'머슬'>(d?.bodyType ?? '글래머')
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

  // 일반 성감대: 목귀/허벅지/항문/입/발 수동, 가슴 자동 (합계 15)
  const GEN_TOTAL = 15
  const [genEro, setGenEroState] = useState(d?.erogenous
    ? { neckEar: d.erogenous.neckEar, thigh: d.erogenous.thigh, anal: d.erogenous.anal, mouth: d.erogenous.mouth }
    : { neckEar: 3, thigh: 3, anal: 1, mouth: 3 })
  const breast = Math.min(5, Math.max(0, GEN_TOTAL - Object.values(genEro).reduce((a,b)=>a+b,0)))
  const setGenEro = (key: keyof typeof genEro, val: number) => {
    const others = Object.entries(genEro).filter(([k])=>k!==key).reduce((a,[,v])=>a+v,0)
    setGenEroState({ ...genEro, [key]: Math.min(5, Math.min(val, Math.max(0, GEN_TOTAL - others))) })
  }

  // 핵심 성감대: 클리토리스·질내부 각각 독립 (min 2, max 20, 합계 40)
  const CORE_TOTAL = 20
  const CORE_MIN = 4; const CORE_MAX = CORE_TOTAL - CORE_MIN // 16
  const [clitoris, setClitoris] = useState(d?.erogenous?.clitoris ?? 10)
  const vagina = CORE_TOTAL - clitoris

  const erogenous = { ...genEro, breast, clitoris, vagina }

  // 남성 선호도
  const PREF_TOTAL = 100
  // 나이 선호 (40대 자동)
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
  // S1 외모 선호 (패션 자동)
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
  // S2 성격 선호 (매너 자동)
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
  // S3 발기 선호 (테크닉 자동)
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
  // 선호 자세 (-5~+5)
  const [prefPose, setPrefPose] = useState(d?.prefPose ?? { missionary:0, doggy:0, cowgirl:0, side:0 })
  const [smTendency, setSmTendency] = useState(d?.smTendency ?? 0)
  const prefSmTendency = -smTendency  // 여캐 M → 남캐 S 자동 연동
  const [appearanceDesc, setAppearanceDesc] = useState(d?.appearanceDesc ?? '')
  const [hairColor, setHairColor] = useState<string>(d?.hairColor ?? '')
  const [hairLength, setHairLength] = useState<string>(d?.hairLength ?? '')
  const [glasses, setGlasses] = useState<boolean>(d?.glasses ?? false)
  const setPose = (key: keyof typeof prefPose, val: number) => setPrefPose({ ...prefPose, [key]: Math.min(5, Math.max(-5, val)) })

  const buildAppearanceDesc = () => {
    const parts: string[] = []
    if (hairColor) parts.push(hairColor)
    if (hairLength) parts.push(hairLength)
    if (glasses) parts.push('wearing glasses')
    const extra = appearanceDesc.trim()
    if (extra) parts.push(extra)
    return parts.join(', ') || undefined
  }

  // 자기소개 자동 생성
  const autoIntro = (() => {
    const ageNum = parseInt(age)
    if (!job.trim() || isNaN(ageNum)) return ''

    const ageLabel = ageNum < 30 ? '20대' : ageNum < 40 ? '30대' : '40대'
    const marriedLabel = married === '미혼' ? '미혼' : married === '기혼' ? '기혼' : '돌싱'

    // 외모 top 1
    const topLook = face >= body && face >= fashion ? '외모' : body >= fashion ? '몸매' : '스타일'
    const bodyLabel = bodyType === '글래머' ? '글래머러스한' : bodyType === '베이글' ? '균형 잡힌' : bodyType === '슬랜더' ? '슬림한' : '탄탄한'

    // 관심사 1~2개
    const interests = [...interestTags, ...(interestCustom.trim() ? [interestCustom.trim()] : [])].slice(0, 2)
    const interestStr = interests.length > 0 ? `${interests.join(', ')} 좋아해. ` : ''

    // 싫어하는 것 1개
    const dislikes = [...dislikeTags, ...(dislikeCustom.trim() ? [dislikeCustom.trim()] : [])].slice(0, 1)
    const dislikeStr = dislikes.length > 0 ? `${dislikes[0]}은 질색. ` : ''

    // 선호 남성 (sex 제외, 간접 표현)
    const lookPref = { 얼굴: prefFace, 키: prefHeight, 체격: prefBodyLook, 패션: prefFashion }
    const persPref = { 지적인: prefIntel, 유머있는: prefHumor, 다정한: prefVirtue, 매너있는: prefManner }
    const topLookPref = Object.entries(lookPref).sort((a,b)=>b[1]-a[1])[0][0]
    const topPersPref = Object.entries(persPref).sort((a,b)=>b[1]-a[1])[0][0]
    const wealthStr = prefWealth >= 60 ? ', 경제적으로 안정적인' : ''
    const prefStr = `${topLookPref} 좋고${wealthStr} ${topPersPref} 남자에게 끌려.`

    return `${marriedLabel} ${ageLabel} ${job.trim()}. ${bodyLabel} ${topLook}. ${interestStr}${dislikeStr}${prefStr}`
  })()

  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const isEdit = !!d
  const [phase, setPhase] = useState<'form' | 'profile_review' | 'image_studio'>(isEdit ? 'image_studio' : 'form')
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
  // 새 자세 선택 시스템
  const [poseVariants, setPoseVariants] = useState<Record<string, Record<string, string[]>>>({})
  // poseVariants[poseKey][exprKey] = [url, ...]
  const [selectedPoseImages, setSelectedPoseImages] = useState<Record<string, string>>(
    d?.poseImages ?? {}
  )
  const [activePoseKey, setActivePoseKey] = useState<string | null>(null)
  const [activeExprStep, setActiveExprStep] = useState<'aroused' | 'climax' | null>(null)
  const [generatingVariants, setGeneratingVariants] = useState(false)
  const [variantProgress, setVariantProgress] = useState('')
  const [variantOverlay, setVariantOverlay] = useState<{ poseKey: string; exprKey: string; urls: string[] } | null>(null)
  const [variantZoom, setVariantZoom] = useState<string | null>(null)
  const [variantZoomScale, setVariantZoomScale] = useState(1)
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

  // non-passive wheel: 메인 액자
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

  // non-passive wheel: enlarged 모달
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

  // 프로필 생성 취소
  const handleCancelProfile = async () => {
    profileAbortController.current?.abort()
  }

  // 프로필 이미지 5장 생성 (공통)
  const generateProfileSet = async (prevImages: string[] = []) => {
    // 이전 이미지 전부 삭제
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
          if (controller.signal.aborted) {
            deleteImageFromStorage(url)
            return
          }
          results[i] = url
          count++
          setGenProgress(`${count} / ${MAX_PROFILE_IMGS}`)
          setProfileImages([...results].filter(Boolean))
        } catch (e: any) {
          if (e?.name !== 'AbortError') console.error(`프로필 ${i+1} 생성 실패:`, e)
        }
      })
    )

    setGenerating(false)
    setGenProgress('')
    profileAbortController.current = null
  }

  // 1단계: 폼 완료 → 5장 생성
  const handleComplete = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (!job.trim()) { setError('직업을 입력해주세요.'); return }
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < 20 || ageNum > 49) { setError('나이를 올바르게 입력해주세요. (20~49)'); return }
    setError('')
    setPhase('profile_review')
    await generateProfileSet([])
  }

  // 재생성: 현재 5장 전부 삭제 후 새로 5장
  const handleRegenProfile = async () => {
    await generateProfileSet(profileImages)
  }

  // 프로필 확정 → image_studio 단계로
  const handleFinalizeProfile = () => {
    const imageUrl = profileImages[selectedProfileIdx]

    // 선택 안 된 프로필 이미지 Storage에서 삭제
    profileImages.forEach((url, i) => {
      if (i !== selectedProfileIdx && url) deleteImageFromStorage(url)
    })

    setProfileImages([imageUrl])
    setSelectedProfileIdx(0)
    setProfileFinalized(true)
    setConfirmingProfile(false)

    // 기존 표정 이미지 삭제
    expressionSets.forEach(set => {
      set.forEach(url => { if (url) deleteImageFromStorage(url) })
    })
    setExpressionSets([])
    setSelectedExprSet(0)

    // 기존 자세 이미지 삭제 (variants + selected)
    Object.values(poseVariants).forEach(exprMap => {
      Object.values(exprMap).forEach(urls => {
        urls.forEach(url => { if (url) deleteImageFromStorage(url) })
      })
    })
    Object.values(selectedPoseImages).forEach(url => { if (url) deleteImageFromStorage(url) })
    setPoseVariants({})
    setSelectedPoseImages({})

    setPhase('image_studio')
  }

  const MAX_SETS = 5

  // 표정 5장 생성 — 최대 MAX_SETS 세트까지 append, 초과 시 가장 오래된 세트 삭제
  const handleGenExpressions = async () => {
    setGeneratingExpr(true)
    try {
      const result = await generateExpressionImages(
        buildPartialChar() as any,
        (done, total, label) => setGenProgress(`표정 생성 중... ${label} (${done + 1}/${total})`),
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
    } catch (e) { console.error('표정 생성 실패:', e) }
    setGenProgress('')
    setGeneratingExpr(false)
  }

  // 자세 8장 생성 (최대 5세트) - 기존 방식 유지
  const handleGenPoses = async () => {
    if (poseSets.length >= MAX_SETS) return
    setGeneratingPose(true)
    try {
      const result = await generatePoseImages(
        buildPartialChar() as any,
        (done, total, label) => setGenProgress(`자세 생성 중... ${label} (${done + 1}/${total})`),
        { randomSeed: poseSets.length > 0, profileImageUrl: profileImages[selectedProfileIdx] ?? profileImages[0] }
      )
      setPoseSets(prev => {
        const next = [...prev, result]
        setSelectedPoseSet(next.length - 1)
        return next
      })
    } catch (e) { console.error('자세 생성 실패:', e) }
    setGenProgress('')
    setGeneratingPose(false)
  }

  // 새 방식: 자세별 표정 5장씩 생성
  const handleCancelVariants = () => {
    variantAbortController.current?.abort()
  }

  const handleGenVariants = async (poseKey: string, exprKey: 'aroused' | 'climax') => {
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
        (done, total) => setVariantProgress(`${poseLabel} · ${exprLabel} ${done}/${total}`),
        { profileImageUrl: profileImages[selectedProfileIdx], signal: controller.signal, bgKey: selectedBgKey }
      )
      if (!controller.signal.aborted) {
        setPoseVariants(prev => {
          // 이전 variants 삭제 (선택된 이미지 제외)
          const prevUrls = prev[poseKey]?.[exprKey] ?? []
          const chosen = selectedPoseImages[`${poseKey}_${exprKey}`]
          prevUrls.forEach(u => { if (u && u !== chosen) deleteImageFromStorage(u) })
          return {
            ...prev,
            [poseKey]: { ...(prev[poseKey] ?? {}), [exprKey]: urls }
          }
        })
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error('variant 생성 실패:', e)
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

  const handleSelectVariant = (poseKey: string, exprKey: string, url: string) => {
    const slotKey = `${poseKey}_${exprKey}`
    // 같은 슬롯의 다른 variants 삭제
    const variants = poseVariants[poseKey]?.[exprKey] ?? []
    variants.forEach(u => { if (u && u !== url) deleteImageFromStorage(u) })
    // 이전에 이미 선택되어 있던 이미지 삭제 (이전 세션 포함)
    const prevUrl = selectedPoseImages[slotKey]
    if (prevUrl && prevUrl !== url) deleteImageFromStorage(prevUrl)
    setPoseVariants(prev => ({
      ...prev,
      [poseKey]: { ...(prev[poseKey] ?? {}), [exprKey]: [url] }
    }))
    setSelectedPoseImages(prev => ({ ...prev, [slotKey]: url }))
  }

  // 최종 저장 및 완료
  const handleSaveAndComplete = async () => {
    const imageUrl = profileImages[0]
    setGenerating(true)
    setGenProgress('데이터 저장 중...')

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
      prefPose, smTendency, prefSmTendency,
      appearanceDesc: buildAppearanceDesc(),
      hairColor: hairColor || undefined,
      hairLength: hairLength || undefined,
      glasses,
      imageUrl,
      expressionImages: expressionSets[selectedExprSet] ?? [],
      poseImages: selectedPoseImages,
      createdAt: new Date().toISOString(),
    }

    // 선택 안 된 표정/자세 세트 Storage에서 삭제
    const urlToPath = (url: string) => decodeURIComponent(url.split('/char-images/')[1]?.split('?')[0] ?? '')
    const toDelete: string[] = []
    expressionSets.forEach((set, i) => {
      if (i !== selectedExprSet) set.forEach(url => { if (url) toDelete.push(urlToPath(url)) })
    })
    // 선택 안 된 포즈 variant 삭제
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
          prefPose, smTendency, prefSmTendency,
          appearanceDesc: buildAppearanceDesc(),
          hairColor: hairColor || undefined,
          hairLength: hairLength || undefined,
          glasses,
        },
        image_url: imageUrl ?? null,
        expression_images: (expressionSets[selectedExprSet] ?? []).length ? expressionSets[selectedExprSet] : null,
        pose_images: Object.keys(selectedPoseImages).length ? selectedPoseImages : null,
      })
    } catch (e) { console.error('DB 저장 실패:', e) }

    setGenerating(false)
    setGenProgress('')
    onComplete(char)
  }

  const sensColor = (v: number) => v === 0 ? '#e94560' : v >= 4 ? '#c9a84c' : v >= 3 ? '#66BB6A' : '#ffffff66'
  const sensColor10 = (v: number) => v === 0 ? '#e94560' : v >= 7 ? '#c9a84c' : v >= 5 ? '#66BB6A' : '#ffffff66'

  // 3단계: 표정·자세 생성 스튜디오
  if (phase === 'image_studio') {
    const busy = generatingExpr || generatingPose || generating || generatingVariants
    return (
      <div style={S.container}>

        {/* ── 모달들: S.container 직속 (position:fixed 보장) ── */}
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
              <img src={profileImages[0]} alt="대표 확대" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s' }} />
            </div>
            <div style={{ color: '#ffffff44', fontSize: 12, marginTop: 12 }}>휠: 확대/축소 · 드래그: 이동 · 바깥 클릭으로 닫기</div>
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
                    <img src={(expressionSets[selectedExprSet] ?? [])[enlargedExprIdx]} alt="확대" draggable={false}
                      style={{ width: Math.min(672, window.innerWidth - 40), height: Math.min(864, window.innerHeight - 160), objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c55', transform: `translate(${exprPan.x}px, ${exprPan.y}px) scale(${exprZoomScale})`, transformOrigin: 'center', transition: exprDragRef.current ? 'none' : 'transform 0.05s' }} />
                  </div>
                  <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>{CONVERSATION_EXPRESSIONS[enlargedExprIdx]?.label}</span>
                  <div style={{ color: '#ffffff55', fontSize: 12 }}>휠: 확대/축소 · 드래그: 이동 · 클릭으로 목록</div>
                </>
              ) : (
                <>
                  {expressionSets.length > 1 && (
                    <div style={IS.setTabs}>
                      {expressionSets.map((_, i) => (
                        <button key={i} style={{ ...IS.setTab, ...(i === selectedExprSet ? IS.setTabActive : {}) }} onClick={() => { setSelectedExprSet(i); setEnlargedExprIdx(null) }}>세트 {i + 1}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                    {(expressionSets[selectedExprSet] ?? []).map((url, i) => url ? (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <img src={url} alt={`표정${i+1}`} style={{ ...IS.enlargedImg, cursor: 'zoom-in' }}
                          onClick={() => setEnlargedExprIdx(i)} />
                        <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold' }}>{CONVERSATION_EXPRESSIONS[i]?.label}</span>
                      </div>
                    ) : null)}
                  </div>
                  {expressionSets.length > 1 && (
                    <button
                      style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', marginTop: 4 }}
                      onClick={() => { handleSelectExprSet(selectedExprSet); setEnlargedExpr(false); setEnlargedExprIdx(null) }}
                    >✅ 세트 {selectedExprSet + 1} 선택</button>
                  )}
                  <div style={{ color: '#ffffff44', fontSize: 12 }}>사진 클릭으로 2배 확대 · 세트 탭으로 전환 · 바깥 클릭으로 닫기</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5장 선택 오버레이 */}
        {variantOverlay && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '16px 20px 24px' }}
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
              {/* 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 16 }}>
                  {POSES.find(p => p.key === variantOverlay.poseKey)?.label} · {POSE_EXPRESSIONS.find(e => e.key === variantOverlay.exprKey)?.label} — 1장 선택
                </span>
              </div>

              {/* 줌 상태: 1장 크게 + 스크롤 확대 + 드래그 이동 */}
              {variantZoom ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <button onClick={() => { setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); setVariantOverlay(null) }}
                      style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid #ffffff55', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                    <img src={variantZoom} alt="확대" draggable={false}
                      style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, border: '2px solid #c9a84c', transform: `translate(${variantPan.x}px, ${variantPan.y}px) scale(${variantZoomScale})`, transformOrigin: 'center', transition: variantDrag.current ? 'none' : 'transform 0.05s' }} />
                  </div>
                  </div>{/* position:relative wrapper */}
                  <div style={{ color: '#ffffff44', fontSize: 11 }}>휠: 확대/축소 · 드래그: 이동</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }) }}
                      style={{ background: 'none', border: '1px solid #ffffff44', color: '#ffffff88', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>← 목록으로</button>
                    <button onClick={() => {
                      handleSelectVariant(variantOverlay.poseKey, variantOverlay.exprKey, variantZoom)
                      setVariantZoom(null); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }); setVariantOverlay(null)
                    }} style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 28px', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>✅ 이 사진 선택</button>
                  </div>
                </div>
              ) : (
                /* 5장 목록 — 가로 일렬 스크롤 */
                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto', width: '100%', paddingBottom: 8, justifyContent: 'center' }}>
                  {variantOverlay.urls.map((url, i) => {
                    const imgH = Math.min(Math.round(window.innerHeight * 0.65), 520)
                    const imgW = Math.round(imgH * 3 / 4)
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <img src={url} alt={`${i+1}`} onClick={e => { e.stopPropagation(); variantZoomFromSelected.current = false; setVariantZoom(url); setVariantZoomScale(1); setVariantPan({ x: 0, y: 0 }) }}
                          style={{ width: imgW, height: imgH, objectFit: 'contain', borderRadius: 8, border: '1px solid #ffffff22', cursor: 'zoom-in' }} />
                        <button onClick={() => { handleSelectVariant(variantOverlay.poseKey, variantOverlay.exprKey, url); setVariantOverlay(null) }}
                          style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 0', width: imgW, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>✅ 선택</button>
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
                    <img src={url} alt="확대" style={{ width: 672, height: 864, objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c55' }} />
                    <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>{poseLabel} / {exprLabel}</span>
                    <div style={{ color: '#ffffff55', fontSize: 12 }}>클릭하면 목록으로 돌아갑니다</div>
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
                          <img src={url} alt={`자세${i+1}`} style={{ ...IS.enlargedImg, cursor: 'zoom-in' }}
                            onClick={() => setEnlargedPoseIdx(i)} />
                          <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>{poseLabel} / {exprLabel}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                  <div style={{ color: '#ffffff44', fontSize: 12 }}>사진 클릭으로 2배 확대 · 바깥 클릭으로 닫기</div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c44', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p style={PR.subtitle}>이미지 스튜디오</p>
          <h2 style={PR.name}>{nickname}</h2>
          {isEdit && (
            <button style={{ background: 'transparent', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => setPhase('form')}>← 기본 정보 수정</button>
          )}
          {profileImages[0] && (
            <img src={profileImages[0]} style={{ width: 330, height: 420, objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c44', cursor: 'zoom-in' }} alt="대표" onClick={() => setEnlargedProfile(true)} />
          )}

          {/* 표정 5장 */}
          <div style={IS.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={IS.sectionTitle}>😊 표정 이미지 (5장)</div>
              {expressionSets.length > 1 && (
                <span style={{ color: '#c9a84c', fontSize: 12 }}>세트 {selectedExprSet + 1} 선택됨</span>
              )}
            </div>
            {expressionSets.length > 0 ? (
              <>
                {expressionSets.length > 1 && (
                  <div style={IS.setTabs}>
                    {expressionSets.map((_, i) => (
                      <button key={i} style={{ ...IS.setTab, ...(i === selectedExprSet ? IS.setTabActive : {}) }}
                        onClick={() => setSelectedExprSet(i)}>세트 {i + 1}</button>
                    ))}
                  </div>
                )}
                <div style={{ ...IS.thumbRow, cursor: 'zoom-in' }} onClick={() => setEnlargedExpr(true)}>
                  {(expressionSets[selectedExprSet] ?? []).map((url, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      {url ? <img src={url} style={IS.thumb} alt={`expr${i}`} /> : <div style={IS.thumbEmpty} />}
                      <span style={{ color: '#ffffff88', fontSize: 13 }}>{CONVERSATION_EXPRESSIONS[i]?.label}</span>
                    </div>
                  ))}
                </div>
                {expressionSets.length > 1 && (
                  <button
                    style={{ background: 'linear-gradient(90deg,#c9a84c,#e94560)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 24px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', marginTop: 4 }}
                    onClick={() => handleSelectExprSet(selectedExprSet)}
                  >✅ 세트 {selectedExprSet + 1} 확정</button>
                )}
              </>
            ) : (
              <p style={IS.hint}>대화 화면에서 사용되는 표정 5종입니다.</p>
            )}
            <button
              style={{ ...IS.genBtn, opacity: (busy || generatingVariants) ? 0.5 : 1 }}
              disabled={busy || generatingVariants}
              onClick={handleGenExpressions}
            >
              {generatingExpr ? `⏳ ${genProgress}` : expressionSets.length > 0 ? '🔄 표정 재생성' : '🎭 표정 5장 생성'}
            </button>
          </div>

          {/* 자세 이미지 — 포즈별 선택 방식 */}
          <div style={IS.section}>
            <div style={IS.sectionTitle}>🔥 자세 이미지 (4자세 × 2표정)</div>
            <p style={IS.hint}>자세를 눌러 흥분 5장 → 1장 선택 → 절정 5장 → 1장 선택하세요.</p>


            {/* 4개 자세 카드 */}
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

              // 각 표정별 버튼 렌더
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
                    {/* 생성/다시 버튼 */}
                    {selectedUrl ? (
                      <button style={{ background: 'none', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 6, padding: '4px 0', width: '100%', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1 }}
                        disabled={busy}
                        onClick={() => {
                          setSelectedPoseImages(prev => { const n = { ...prev }; delete n[`${poseKey}_${exprKey}`]; return n })
                          setActivePoseKey(poseKey); setActiveExprStep(exprKey)
                          handleGenVariants(poseKey, exprKey)
                        }}>🔄 다시</button>
                    ) : isGeneratingThis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', padding: '8px 0' }}>
                        <style>{`@keyframes col-spin2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                        <div style={{ width: 36, height: 36, border: '3px solid #ffffff22', borderTop: '3px solid #c9a84c', borderRadius: '50%', animation: 'col-spin2 0.8s linear infinite' }} />
                        <span style={{ fontSize: 11, color: '#ffffff88', textAlign: 'center' }}>{variantProgress || '배경 생성 중...'}</span>
                        <button style={{ background: '#e9455688', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', width: '100%' }}
                          onClick={handleCancelVariants}>✕ 취소</button>
                      </div>
                    ) : variantUrls.filter(Boolean).length > 0 ? (
                      <button style={{ background: 'none', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 6, padding: '4px 0', width: '100%', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1 }}
                        disabled={busy}
                        onClick={() => {
                          handleGenVariants(poseKey, exprKey)
                        }}>🔄 다시 생성</button>
                    ) : canGenClimax ? (
                      <span style={{ color: '#ffffff33', fontSize: 10 }}>흥분 선택 후</span>
                    ) : (
                      <button style={{ ...IS.genBtn, margin: 0, width: '100%', fontSize: 11, padding: '4px 0', opacity: (busy || (exprKey === 'climax' && !aroused)) ? 0.35 : 1, cursor: (busy || (exprKey === 'climax' && !aroused)) ? 'not-allowed' : 'pointer' }}
                        disabled={busy || (exprKey === 'climax' && !aroused)}
                        onClick={() => handleGenVariants(poseKey, exprKey)}>
                        🔥 생성
                      </button>
                    )}
                  </div>
                )
              }

              return (
                <div key={poseKey} style={{ background: '#ffffff08', borderRadius: 10, padding: '10px 12px', marginBottom: 10, border: done ? '1px solid #c9a84c55' : '1px solid #ffffff11' }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: done ? '#c9a84c' : '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                      {done ? '✅' : '⬜'} {poseLabel}
                    </span>
                  </div>

                  {/* 좌(흥분) / 우(절정) 2분할 */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {renderCol('aroused', '흥분', aroused, arousedVariants, colStyle)}
                    {renderCol('climax', '절정', climax, climaxVariants, colStyleR)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 완료 버튼 */}
          <button
            style={{ ...PR.finalBtn, opacity: busy ? 0.5 : 1, width: '100%' }}
            disabled={busy}
            onClick={handleSaveAndComplete}
          >
            {generating ? `⏳ ${genProgress}` : '💾 저장하고 완료'}
          </button>
          <p style={{ color: '#ffffff33', fontSize: 11 }}>표정·자세 없이도 저장 가능. 나중에 추가할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  // 2단계: 프로필 이미지 선택 화면
  if (phase === 'profile_review') {
    const activeImg = profileImages[selectedProfileIdx]
    const mainImgH = Math.min(Math.round(window.innerHeight * 0.55), 520)
    const mainImgW = Math.round(mainImgH * 3 / 4)
    const thumbH = Math.min(Math.round(window.innerHeight * 0.12), 100)
    const thumbW = Math.round(thumbH * 3 / 4)
    return (
      <div style={S.container}>
        {/* 확정 확인 모달 */}
        {confirmingProfile && (
          <div style={PR.overlay} onClick={() => setConfirmingProfile(false)}>
            <div style={PR.confirmBox} onClick={e => e.stopPropagation()}>
              <p style={PR.confirmTitle}>이 이미지로 확정할까요?</p>
              <img src={activeImg} style={PR.confirmPreview} alt="선택" />
              <p style={PR.confirmSub}>확정 후 이 얼굴 기반으로 표정·자세 이미지가 생성됩니다.</p>
              <div style={PR.confirmBtns}>
                <button style={PR.cancelBtn} onClick={() => setConfirmingProfile(false)}>취소</button>
                <button style={PR.okBtn} onClick={handleFinalizeProfile}>✅ 이걸로 확정</button>
              </div>
            </div>
          </div>
        )}

        <div style={PR.card}>
          <p style={PR.subtitle}>{generating ? `대표 이미지 생성 중... (${genProgress})` : '마음에 드는 이미지를 선택해주세요'}</p>
          <h2 style={PR.name}>{nickname}</h2>
          <p style={PR.meta}>{age}세 · {married} · {job} · {location}</p>

          {/* 메인 이미지 — 인-플레이스 휠줌 + 드래그 */}
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
              ? <img src={activeImg} alt="프로필" draggable={false}
                  style={{ ...PR.mainImg, width: mainImgW, height: mainImgH, transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s', cursor: 'inherit' }} />
              : <div style={{ ...PR.imgPlaceholder, width: mainImgW, height: mainImgH }}>생성 중...</div>
            }
          </div>

          {/* 전체화면 모달 */}
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
                <img src={activeImg} alt="확대" draggable={false} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '2px solid #c9a84c55', transform: `translate(${profilePan.x}px, ${profilePan.y}px) scale(${profileZoomScale})`, transformOrigin: 'center', transition: profileDragRef.current ? 'none' : 'transform 0.05s' }} />
              </div>
              <div style={{ color: '#ffffff44', fontSize: 12, marginTop: 12 }}>휠: 확대/축소 · 드래그: 이동 · 바깥 클릭으로 닫기</div>
            </div>
          )}

          {/* 썸네일 (2장 이상) */}
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

          {/* 재생성 / 취소 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', maxWidth: 280 }}>
            <button
              style={{ ...PR.regenBtn, opacity: generating ? 0.5 : 1, width: '100%' }}
              disabled={generating}
              onClick={handleRegenProfile}
            >
              {generating ? `⏳ 생성 중 ${genProgress}` : '🔄 5장 재생성'}
            </button>
            {generating && (
              <button
                style={{ background: '#e9455688', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 20px', fontSize: 12, cursor: 'pointer', width: '100%' }}
                onClick={handleCancelProfile}
              >✕ 취소</button>
            )}
          </div>

          {/* 확정 버튼 */}
          {activeImg && !generating && (
            <button style={{ ...PR.finalBtn, width: '100%', maxWidth: 280 }} onClick={() => setConfirmingProfile(true)}>
              ✅ 이 이미지로 확정 → 표정·자세 생성
            </button>
          )}

          <button style={PR.backBtn} onClick={() => setPhase('form')}>← 폼으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.container}>
      <div style={S.inner}>
        {/* 헤더 */}
        <div style={S.header}>
          <button style={S.backBtn} onClick={onBack}>← 뒤로</button>
          <h1 style={S.title}>👑 여성 캐릭터 생성</h1>
          <p style={S.subtitle}>창조자 전용 — 플레이어에게 공개됩니다</p>
        </div>

        <div style={S.twoCol}>
        {/* 왼쪽 — 캐릭터 정보 */}
        <div style={S.leftCol}>
        {/* 기본 정보 */}
        <div style={S.card}>
          <div style={S.cardTitle}>📋 기본 정보</div>
          <div style={S.row}>
            <label style={S.label}>닉네임</label>
            <input style={S.input} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="10자 이내, 실명 불가" maxLength={10} />
          </div>
          <div style={S.row}>
            <label style={S.label}>나이</label>
            <input style={{ ...S.input, width: 80 }} type="number" value={age} onChange={e => setAge(e.target.value)} min={20} max={49} />
            <span style={S.hint}>{parseInt(age) < 30 ? '20대' : parseInt(age) < 40 ? '30대' : '40대'}</span>
          </div>
          <div style={S.row}>
            <label style={S.label}>결혼여부</label>
            <div style={S.chips}>
              {MARRIED_TYPES.map(m => (
                <button key={m} style={{ ...S.chip, ...(married === m ? S.chipActive : {}) }} onClick={() => setMarried(m)}>{m}</button>
              ))}
            </div>
          </div>
          <div style={S.row}>
            <label style={S.label}>직업</label>
            <input style={S.input} value={job} onChange={e => setJob(e.target.value)} placeholder="예) 간호사, 바리스타" />
          </div>
          <div style={S.row}>
            <label style={S.label}>배치 장소</label>
            <select style={S.select} value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l} value={l} style={{ background: '#1a0a2e', color: '#fff' }}>{l}</option>)}
            </select>
          </div>
          <div style={S.row}>
            <label style={S.label}>체형</label>
            <div style={S.chips}>
              {BODY_TYPES.map(b => (
                <button key={b} style={{ ...S.chip, ...(bodyType === b ? S.chipActive : {}) }} onClick={() => setBodyType(b)}>{b}</button>
              ))}
            </div>
          </div>
          <div style={S.row}>
            <label style={S.label}>자기소개 <span style={{ color: '#ffffff33', fontSize: 11 }}>자동생성</span></label>
            <div style={{ ...S.textarea, minHeight: 48, color: autoIntro ? '#ffffffcc' : '#ffffff33', fontSize: 13, padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
              {autoIntro || '기본 정보와 관심사를 입력하면 자동으로 생성됩니다.'}
            </div>
          </div>
        </div>

        {/* 외모 스탯 */}
        <div style={S.card}>
          <div style={S.cardTitle}>💄 외모 스탯</div>
          {/* 키 — 별도 cm 값 */}
          <div style={S.sliderRow}>
            <span style={{ ...S.sliderLabel, color: '#4FC3F7' }}>키</span>
            <input type="range" min={140} max={185} step={5} value={heightCm}
              onChange={e => setHeightCm(Number(e.target.value))} style={S.slider} />
            <span style={{ ...S.sliderVal, color: '#4FC3F7', minWidth: 52 }}>{heightCm}cm</span>
          </div>
          {/* 얼굴/몸매/패션 — 합계 180 고정, 패션 자동 */}
          <div style={S.poolNote}>얼굴 + 몸매 + 패션 합계 {LOOK_TOTAL}pt 고정 · 패션 자동조정</div>
          {[
            { label: '얼굴', value: face, key: 'face' as const, color: '#FF6B9D' },
            { label: '몸매', value: body, key: 'body' as const, color: '#FF5722' },
            { label: '패션', value: fashion, key: 'auto' as const, color: '#c9a84c' },
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

        {/* 관심사 */}
        <div style={S.card}>
          <div style={S.cardTitle}>💬 관심사 설정</div>
          <div style={S.tagSection}>
            <div style={S.tagLabel}>관심사 태그 <span style={S.tagLimit}>(최대 5개)</span></div>
            <div style={S.tagGrid}>
              {INTEREST_TAGS.map(t => (
                <button key={t} style={{ ...S.tag, ...(interestTags.includes(t) ? S.tagActive : {}) }}
                  onClick={() => toggleTag(t, interestTags, setInterestTags, 5)}>{t}</button>
              ))}
            </div>
            <input style={{ ...S.input, marginTop: 8 }} value={interestCustom} onChange={e => setInterestCustom(e.target.value)} placeholder="직접입력 (최대 2개, 쉼표 구분)" />
          </div>
          <div style={S.tagSection}>
            <div style={S.tagLabel}>싫어하는 것 <span style={S.tagLimit}>(최대 5개)</span></div>
            <div style={S.tagGrid}>
              {DISLIKE_TAGS.map(t => (
                <button key={t} style={{ ...S.tag, ...(dislikeTags.includes(t) ? S.tagActiveRed : {}) }}
                  onClick={() => toggleTag(t, dislikeTags, setDislikeTags, 5)}>{t}</button>
              ))}
            </div>
            <input style={{ ...S.input, marginTop: 8 }} value={dislikeCustom} onChange={e => setDislikeCustom(e.target.value)} placeholder="직접입력 (최대 1개)" />
          </div>
        </div>

        {/* 성격 슬라이더 */}
        <div style={S.card}>
          <div style={S.cardTitle}>🧠 성격 설정</div>
          {[
            { key: 'introvert' as const, label: '내성', left: '내성적', right: '외향적', color: '#4FC3F7' },
            { key: 'indirect' as const, label: '화법', left: '우회적', right: '직설적', color: '#66BB6A' },
            { key: 'friendly' as const, label: '태도', left: '친근함', right: '도도함', color: '#FF9800' },
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
          <div style={S.row}>
            <label style={S.label}>창조자 메모 <span style={S.hint}>(선택)</span></label>
            <textarea style={S.textarea} value={memo} onChange={e => setMemo(e.target.value)} placeholder="AI 대화에 직접 주입되는 메모 (100자 이내)" maxLength={100} rows={2} />
          </div>
        </div>

        {/* 성감대 — 숨김 스탯 */}
        <div style={{ ...S.card, borderColor: '#e9456033' }}>
          <div style={S.cardTitle}>🔞 성감대 설정 <span style={S.hiddenBadge}>플레이어 비공개</span></div>

          {/* 일반 성감대 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ffffff88', fontSize: 11 }}>일반 성감대 · 0=거부 · 최대5 · 가슴 자동</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: (Object.values(genEro).reduce((a,b)=>a+b,0) + breast) === GEN_TOTAL ? '#c9a84c' : '#e94560' }}>
              {Object.values(genEro).reduce((a,b)=>a+b,0) + breast} / {GEN_TOTAL}pt
            </span>
          </div>
          {/* 입·입술, 목·귀 — 가슴 위 */}
          {(['mouth','neckEar'] as const).map(key => {
            const labelMap = { mouth:'입·입술', neckEar:'목·귀' }
            const val = genEro[key]; const color = sensColor(val)
            return (
              <div key={key} style={S.erogenousRow}>
                <span style={S.eroLabel}>{labelMap[key]}</span>
                <input type="range" min={0} max={5} step={1} value={val}
                  onChange={e => setGenEro(key, Number(e.target.value))} style={S.slider} />
                <span style={{ color, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })}
          {/* 가슴 — 자동 */}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor(breast) }}>가슴 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${(breast/5)*100}%`, background: sensColor(breast) }} /></div>
            <span style={{ color: sensColor(breast), fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{breast}</span>
          </div>
          {/* 허벅지, 항문 — 가슴 아래 */}
          {(['thigh','anal'] as const).map(key => {
            const labelMap = { thigh:'허벅지', anal:'항문' }
            const val = genEro[key]; const color = sensColor(val)
            return (
              <div key={key} style={S.erogenousRow}>
                <span style={S.eroLabel}>{labelMap[key]}</span>
                <input type="range" min={0} max={5} step={1} value={val}
                  onChange={e => setGenEro(key, Number(e.target.value))} style={S.slider} />
                <span style={{ color, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })}

          {/* 핵심 성감대 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── 핵심 성감대 ──</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ffffff88', fontSize: 11 }}>각 min 2 · 범위 0~10 · 질내부 자동</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: (clitoris + vagina) === CORE_TOTAL ? '#c9a84c' : '#e94560' }}>
              {clitoris + vagina} / {CORE_TOTAL}pt
            </span>
          </div>
          {/* 클리토리스 */}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor10(clitoris) }}>클리토리스</span>
            <input type="range" min={CORE_MIN} max={CORE_MAX} step={1} value={clitoris}
              onChange={e => setClitoris(Math.min(CORE_MAX, Math.max(CORE_MIN, Number(e.target.value))))} style={S.slider} />
            <span style={{ color: sensColor10(clitoris), fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center', flexShrink: 0 }}>{clitoris}</span>
          </div>
          {/* 질내부 — 자동 */}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: sensColor10(vagina) }}>질 내부 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((vagina - CORE_MIN) / (CORE_MAX - CORE_MIN)) * 100}%`, background: sensColor10(vagina) }} /></div>
            <span style={{ color: sensColor10(vagina), fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center', flexShrink: 0 }}>{vagina}</span>
          </div>

          {/* 여캐 자신의 S/M 성향 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── 나의 S/M 성향 ──</div>
          <div style={{ color: '#ffffff44', fontSize: 11, marginBottom: 6 }}>← M (복종·수동적) &nbsp;|&nbsp; S (지배·주도적) →</div>
          {SmSlider(smTendency, setSmTendency)}
        </div>

        </div>{/* /leftCol */}

        {/* 오른쪽 — 남성 선호도 */}
        <div style={S.rightCol}>
        {/* 남성 선호도 — 숨김 스탯 */}
        <div style={{ ...S.card, borderColor: '#c9a84c33' }}>
          <div style={S.cardTitle}>💛 선호하는 남성 <span style={S.hiddenBadge}>플레이어 비공개</span></div>

          {/* 나이 선호 */}
          <div style={S.prefSectionLabel}>나이 선호 <span style={S.prefTotal}>{prefAge20+prefAge30+prefAge40} / 100</span></div>
          {([['20대', prefAge20, 'age20'], ['30대', prefAge30, 'age30']] as const).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={AGE_MIN} max={PREF_TOTAL - AGE_MIN * 2} step={5} value={val}
                onChange={e => setPrefAgeVal(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>40대 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${prefAge40}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefAge40}</span>
          </div>

          {/* 재력 선호 — 독립 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── 재력 선호 ──</div>
          <div style={S.erogenousRow}>
            <span style={S.eroLabel}>재력선호</span>
            <input type="range" min={20} max={100} step={5} value={prefWealth}
              onChange={e => setPrefWealth(Number(e.target.value))} style={S.slider} />
            <span style={S.prefVal}>{prefWealth}</span>
          </div>

          {/* S1 외모 선호 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── S1 외모 선호 ──</div>
          <div style={S.prefSectionLabel}>합계 <span style={S.prefTotal}>{prefFace+prefHeight+prefBodyLook+prefFashion} / 100</span></div>
          {([['얼굴', prefFace, 'face'], ['키', prefHeight, 'height'], ['몸매', prefBodyLook, 'bodyLook']] as [string,number,'face'|'height'|'bodyLook'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={LOOK_PREF_MIN} max={LOOK_PREF_MAX} step={5} value={val}
                onChange={e => setPrefLook(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>패션 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefFashion - LOOK_PREF_MIN) / (LOOK_PREF_MAX - LOOK_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefFashion}</span>
          </div>

          {/* S2 성격 선호 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── S2 성격 선호 ──</div>
          <div style={S.prefSectionLabel}>합계 <span style={S.prefTotal}>{prefIntel+prefHumor+prefVirtue+prefManner} / 100</span></div>
          {([['지적능력', prefIntel, 'intel'], ['유머', prefHumor, 'humor'], ['덕성', prefVirtue, 'virtue']] as [string,number,'intel'|'humor'|'virtue'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={PERS_PREF_MIN} max={PERS_PREF_MAX} step={5} value={val}
                onChange={e => setPrefPersonality(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>매너 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefManner - PERS_PREF_MIN) / (PERS_PREF_MAX - PERS_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefManner}</span>
          </div>
          {/* S3 발기 선호 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── S3 성기 선호 ──</div>
          <div style={S.prefSectionLabel}>합계 <span style={S.prefTotal}>{prefPower+prefDuration+prefHardness+prefTech} / 100</span></div>
          {([['발기력', prefPower, 'power'], ['지속력', prefDuration, 'duration'], ['단단함', prefHardness, 'hardness']] as [string,number,'power'|'duration'|'hardness'][]).map(([label, val, key]) => (
            <div key={key} style={S.erogenousRow}>
              <span style={S.eroLabel}>{label}</span>
              <input type="range" min={ERECT_PREF_MIN} max={ERECT_PREF_MAX} step={5} value={val}
                onChange={e => setPrefErect(key, Number(e.target.value))} style={S.slider} />
              <span style={S.prefVal}>{val}</span>
            </div>
          ))}
          <div style={S.erogenousRow}>
            <span style={{ ...S.eroLabel, color: '#ffffff66' }}>테크닉 (자동)</span>
            <div style={S.autoBar}><div style={{ ...S.autoFill, width: `${((prefTech - ERECT_PREF_MIN) / (ERECT_PREF_MAX - ERECT_PREF_MIN)) * 100}%`, background: '#c9a84c' }} /></div>
            <span style={S.prefVal}>{prefTech}</span>
          </div>

          {/* 선호 자세 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── 선호 자세 (−5 비선호 / +5 선호) ──</div>

          {([
            ['정상위','missionary'],['후배위','doggy'],
            ['여성상위','cowgirl'],['좌위','side'],
          ] as [string, keyof typeof prefPose][]).map(([label, key]) => {
            const val = prefPose[key]
            const poseColor = val > 0 ? '#c9a84c' : val < 0 ? '#e94560' : '#ffffff44'
            return (
              <div key={key} style={S.erogenousRow}>
                <span style={{ ...S.eroLabel, color: poseColor }}>{label}</span>
                <input type="range" min={-5} max={5} step={1} value={val}
                  onChange={e => setPose(key, Number(e.target.value))} style={{ ...S.slider, accentColor: poseColor }} />
                <span style={{ color: poseColor, fontWeight: 'bold', fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {val > 0 ? `+${val}` : val}
                </span>
              </div>
            )
          })}

          {/* 선호 남성 S/M 성향 */}
          <div style={{ ...S.eroDivider, marginTop: 10 }}>── 선호하는 남성 S/M 성향 (자동) ──</div>
          <div style={{ color: '#ffffff44', fontSize: 11, marginBottom: 6 }}>나의 성향과 반대로 자동 설정됩니다</div>
          <div style={{ pointerEvents: 'none', opacity: 0.7 }}>
            {SmSlider(prefSmTendency, () => {})}
          </div>
        </div>

        {/* 외모 설명 */}
        <div style={{ ...S.card, borderColor: '#4FC3F733', marginTop: 0 }}>
          <div style={S.cardTitle}>🎨 외모 설명 <span style={{ color: '#ffffff44', fontSize: 12, fontWeight: 'normal' }}>이미지 생성에 반영됩니다</span></div>

          {/* 머리색 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>머리색</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: '흑발', val: 'black hair' },
                { label: '갈색', val: 'dark brown hair' },
                { label: '밝은 갈색', val: 'light brown hair' },
                { label: '금발', val: 'blonde hair' },
                { label: '빨간색', val: 'red hair' },
                { label: '분홍', val: 'pink hair' },
              ].map(({ label, val }) => (
                <button key={val}
                  style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: hairColor === val ? '1.5px solid #c9a84c' : '1px solid #ffffff33', background: hairColor === val ? '#c9a84c22' : 'transparent', color: hairColor === val ? '#c9a84c' : '#ffffff88' }}
                  onClick={() => setHairColor(hairColor === val ? '' : val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 머리 길이 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>머리 길이</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: '짧은 머리', val: 'short hair' },
                { label: '단발', val: 'bob cut hair' },
                { label: '긴 머리', val: 'long hair' },
              ].map(({ label, val }) => (
                <button key={val}
                  style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: hairLength === val ? '1.5px solid #c9a84c' : '1px solid #ffffff33', background: hairLength === val ? '#c9a84c22' : 'transparent', color: hairLength === val ? '#c9a84c' : '#ffffff88' }}
                  onClick={() => setHairLength(hairLength === val ? '' : val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 추가 설명 */}
          <div style={{ color: '#ffffff88', fontSize: 12, marginBottom: 6 }}>추가 설명 (선택)</div>
          <textarea
            style={{ ...S.textarea, minHeight: 60 }}
            value={appearanceDesc}
            onChange={e => setAppearanceDesc(e.target.value)}
            placeholder="예) wavy hair, small lips, tattoo, fair skin..."
            maxLength={200}
            rows={2}
          />
          <span style={{ color: '#ffffff33', fontSize: 11 }}>{appearanceDesc.length}/200자</span>
          <span style={{ color: '#FF9800', fontSize: 11, marginLeft: 8 }}>⚠️ 추가 설명은 영어로 입력</span>
        </div>

        {error && <p style={S.error}>{error}</p>}
        <button
          style={{ ...S.completeBtn, opacity: generating ? 0.7 : 1, cursor: generating ? 'not-allowed' : 'pointer' }}
          onClick={handleComplete}
          disabled={generating}
        >
          {generating ? `🎨 ${genProgress || '이미지 생성 중...'}` : '✅ 캐릭터 등록'}
        </button>
        {generating && (
          <button
            style={{ marginTop: 8, width: '100%', background: '#e9455688', border: 'none', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer' }}
            onClick={handleCancelProfile}
          >✕ 취소</button>
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

const PR: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  enlargeOverlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' },
  enlargedImg: { maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '2px solid #c9a84c55' },
  confirmBox: { background: '#1a1a2e', border: '1px solid #c9a84c55', borderRadius: 16, padding: '28px 24px', width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  confirmTitle: { color: '#c9a84c', fontSize: 15, fontWeight: 'bold', margin: 0, textAlign: 'center' as const },
  confirmPreview: { width: 140, height: 182, objectFit: 'cover', borderRadius: 10, border: '2px solid #c9a84c44' },
  confirmSub: { color: '#ffffff66', fontSize: 12, margin: 0, textAlign: 'center' as const },
  confirmBtns: { display: 'flex', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #ffffff33', color: '#ffffff88', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer' },
  okBtn: { flex: 1, background: 'linear-gradient(90deg, #c9a84c, #e94560)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer' },
  card: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 24px 80px', gap: 16 },
  subtitle: { color: '#ffffff55', fontSize: 13, margin: 0 },
  name: { color: '#c9a84c', fontSize: 26, fontWeight: 'bold', margin: 0 },
  meta: { color: '#ffffff66', fontSize: 13, margin: 0 },
  imgWrap: { background: 'rgba(0,0,0,0.3)', border: '1px solid #ffffff11', borderRadius: 16, padding: 12 },
  mainImg: { width: 220, height: 286, objectFit: 'cover', borderRadius: 12, border: '2px solid #c9a84c44', display: 'block' },
  imgPlaceholder: { width: 220, height: 286, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff33', fontSize: 13 },
  thumbRow: { display: 'flex', gap: 8 },
  thumb: { width: 60, height: 78, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' },
  regenBtn: { background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c55', color: '#c9a84c', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' },
  finalBtn: { background: 'linear-gradient(90deg, #c9a84c, #e94560)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 'bold', cursor: 'pointer' },
  backBtn: { background: 'transparent', border: '1px solid #ffffff22', color: '#ffffff55', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
}

const S: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)',
    display: 'flex', justifyContent: 'center', padding: '24px 16px',
  },
  inner: { width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 16 },
  header: { textAlign: 'center', padding: '8px 0 4px' },
  backBtn: {
    background: 'transparent', border: '1px solid #ffffff22', color: '#ffffff66',
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 12,
  },
  title: { color: '#c9a84c', fontSize: 24, fontWeight: 'bold', margin: '0 0 4px' },
  subtitle: { color: '#ffffff44', fontSize: 12, margin: 0 },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c22',
    borderRadius: 16, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardTitle: { color: '#c9a84c', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { color: '#ffffff88', fontSize: 13, minWidth: 72, flexShrink: 0 },
  hint: { color: '#ffffff44', fontSize: 12 },
  input: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14,
    outline: 'none', flex: 1, minWidth: 0,
  },
  textarea: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
    outline: 'none', flex: 1, resize: 'none', fontFamily: 'inherit',
  },
  select: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14,
    outline: 'none', flex: 1,
  },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
    borderRadius: 20, padding: '5px 14px', color: '#ffffff66', fontSize: 13, cursor: 'pointer',
  },
  chipActive: { background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c', color: '#c9a84c' },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 10 },
  sliderLabel: { fontWeight: 'bold', fontSize: 13, minWidth: 36 },
  slider: { flex: 1, accentColor: '#c9a84c' },
  sliderVal: { fontWeight: 'bold', fontSize: 14, minWidth: 28, textAlign: 'right' },
  tagSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  tagLabel: { color: '#ffffff88', fontSize: 13 },
  tagLimit: { color: '#ffffff44', fontSize: 11 },
  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid #ffffff22',
    borderRadius: 20, padding: '4px 12px', color: '#ffffff66', fontSize: 12, cursor: 'pointer',
  },
  tagActive: { background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c', color: '#c9a84c' },
  tagActiveRed: { background: 'rgba(233,69,96,0.2)', border: '1px solid #e94560', color: '#e94560' },
  personalityRow: { display: 'flex', alignItems: 'center', gap: 8 },
  persLabel: { fontWeight: 'bold', fontSize: 12, minWidth: 28 },
  persEdge: { color: '#ffffff44', fontSize: 11, minWidth: 36, textAlign: 'center' },
  hiddenBadge: {
    background: 'rgba(233,69,96,0.2)', border: '1px solid #e9456055',
    borderRadius: 20, padding: '2px 10px', color: '#e94560', fontSize: 11, marginLeft: 8,
  },
  poolNote: { color: '#ffffff33', fontSize: 11, marginBottom: 4 },
  autoBar: { flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  autoFill: { height: '100%', borderRadius: 3, transition: 'width 0.2s' },
  erogenousNote: { color: '#ffffff44', fontSize: 11, margin: '0 0 4px' },
  erogenousRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  erogenousLabel: { fontWeight: 'bold', fontSize: 13, minWidth: 72 },
  erogenousNote2: { color: '#ffffff33', fontSize: 10, minWidth: 0 },
  eroLabel: { fontWeight: 'bold', fontSize: 11, width: 72, flexShrink: 0, color: '#ffffffcc' },
  eroDivider: { textAlign: 'center' as const, color: '#c9a84c88', fontSize: 11, margin: '8px 0 4px' },
  segments: { display: 'flex', gap: 3, flex: 1 },
  segment: { flex: 1, height: 20, borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s' },
  erogenousBarWrap: { flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  erogenousBarFill: { height: '100%', borderRadius: 4, transition: 'width 0.15s' },
  twoCol: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  leftCol: { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 },
  rightCol: { width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 },
  prefSectionLabel: { fontSize: 11, color: '#ffffff88', margin: '2px 0 2px', display: 'flex', justifyContent: 'space-between' as const },
  prefTotal: { fontWeight: 'bold', color: '#c9a84c', fontSize: 12 },
  prefVal: { fontWeight: 'bold', fontSize: 13, width: 24, textAlign: 'center' as const, flexShrink: 0, color: '#ffffffcc' },
  error: { color: '#e94560', fontSize: 13, textAlign: 'center', margin: 0 },
  completeBtn: {
    background: 'linear-gradient(135deg, #c9a84c, #e94560)',
    border: 'none', borderRadius: 12, padding: '16px',
    color: '#fff', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginTop: 8,
  },
}
