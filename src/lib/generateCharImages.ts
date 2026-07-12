import type { FemaleCharacterData } from '../pages/FemaleCharacterCreatePage'
import { supabase } from './supabase'

const RUNPOD_API_KEY = import.meta.env.VITE_RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = import.meta.env.VITE_RUNPOD_ENDPOINT_ID
const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`

// ─── 상수 ───────────────────────────────────────────────────────────────────

const CONVERSATION_EXPRESSIONS = [
  { key: 'calm',         label: '평온',   expr: 'calm neutral expression, relaxed, gentle smile' },
  { key: 'happy',        label: '기쁨',   expr: 'bright happy smile, joyful expression, eyes curved with joy' },
  { key: 'shy',          label: '수줍음', expr: 'shy embarrassed expression, slight blush, soft smile, looking away' },
  { key: 'disappointed', label: '실망',   expr: 'disappointed sad expression, slight frown, downcast eyes' },
  { key: 'eager',        label: '기대',   expr: 'excited eager expression, wide sparkling eyes, anticipating smile' },
]

const POSE_EXPRESSIONS = [
  { key: 'aroused', label: '흥분', arousal: 'aroused expression, flushed red cheeks, heavy breathing, mouth slightly open, eyes open looking at camera, light sweat on skin, erect nipples' },
  { key: 'climax',  label: '절정', arousal: 'closed eyes, eyes shut, mouth wide open, ahegao climax face, orgasm expression, both eyes tightly closed shut, head thrown back neck exposed, mouth open wide in moan, lips parted wide, tongue visible, chin up head tilted back, deep red flushed face, body trembling, sweat on skin, ecstasy face' },
]

const EXPRESSION_LEVELS = CONVERSATION_EXPRESSIONS.map(e => ({ key: e.key, label: e.label, arousal: e.expr }))

const SOLO_FEMALE = 'solo female, 1girl, no male, no man, no penis, no male body parts, male completely out of frame, only woman in frame'

const POSES = [
  {
    key: 'missionary', label: '정상위',
    pose: `${SOLO_FEMALE}, completely nude Korean woman lying on her back on bed, M字開脚, M-shaped legs spread wide, legs raised high and spread apart, soles of feet visible at top corners of frame, vagina and labia fully exposed at center of frame, breasts visible on chest, both arms bent behind head, elbows out to sides, hands clasped behind head, face at top looking down toward camera, camera positioned between her legs looking up toward her face, low angle shot from between legs, feet and pussy close to camera, full body visible lying on back, explicit nude adult photography`,
  },
  {
    key: 'doggy', label: '후배위',
    pose: `${SOLO_FEMALE}, completely nude Korean woman in doggy style sex position, on all fours on bed, back facing camera, facing away from viewer, ass toward camera, large round buttocks prominently shown toward camera filling frame, arched back, spine visible, vagina and labia fully exposed between spread legs, head pointing away from camera, no face visible, rear view from behind, camera directly behind her at ass level, explicit nude adult photography`,
  },
  {
    key: 'cowgirl', label: '여성상위',
    pose: `${SOLO_FEMALE}, spread pussy, vagina fully exposed and visible, completely nude Korean woman in cowgirl position, sitting upright facing camera, both hands placed on own thighs in front of body, hands resting on knees visible in frame, legs spread wide apart, pussy clearly visible between open thighs, face and hair visible at top, large breasts center, explicit vagina fully shown at bottom of frame, explicit nude adult photography`,
  },
  {
    key: 'side', label: '버터플라이',
    pose: `${SOLO_FEMALE}, completely nude Korean woman lying on her back on bed, both legs stretched straight out and spread wide apart in V shape, legs fully extended no bending, wide leg split, vagina and labia fully exposed between spread straight legs, hands resting on bed beside hips, large breasts visible, face looking at camera, camera positioned above looking down, explicit nude adult photography`,
  },
]

const COMMON_NEG = 'black and white, grayscale, monochrome, desaturated, colorless, no color, greyscale, blurry, bad anatomy, watermark, text, logo, low quality, deformed, anime, cartoon, 3d render, painting, illustration, drawing, cgi, art, sketch, bad hands, extra fingers, missing fingers, extra limbs, malformed limbs, fused fingers, mutated hands'
const NEG_CLOTHED = `nude, naked, nsfw, ${COMMON_NEG}`
const NEG_NUDE = `clothes, underwear, bra, panties, censored, ${COMMON_NEG}`

export const POSE_BACKGROUNDS = [
  { key: 'bed',     label: '침대',   bg: 'luxury hotel bedroom, white bed sheets on king size bed, soft pillows, warm ambient lighting' },
  { key: 'sofa',    label: '소파',   bg: 'living room, plush velvet sofa, dim warm lighting, luxury interior' },
  { key: 'bath',    label: '욕실',   bg: 'luxury bathroom, marble tiles, large bathtub, soft bathroom lighting, steam atmosphere' },
  { key: 'office',  label: '사무실', bg: 'private office interior, desk in background, dim office lighting, blinds on window' },
  { key: 'floor',   label: '바닥',   bg: 'bedroom floor, soft carpet, dim room lighting, indoor setting' },
]

const LOCATION_BG: Record<string, string> = {
  '대학교': 'university campus background, lecture hall, college hallway',
  '도서관': 'library background, bookshelves, reading room',
  '병원': 'hospital corridor background, white medical interior',
  '약국': 'pharmacy background, medicine shelves',
  '공공기관': 'government office background, official interior',
  '경찰서': 'police station background, office interior',
  '헬스장': 'gym background, fitness equipment, workout studio',
  '카페': 'cozy cafe background, coffee shop interior, warm lighting',
  '쇼핑몰': 'shopping mall background, fashion store interior',
  '공원': 'park background, trees, outdoor daytime',
  '노래방': 'karaoke room background, colorful lights, microphone',
  '해변': 'beach background, ocean, sunny day',
  '비행장': 'airport background, terminal interior',
  '회사': 'office background, corporate interior, desk',
  '레스토랑': 'restaurant background, dining interior, warm lighting',
  '고급레스토랑': 'luxury restaurant background, fine dining, elegant interior',
  '바': 'bar background, night bar interior, ambient lighting',
  '클럽': 'nightclub background, dark club interior, neon lights',
  '호텔': 'hotel room background, elegant hotel interior',
}

const LOCATION_OUTFIT: Record<string, string> = {
  '대학교': 'student outfit, hoodie and jeans',
  '도서관': 'librarian outfit, blouse and skirt',
  '병원': 'nurse uniform',
  '약국': 'pharmacist outfit, white coat',
  '공공기관': 'formal office outfit, blouse and pencil skirt',
  '경찰서': 'police uniform',
  '헬스장': 'gym sportswear',
  '카페': 'cafe outfit, blouse and skirt',
  '쇼핑몰': 'casual trendy outfit',
  '공원': 'casual summer outfit',
  '노래방': 'casual dress',
  '해변': 'swimsuit',
  '비행장': 'flight attendant uniform',
  '회사': 'office lady outfit, blouse and pencil skirt',
  '레스토랑': 'elegant dress',
  '고급레스토랑': 'evening gown',
  '바': 'cocktail dress',
  '클럽': 'club dress',
  '호텔': 'satin slip dress',
}

const HOTEL_BG_PROMPT = 'luxury hotel bedroom, king size bed with white sheets, dim warm lighting, bedside lamp, elegant interior, no people, RAW photo, 8k uhd, DSLR, high quality, photorealistic'

// ─── 유틸 함수 ───────────────────────────────────────────────────────────────

function buildLocationBg(location?: string): string {
  if (!location) return 'indoor background, soft lighting'
  return LOCATION_BG[location] ?? 'indoor background, soft lighting'
}

function buildOutfit(location: string | undefined, fashion: number): string {
  const base = LOCATION_OUTFIT[location ?? ''] ?? 'casual outfit'
  if (fashion >= 80) return `${base}, very short hemline, deep neckline, midriff exposed`
  if (fashion >= 60) return `${base}, short hemline, fitted`
  if (fashion >= 40) return `${base}, knee-length, modest`
  return `${base}, long hemline, fully covered`
}

const KR_TO_EN: [RegExp, string][] = [
  [/안경/g, 'wearing glasses'],
  [/긴\s*머리/g, 'long hair'], [/단발/g, 'bob cut hair'], [/짧은\s*머리/g, 'short hair'],
  [/웨이브/g, 'wavy hair'], [/생머리/g, 'straight hair'], [/곱슬/g, 'curly hair'],
  [/흑발|검은\s*머리/g, 'black hair'], [/금발/g, 'blonde hair'], [/갈색\s*머리/g, 'brown hair'],
  [/빨간\s*머리/g, 'red hair'], [/염색/g, 'dyed hair'],
  [/타투|문신/g, 'tattoo'], [/타투\s*없음|문신\s*없음/g, 'no tattoo'],
  [/주근깨/g, 'freckles'], [/보조개/g, 'dimples'], [/쌍꺼풀/g, 'double eyelid'],
  [/흰\s*피부|하얀\s*피부/g, 'pale white skin'], [/까무잡잡|태닝/g, 'tanned skin'],
  [/통통한?\s*얼굴|얼굴\s*통통/g, 'chubby face, round face'],
  [/갸름한?\s*얼굴/g, 'slim face, sharp jawline'],
  [/큰\s*눈/g, 'big eyes'], [/작은\s*입술/g, 'small lips'], [/도톰한\s*입술/g, 'full lips'],
  [/귀여움|귀여운/g, 'cute'], [/섹시/g, 'sexy'], [/청순/g, 'innocent look'],
  [/근육질/g, 'muscular'], [/슬림/g, 'slim'],
]

function translateAppearance(desc: string): string {
  let result = desc
  for (const [pattern, replacement] of KR_TO_EN) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim()
}

function ageNegative(age: number): string {
  if (age < 30) return 'middle aged, old, wrinkles, mature face, aged, nasolabial folds, crow feet'
  if (age < 40) return 'teenager, baby face, very young face, childlike, 20s, smooth perfect skin, flawless skin, porcelain skin, no pores, glowing youthful skin, old, elderly, deeply wrinkled, 50s, gray hair'
  return 'teenager, baby face, very young face, childlike, 20s, 30s, youthful face, smooth perfect skin, flawless, porcelain skin, no pores, glowing skin, very old, elderly, 60s, deeply wrinkled, gray hair'
}

function bodyTypeNegative(bodyType?: string): string {
  if (bodyType === '슬랜더') return 'large breasts, big breasts, busty, huge breasts, voluptuous, curvy, wide hips, thick thighs, fat, chubby, overweight, plump, thick body'
  if (bodyType === '글래머') return 'flat chest, small breasts, skinny, slender'
  if (bodyType === '베이글') return 'flat chest, small breasts, fat, chubby, large waist'
  if (bodyType === '머슬') return 'fat, chubby, soft body, very large breasts'
  return ''
}

function charSeed(c: FemaleCharacterData): number {
  const str = (c.id ?? '') + (c.nickname ?? '')
  if (!str) return Math.floor(Math.random() * 999999999)
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return (hash % 999999998) + 1
}

function buildBaseDesc(c: FemaleCharacterData, clothed = false) {
  const age = c.age ?? 25
  const is20s = age < 30
  const is30s = age >= 30 && age < 40

  const faceBase = c.face >= 90 ? 'goddess-like stunning face, perfect facial symmetry'
    : c.face >= 75 ? 'gorgeous beautiful face'
    : c.face >= 55 ? 'pretty cute face'
    : c.face >= 40 ? 'average face, natural look'
    : 'plain face, ordinary features'

  const ageFaceDesc = is20s
    ? `${faceBase}, flawless smooth skin, youthful glow, baby-soft skin`
    : is30s
    ? `${faceBase}, mature skin, subtle laugh lines, slight eye wrinkles, refined adult beauty`
    : `${faceBase}, mature aged face, visible laugh lines, crow feet around eyes, forehead lines, elegant mature beauty`

  const bodyScore = c.body ?? 50
  const ageSag = is20s ? 0 : is30s ? 10 : 20
  const effectiveScore = Math.max(0, bodyScore - ageSag)
  const tone = effectiveScore >= 70 ? 'firm and toned'
    : effectiveScore >= 50 ? 'fit and healthy'
    : effectiveScore >= 30 ? 'soft and natural, slightly relaxed'
    : 'soft and saggy, natural aging'

  const ageBodyMod = is20s ? 'perky, youthful'
    : is30s ? 'mature, slightly fuller'
    : 'mature woman body, natural aging curves, slightly fuller waist'

  const bodyDesc = c.bodyType === '글래머'
    ? `voluptuous hourglass body, very large breasts, wide hips, thick thighs, ${tone}, ${ageBodyMod}`
    : c.bodyType === '베이글'
    ? `slim waist, full round breasts, wide hips, ${tone}, ${ageBodyMod}`
    : c.bodyType === '머슬'
    ? `athletic body, firm medium breasts, fit abs, tight curves, ${tone}, ${ageBodyMod}`
    : `slender slim body, small perky breasts, slim narrow waist, slightly narrow hips, long slender legs, ${tone}, ${ageBodyMod}`

  const h = c.heightCm ?? 160
  const heightDesc = h < 155 ? 'very short petite, small frame'
    : h < 163 ? 'short, petite frame'
    : h < 170 ? 'average height'
    : h < 176 ? 'tall, long legs'
    : 'very tall, long legs'

  // short hair / short cut / short bob 등은 유지, 체형/키 관련 short만 제거
  const conflictPattern = /\b(tall|short(?!\s+hair|\s+cut|\s+bob)|petite|slim(?!\s+face)|chubby(?!\s+face|\s+round)|fat|thin|large breast|flat chest|big breast|small breast|curvy|skinny)\b/gi
  const rawExtra = c.appearanceDesc ? translateAppearance(c.appearanceDesc).replace(conflictPattern, '') : ''
  const extraDesc = rawExtra.trim() ? `, ${rawExtra.trim()}` : ''

  const nudeTag = clothed ? 'fully clothed, dressed' : 'completely nude, nsfw'
  return `Korean adult female, ${age}yo, ${ageFaceDesc}, ${bodyDesc}, ${heightDesc}${extraDesc}, ${nudeTag}`
}

// ─── RunPod API 호출 ─────────────────────────────────────────────────────────

const RUNPOD_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${RUNPOD_API_KEY}`,
}

async function cancelRunPodJob(jobId: string): Promise<void> {
  await fetch(`${RUNPOD_BASE}/cancel/${jobId}`, { method: 'POST', headers: RUNPOD_HEADERS })
}

async function callRunPod(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  // 1. job 제출
  const submitRes = await fetch(`${RUNPOD_BASE}/run`, {
    method: 'POST',
    headers: RUNPOD_HEADERS,
    body: JSON.stringify({ input }),
    signal,
  })
  if (!submitRes.ok) throw new Error(`RunPod submit error: ${submitRes.status}`)
  const { id: jobId } = await submitRes.json()
  if (!jobId) throw new Error('RunPod: no job id returned')

  // abort 시 job 취소
  const onAbort = () => cancelRunPodJob(jobId)
  signal?.addEventListener('abort', onAbort)

  try {
    // 2. 완료까지 폴링
    while (true) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      await new Promise(r => setTimeout(r, 2000))
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')

      const statusRes = await fetch(`${RUNPOD_BASE}/status/${jobId}`, { headers: RUNPOD_HEADERS, signal })
      if (!statusRes.ok) throw new Error(`RunPod status error: ${statusRes.status}`)
      const data = await statusRes.json()

      if (data.status === 'COMPLETED') {
        if (data.output?.status === 'failed') throw new Error(data.output.error)
        return data.output.image as string
      }
      if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        throw new Error(`RunPod job ${data.status}: ${data.error ?? JSON.stringify(data)}`)
      }
      // IN_QUEUE / IN_PROGRESS → 계속 폴링
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

// ─── Supabase Storage 업로드 ─────────────────────────────────────────────────

async function uploadToSupabase(base64: string, charId: string, filename: string): Promise<string> {
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  const blob = new Blob([ab], { type: 'image/png' })

  const path = `${charId}/${filename}`
  const { error } = await supabase.storage.from('char-images').upload(path, blob, { upsert: true })
  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  const { data } = supabase.storage.from('char-images').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

// ─── 배경+포즈 합성 ──────────────────────────────────────────────────────────

async function compositePoseOnBg(bgB64: string, poseB64: string, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')!
    const bgImg = new Image()
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, width, height)
      const poseImg = new Image()
      poseImg.onload = () => {
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.6
        ctx.drawImage(poseImg, 0, 0, width, height)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        resolve(canvas.toDataURL('image/png').split(',')[1])
      }
      poseImg.src = `data:image/png;base64,${poseB64}`
    }
    bgImg.src = `data:image/png;base64,${bgB64}`
  })
}

// ─── 이미지 생성 헬퍼 ────────────────────────────────────────────────────────

// Supabase char-images 버킷의 skeleton 이미지 URL
const SKELETON_BASE = 'https://lfhrxkpcyfqnorjkdodp.supabase.co/storage/v1/object/public/char-images/skeletons'
const POSE_REF_URLS: Record<string, string> = {
  missionary: `${SKELETON_BASE}/standard.png`,
  doggy:      `${SKELETON_BASE}/doggy.png`,
  cowgirl:    `${SKELETON_BASE}/womenup.png`,
  side:       `${SKELETON_BASE}/chair.png`,
}


async function generateAndUpload(
  prompt: string,
  negative_prompt: string,
  width: number,
  height: number,
  seed: number,
  charId: string,
  filename: string,
  mode: 'txt2img' | 'img2img' | 'controlnet' | 'ipadapter' = 'txt2img',
  init_image?: string,
  denoising_strength?: number,
  pose_image?: string,
  cn_strength?: number,
  face_image?: string,
  ipa_strength?: number,
  signal?: AbortSignal,
): Promise<string> {
  const input: Record<string, unknown> = {
    mode, prompt, negative_prompt, width, height, seed,
    steps: 12, cfg_scale: 7,
  }
  if (mode === 'img2img' && init_image) {
    input.init_image = init_image
    input.denoising_strength = denoising_strength ?? 0.75
  }
  if (mode === 'controlnet' && pose_image) {
    input.pose_image = pose_image
    input.cn_strength = cn_strength ?? 0.75
  }
  if (mode === 'ipadapter' && face_image) {
    if (pose_image) input.pose_image = pose_image
    input.face_image = face_image
    input.ipa_strength = ipa_strength ?? 0.35
    input.denoising_strength = denoising_strength ?? 0.85
  }
  const base64 = await callRunPod(input, signal)
  return uploadToSupabase(base64, charId, filename)
}

// ─── 자세 단일 표정 5장 생성 ─────────────────────────────────────────────────

export async function generatePoseVariants(
  poseKey: string,
  exprKey: string,
  c: FemaleCharacterData,
  count: number,
  onProgress: (done: number, total: number) => void,
  options?: { profileImageUrl?: string; signal?: AbortSignal; bgKey?: string }
): Promise<string[]> {
  const charId = c.id ?? 'unknown'
  const pose = POSES.find(p => p.key === poseKey)
  const expr = POSE_EXPRESSIONS.find(e => e.key === exprKey)
  if (!pose || !expr) throw new Error(`Unknown pose/expr: ${poseKey}/${exprKey}`)

  const signal = options?.signal
  const base = buildBaseDesc(c)
  const neg = `${NEG_NUDE}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, male, man, penis, cock, dick, balls, testicles, male genitalia, male body, masculine, man's body, two people, couple, monochrome, grayscale, black and white, black & white, desaturated, greyscale`
  const prompt = `${SOLO_FEMALE}, ${base}, ${pose.pose}, ${expr.arousal}, hotel bedroom background, luxury bed with white sheets, warm ambient lighting, full color photography, vibrant skin tones, colorful, RAW photo, 8k uhd, DSLR, high quality, photorealistic, nsfw, explicit, adult content`

  const baseSeed = Math.floor(Math.random() * 999999999) + 1
  let done = 0
  onProgress(0, count)

  let faceB64: string | undefined
  if (options?.profileImageUrl) {
    try { faceB64 = await fetchBase64FromUrl(options.profileImageUrl) } catch {}
  }

  const tasks = Array.from({ length: count }, (_, i) => {
    const seed = (baseSeed + i) % 999999998 + 1
    const filename = `pose_${poseKey}_${exprKey}_v${i + 1}.png`
    const imgH = poseKey === 'cowgirl' ? 640 : 512
    // 후배위: IPA가 얼굴을 앞으로 당겨서 자세 망침 → 끄기
    // 절정: IPA가 원본 얼굴 표정(눈 뜸)을 유지시켜버려서 약하게
    const ipaStrength = poseKey === 'doggy' ? 0.0 : exprKey === 'climax' ? 0.03 : 0.07
    const mode = (faceB64 && ipaStrength > 0) ? 'ipadapter' : 'txt2img'
    return generateAndUpload(prompt, neg, 384, imgH, seed, charId, filename, mode, undefined, undefined, undefined, undefined, faceB64, ipaStrength, signal)
      .then(url => { onProgress(++done, count); return url })
      .catch((e: any) => { if (e?.name !== 'AbortError') { onProgress(++done, count) } return '' })
  })

  const results = await Promise.all(tasks)
  return results
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

export async function generateProfileImage(c: FemaleCharacterData, randomSeed = false, signal?: AbortSignal): Promise<string> {
  const charId = c.id ?? 'unknown'
  const base = buildBaseDesc(c, true)
  const bg = buildLocationBg(c.location)
  const outfit = buildOutfit(c.location, c.fashion ?? 50)
  const neg = `${NEG_CLOTHED}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}`
  const prompt = `${base}, ${outfit}, calm gentle smile, portrait photo, face and upper chest visible, head and shoulders, ${bg}, full color photography, RAW photo, 8k uhd, DSLR, high quality, film grain, photorealistic, natural lighting`
  const seed = Math.floor(Math.random() * 999999999) + 1
  const filename = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
  return generateAndUpload(prompt, neg, 400, 520, seed, charId, filename, 'txt2img', undefined, undefined, undefined, undefined, undefined, undefined, signal)
}

export function deleteImageFromStorage(url: string): void {
  const path = decodeURIComponent(url.split('/char-images/')[1]?.split('?')[0] ?? '')
  if (!path) return
  supabase.storage.from('char-images').remove([path]).then(({ error }) => {
    if (error) console.error('[Storage delete failed]', path, error.message)
    else console.log('[Storage delete ok]', path)
  })
}

async function fetchBase64FromUrl(url: string): Promise<string> {
  const resp = await fetch(url)
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function generateExpressionImages(
  c: FemaleCharacterData,
  onProgress: (done: number, total: number, label: string) => void,
  options?: { randomSeed?: boolean; profileImageUrl?: string }
): Promise<string[]> {
  const charId = c.id ?? 'unknown'
  const base = buildBaseDesc(c, true)
  const bg = buildLocationBg(c.location)
  const outfit = buildOutfit(c.location, c.fashion ?? 50)
  const neg = `${NEG_CLOTHED}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}`
  const seed = options?.randomSeed ? Math.floor(Math.random() * 999999999) + 1 : charSeed(c)
  const suffix = options?.randomSeed ? `_${Date.now()}` : ''
  const results: string[] = []

  // 프로필 이미지를 베이스로 사용하면 동일 인물 유지
  let profileB64 = ''
  if (options?.profileImageUrl) {
    try { profileB64 = await fetchBase64FromUrl(options.profileImageUrl) } catch {}
  }

  // 5장 모두 img2img (프로필 베이스 있으면) 또는 1장 txt2img 후 나머지 img2img
  const { key: k0, label: l0, expr: e0 } = CONVERSATION_EXPRESSIONS[0]
  onProgress(0, CONVERSATION_EXPRESSIONS.length, l0)
  const basePrompt = `${base}, ${outfit}, ${e0}, upper body portrait, ${bg}, full color photography, RAW photo, 8k uhd, DSLR, high quality, photorealistic, soft lighting`
  let baseB64 = profileB64

  try {
    if (profileB64) {
      baseB64 = await callRunPod({ mode: 'img2img', prompt: basePrompt, negative_prompt: neg, width: 400, height: 520, seed, steps: 28, cfg_scale: 7, init_image: profileB64, denoising_strength: 0.6 })
    } else {
      baseB64 = await callRunPod({ mode: 'txt2img', prompt: basePrompt, negative_prompt: neg, width: 400, height: 520, seed, steps: 28, cfg_scale: 7 })
    }
    const url = await uploadToSupabase(baseB64, charId, `expr_${k0}${suffix}.png`)
    results.push(url)
  } catch {
    results.push('')
  }

  // 나머지 4장: img2img (표정만 변환, 베이스 유지)
  for (let i = 1; i < CONVERSATION_EXPRESSIONS.length; i++) {
    const { key, label, expr } = CONVERSATION_EXPRESSIONS[i]
    onProgress(i, CONVERSATION_EXPRESSIONS.length, label)
    const prompt = `${base}, ${outfit}, ${expr}, upper body portrait, ${bg}, full color photography, RAW photo, 8k uhd, DSLR, high quality, photorealistic, soft lighting`
    try {
      let url: string
      if (baseB64) {
        url = await generateAndUpload(prompt, neg, 400, 520, seed + i, charId, `expr_${key}${suffix}.png`, 'img2img', baseB64, 0.55)
      } else {
        url = await generateAndUpload(prompt, neg, 400, 520, seed + i, charId, `expr_${key}${suffix}.png`)
      }
      results.push(url)
    } catch {
      results.push('')
    }
  }

  onProgress(CONVERSATION_EXPRESSIONS.length, CONVERSATION_EXPRESSIONS.length, '완료')
  return results
}

export async function generatePoseImages(
  c: FemaleCharacterData,
  onProgress: (done: number, total: number, label: string) => void,
  options?: { randomSeed?: boolean; profileImageUrl?: string }
): Promise<Record<string, string>> {
  const charId = c.id ?? 'unknown'
  const base = buildBaseDesc(c)
  const neg = `${NEG_NUDE}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, male, man, penis, cock, dick, balls, testicles, male genitalia, male body, masculine, man's body, two people, couple`
  const results: Record<string, string> = {}
  const total = POSES.length * POSE_EXPRESSIONS.length
  let done = 0

  // 호텔방 배경 1장 생성 (모든 자세에 공유)
  onProgress(0, total, '배경 준비 중...')
  const bgPrompt = 'luxury hotel bedroom, king size bed with white sheets, warm bedside lamp lighting, elegant interior, no people, RAW photo, 8k uhd, DSLR, photorealistic'
  const bgNeg = 'person, people, human, anime, cartoon, blurry, low quality'
  let hotelBgB64 = ''
  try {
    hotelBgB64 = await callRunPod({ mode: 'txt2img', prompt: bgPrompt, negative_prompt: bgNeg, width: 768, height: 1024, seed: 777777, steps: 20, cfg_scale: 7 })
  } catch {
    hotelBgB64 = ''
  }

  // 포즈 레퍼런스 + 프로필 이미지 base64 미리 fetch
  onProgress(0, total, '포즈 준비 중...')
  const poseRefB64: Record<string, string> = {}
  for (const { key: poseKey } of POSES) {
    try {
      poseRefB64[poseKey] = await fetchBase64FromUrl(POSE_REF_URLS[poseKey])
    } catch {
      poseRefB64[poseKey] = ''
    }
  }

  // 프로필 이미지 (얼굴 레퍼런스용)
  let faceB64 = ''
  if (options?.profileImageUrl) {
    try {
      faceB64 = await fetchBase64FromUrl(options.profileImageUrl)
    } catch {
      faceB64 = ''
    }
  }

  for (const { key: poseKey, label: poseLabel, pose } of POSES) {
    for (const { key: exprKey, label: exprLabel, arousal } of POSE_EXPRESSIONS) {
      onProgress(done, total, `${poseLabel} · ${exprLabel}`)
      const prompt = `${SOLO_FEMALE}, ${base}, ${pose}, ${arousal}, hotel bedroom background, luxury bed with white sheets, warm ambient lighting, full color photography, vibrant skin tones, colorful, RAW photo, 8k uhd, DSLR, high quality, photorealistic, nsfw, explicit, adult content`
      const filename = options?.randomSeed ? `pose_${poseKey}_${exprKey}_${Date.now()}.png` : `pose_${poseKey}_${exprKey}.png`
      const seed = Math.floor(Math.random() * 999999999) + 1
      try {
        let url: string
        const refB64 = poseRefB64[poseKey]

        // 호텔방 배경 있으면 마네킹과 합성
        const compositeB64 = (hotelBgB64 && refB64)
          ? await compositePoseOnBg(hotelBgB64, refB64, 384, 512)
          : refB64

        if (compositeB64) {
          url = await generateAndUpload(prompt, neg, 384, 512, seed, charId, filename, 'img2img', compositeB64, 0.6)
        } else {
          url = await generateAndUpload(prompt, neg, 384, 512, seed, charId, filename)
        }
        results[`${poseKey}_${exprKey}`] = url
      } catch {
        results[`${poseKey}_${exprKey}`] = ''
      }
      done++
    }
  }

  onProgress(total, total, '완료')
  return results
}

// ─── 남캐 이미지 생성 ────────────────────────────────────────────────────────

export async function generateMaleProfileImage(char: {
  nickname: string
  age: number
  job: string
  face: number
  height: number
  body: number
  fashion: number
  appearanceDesc?: string
}): Promise<string> {
  const { age, face, height, body, fashion, appearanceDesc } = char

  const faceDesc = face >= 80 ? 'extremely handsome face, sharp jawline, perfect features'
    : face >= 60 ? 'handsome good-looking face, clean features'
    : face >= 40 ? 'average decent face, natural look'
    : 'plain ordinary face'

  // 나이대별 얼굴 묘사
  const ageFaceDesc = age < 30
    ? `${faceDesc}, flawless smooth skin, no wrinkles, youthful fresh face, young man in 20s`
    : age < 40
    ? `${faceDesc}, slight nasolabial folds, faint crow's feet, light stubble, naturally aged skin texture, mature man clearly in 30s`
    : `${faceDesc}, visible forehead lines, deep nasolabial folds, crow's feet, salt and pepper hair, weathered skin, distinguished middle-aged man in 40s`

  // 나이대별 네거티브
  const ageNeg = age < 30
    // 20대: 너무 늙어 보이면 안됨
    ? 'middle aged, old, elderly, wrinkles, forehead lines, nasolabial folds, crow feet, stubble, beard, gray hair'
    : age < 40
    // 30대: 20대처럼 너무 어리면 안되고, 40대처럼 너무 늙으면 안됨
    ? 'teenager, baby face, very young, 20s, flawless skin, perfect smooth skin, no wrinkles, old, elderly, deeply wrinkled, gray hair, aged, 50s, 60s'
    // 40대: 20대/30대처럼 어리면 안됨, 50대 이상처럼 너무 늙으면 안됨
    : 'teenager, baby face, very young, 20s, 30s, smooth perfect skin, youthful, unaged, no wrinkles, very old, elderly, 60s, 70s, deeply aged'

  const heightDesc = height >= 80 ? 'very tall, 185cm+'
    : height >= 60 ? 'tall, 178cm'
    : height >= 40 ? 'average height, 172cm'
    : 'short man, 165cm'

  const bodyDesc = body >= 80 ? 'muscular athletic body, broad shoulders, six pack abs'
    : body >= 60 ? 'fit toned body, lean physique, broad shoulders'
    : body >= 40 ? 'average build, slim fit'
    : 'skinny slim body, narrow shoulders'

  const fashionDesc = fashion >= 80 ? 'stylish trendy outfit, designer clothes, fashionable'
    : fashion >= 60 ? 'smart casual outfit, well-dressed'
    : fashion >= 40 ? 'casual clean outfit, simple style'
    : 'plain basic outfit, ordinary clothes'

  const extraDesc = appearanceDesc
    ? `, ${translateAppearance(appearanceDesc)}`
    : ''

  const prompt = `Korean adult male, ${age}yo, ${ageFaceDesc}, ${bodyDesc}, ${heightDesc}, ${fashionDesc}${extraDesc}, fully clothed, dressed, wearing clothes, standing confident pose, upper body portrait, indoor background, soft studio lighting, full color photography, RAW photo, 8k uhd, DSLR, high quality, photorealistic`
  const neg = `female, woman, girl, nude, naked, bare chest, shirtless, topless, underwear, nsfw, skin exposed, ${ageNeg}, blurry, bad anatomy, watermark, text, logo, low quality, deformed, anime, cartoon, 3d render, painting, extra fingers, missing fingers`

  const seed = Math.floor(Math.random() * 999999999) + 1
  const base64 = await callRunPod({ mode: 'txt2img', prompt, negative_prompt: neg, width: 400, height: 520, seed, steps: 28, cfg_scale: 7 })

  return `data:image/png;base64,${base64}`
}

export { EXPRESSION_LEVELS, CONVERSATION_EXPRESSIONS, POSE_EXPRESSIONS, POSES }
