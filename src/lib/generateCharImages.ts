import type { FemaleCharacterData } from '../pages/FemaleCharacterCreatePage'
import { supabase } from './supabase'

const RUNPOD_API_KEY = import.meta.env.VITE_RUNPOD_API_KEY
const RUNPOD_ENDPOINT_ID = import.meta.env.VITE_RUNPOD_ENDPOINT_ID
const RUNPOD_ENDPOINT_ID_SFW = import.meta.env.VITE_RUNPOD_ENDPOINT_ID_SFW
const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`
const RUNPOD_BASE_SFW = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID_SFW}`

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
  { key: 'climax',  label: '절정', arousal: 'closed eyes, eyes shut, mouth wide open, ahegao climax face, orgasm expression, both eyes tightly closed shut, head thrown back neck exposed, mouth open wide in moan, lips parted wide, chin up head tilted back, deep red flushed face, body trembling, sweat on skin, ecstasy face' },
]

const EXPRESSION_LEVELS = CONVERSATION_EXPRESSIONS.map(e => ({ key: e.key, label: e.label, arousal: e.expr }))

const SOLO_FEMALE = 'solo female, 1girl, no male, no man, no penis, no male body parts, male completely out of frame, only woman in frame'

const POSES = [
  {
    key: 'missionary', label: '정상위',
    pose: `${SOLO_FEMALE}, solo, 1girl only, completely nude Korean woman lying flat on her back on a bed, body pressed against white bed sheets, lying down on bed mattress, M字開脚, M-shaped legs spread wide open to both sides, knees bent outward, vagina and labia fully exposed at center, large breasts visible on chest, both arms raised above head with hands resting on pillow above head, elbows bent outward, face visible at top of frame, top-down view, bird's eye view, overhead camera angle, explicit nude adult photography`,
  },
  {
    key: 'doggy', label: '후배위',
    pose: `${SOLO_FEMALE}, completely nude Korean woman in doggy style sex position, on all fours on bed, back facing camera, facing away from viewer, ass toward camera, large round buttocks prominently shown toward camera filling frame, arched back, spine visible, vagina and labia fully exposed between spread legs, head pointing away from camera, no face visible, rear view from behind, camera directly behind her at ass level, explicit nude adult photography`,
  },
  {
    key: 'cowgirl', label: '여성상위',
    pose: `${SOLO_FEMALE}, spread pussy, vagina fully exposed and visible, completely nude Korean woman in cowgirl position, leaning forward toward camera, body tilted forward, both hands reaching forward placed on bed or surface in front of her, arms extended forward supporting upper body weight, breasts hanging forward due to lean, face looking up at camera, legs straddling wide apart, pussy visible between thighs, explicit nude adult photography`,
  },
  {
    key: 'side', label: '버터플라이',
    pose: `${SOLO_FEMALE}, completely nude Korean woman lying on her back on bed, both legs raised high up in the air, knees bent toward chest, both legs spread wide apart like butterfly wings, soles of feet visible, vagina and labia fully exposed from above angle, large breasts visible, face looking up at camera, camera angle looking down at her, explicit nude adult photography`,
  },
]

const COMMON_NEG = 'black and white, grayscale, monochrome, desaturated, colorless, no color, greyscale, blurry, bad anatomy, watermark, text, logo, low quality, deformed, anime, cartoon, 3d render, painting, illustration, drawing, cgi, art, sketch, bad hands, extra fingers, missing fingers, extra limbs, malformed limbs, fused fingers, mutated hands'
const NEG_CLOTHED = `nude, naked, nsfw, topless, bare breasts, exposed breasts, nipples, no clothes, undressed, partially undressed, lingerie, bikini, revealing clothes, multiple people, 2 people, 2 girls, two people, multiple persons, duplicate, ${COMMON_NEG}`
const NEG_NUDE = `clothes, underwear, bra, panties, censored, hands covering genitals, hands on pussy, hand covering vagina, covering crotch with hands, hand between legs covering, ${COMMON_NEG}`

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
  if (fashion >= 80) return `${base}, stylish, trendy, well-coordinated accessories, high fashion`
  if (fashion >= 60) return `${base}, neat, well-dressed, coordinated`
  if (fashion >= 40) return `${base}, casual, simple`
  return `${base}, plain, basic style`
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
  return 'teenager, baby face, very young face, childlike, 20s, very old, elderly, 60s, deeply wrinkled, gray hair'
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

function pickFaceVariants(seed: number): string {
  const eyes = [
    'double eyelid, big expressive eyes',
    'monolid, almond-shaped eyes',
    'wide round innocent eyes',
    'narrow sharp seductive eyes',
    'large bright doe eyes',
    'deep-set sultry eyes',
    'upturned fox eyes',
    'soft downturned eyes',
  ]
  const lips = [
    'full plump lips',
    'thin delicate lips',
    'heart-shaped cupid bow lips',
    'soft natural lips',
    'pouty lips',
    'wide expressive mouth',
  ]
  const jaw = [
    'sharp v-shaped jawline',
    'soft oval face shape',
    'round soft face',
    'defined high cheekbones',
    'gentle square jaw',
    'heart-shaped face',
    'long narrow face',
    'wide flat cheekbones',
  ]
  const nose = [
    'small button nose',
    'straight slim nose',
    'soft natural nose',
    'petite upturned nose',
    'slightly wide nose',
    'refined aquiline nose',
  ]
  // 각 특징마다 서로 다른 소수 기반 해시로 분산
  const p = (arr: string[], salt: number) => arr[(seed * salt) % arr.length < 0 ? ((seed * salt) % arr.length + arr.length) : (seed * salt) % arr.length]
  return `${p(eyes, 1301)}, ${p(lips, 1973)}, ${p(jaw, 2711)}, ${p(nose, 3541)}`
}

function buildFaceAtmosphere(c: FemaleCharacterData): string {
  const loc = c.location ?? ''
  const married = c.married
  const p = c.personality ?? { introvert: 3, indirect: 3, friendly: 3 }

  // 장소/직업 기반 분위기
  const locationVibe =
    ['클럽', '바', '호텔'].includes(loc) ? 'bold glamorous look, alluring expression' :
    ['카페', '레스토랑', '고급레스토랑'].includes(loc) ? 'warm friendly face, approachable smile' :
    ['병원', '약국', '공공기관'].includes(loc) ? 'clean professional look, trustworthy expression' :
    ['경찰서'].includes(loc) ? 'strong confident look, authoritative aura' :
    ['헬스장'].includes(loc) ? 'healthy energetic glow, athletic confidence' :
    ['대학교', '도서관'].includes(loc) ? 'intellectual fresh look, studious vibe' :
    ['쇼핑몰'].includes(loc) ? 'stylish fashionable look, trendy vibe' :
    ['비행장'].includes(loc) ? 'polished elegant look, professional grace' :
    ['해변', '공원'].includes(loc) ? 'natural fresh look, outdoor glow' :
    'natural everyday look'

  // 결혼 상태 보정
  const marriedVibe =
    married === '기혼' ? 'settled mature confidence' :
    married === '돌싱' ? 'experienced independent resilient look' :
    'fresh youthful energy'

  // 성격 반영
  const personalityVibe =
    p.friendly >= 4 ? 'warm bright smile, open expression' :
    p.introvert >= 4 ? 'reserved quiet dignity, subtle expression' :
    p.indirect >= 4 ? 'mysterious subtle look' :
    'natural composed expression'

  return `${locationVibe}, ${marriedVibe}, ${personalityVibe}`
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

  const faceVariants = pickFaceVariants(charSeed(c))
  const faceAtmosphere = buildFaceAtmosphere(c)
  const ageFaceDesc = is20s
    ? `${faceBase}, ${faceVariants}, ${faceAtmosphere}, flawless smooth skin, youthful glow`
    : is30s
    ? `${faceBase}, ${faceVariants}, ${faceAtmosphere}, smooth skin, refined elegant beauty, sophisticated`
    : `${faceBase}, ${faceVariants}, ${faceAtmosphere}, smooth skin, elegant mature beauty, sophisticated`

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

// ─── Pollinations API 호출 (대표이미지 / 표정 — SFW) ────────────────────────

async function callPollinations(prompt: string, _neg: string, width: number, height: number, seed: number, signal?: AbortSignal): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'))
    const img = new Image()
    const timer = setTimeout(() => { img.src = ''; reject(new Error('Pollinations timeout')) }, 60000)
    const onAbort = () => { clearTimeout(timer); img.src = ''; reject(new Error('aborted')) }
    signal?.addEventListener('abort', onAbort, { once: true })
    img.onload = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(url)
    }
    img.onerror = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(new Error('Pollinations image load failed')) }
    img.src = url
  })
}

// ─── RunPod API 호출 ─────────────────────────────────────────────────────────

const RUNPOD_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${RUNPOD_API_KEY}`,
}

async function cancelRunPodJob(jobId: string, sfw = false): Promise<void> {
  const base = sfw ? RUNPOD_BASE_SFW : RUNPOD_BASE
  await fetch(`${base}/cancel/${jobId}`, { method: 'POST', headers: RUNPOD_HEADERS })
}

async function callRunPod(input: Record<string, unknown>, signal?: AbortSignal, sfw = false): Promise<string> {
  const base = sfw ? RUNPOD_BASE_SFW : RUNPOD_BASE
  // 1. job 제출
  const submitRes = await fetch(`${base}/run`, {
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

      const statusRes = await fetch(`${base}/status/${jobId}`, { headers: RUNPOD_HEADERS, signal })
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


// ─── 이미지 생성 헬퍼 ────────────────────────────────────────────────────────



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
    steps: 30, cfg_scale: 7,
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
  const neg = `${NEG_NUDE}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, male, man, penis, cock, dick, balls, testicles, male genitalia, male body, masculine, man's body, two people, couple, multiple people, multiple faces, extra heads, extra faces, 2girls, 3girls, duplicate, monochrome, grayscale, black and white, black & white, desaturated, greyscale`
  const prompt = `${SOLO_FEMALE}, ${base}, ${pose.pose}, ${expr.arousal}, hotel bedroom background, luxury bed with white sheets, warm ambient lighting, full color photography, vibrant skin tones, colorful, RAW photo, 8k uhd, DSLR, high quality, photorealistic, nsfw, explicit, adult content`

  const baseSeed = Math.floor(Math.random() * 999999999) + 1
  let done = 0
  onProgress(0, count)

  const tasks = Array.from({ length: count }, (_, i) => {
    const seed = (baseSeed + i) % 999999998 + 1
    const filename = `pose_${poseKey}_${exprKey}_v${i + 1}.png`
    return generateAndUpload(prompt, neg, 832, 1216, seed, charId, filename, 'txt2img', undefined, undefined, undefined, undefined, undefined, undefined, signal)
      .then(url => { onProgress(++done, count); return url })
      .catch((e: any) => { if (e?.name !== 'AbortError') { onProgress(++done, count) } return '' })
  })

  const results = await Promise.all(tasks)
  return results
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

function buildProfileOutfit(fashion: number, bodyType?: string): string {
  const body = bodyType === '글래머' ? 'voluptuous curvy body' : bodyType === '슬랜더' ? 'slim slender body' : bodyType === '베이글' ? 'hourglass body' : 'athletic fit body'
  if (fashion >= 85) return `${body}, revealing outfit, low-cut deep neckline, midriff exposed, mini skirt, high heels, glamorous sexy fashion`
  if (fashion >= 70) return `${body}, stylish outfit, slightly open neckline, fitted clothes, trendy fashion`
  if (fashion >= 50) return `${body}, neat casual outfit, simple top, jeans`
  return `${body}, plain simple clothes, modest outfit`
}

export async function generateProfileImage(c: FemaleCharacterData, randomSeed = false, signal?: AbortSignal): Promise<string> {
  const charId = c.id ?? 'unknown'
  const base = buildBaseDesc(c, true)
  const bg = buildLocationBg(c.location)
  const fashion = c.fashion ?? 50
  const outfitDesc = buildProfileOutfit(fashion, c.bodyType)
  const neg = `${NEG_CLOTHED}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, full body, legs, feet, lower body`
  const prompt = `SFW, safe for work, 1girl, solo, ${base}, ${outfitDesc}, calm gentle smile, upper body portrait, waist up, ${bg}, RAW photo, 8k uhd, DSLR, high quality, photorealistic, natural lighting`
  const seed = Math.floor(Math.random() * 999999) + 1
  const filename = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
  const b64 = await callRunPod({ mode: 'txt2img', prompt, negative_prompt: neg, width: 832, height: 832, seed, steps: 30, cfg_scale: 7 }, signal)
  return uploadToSupabase(b64, charId, filename)
}

export async function cleanOrphanImages(): Promise<{ deleted: number; errors: number; orphans: string[] }> {
  // 1. DB에서 사용 중인 모든 이미지 URL 수집
  const { data: chars, error } = await supabase
    .from('female_characters')
    .select('image_url, expression_images, pose_images')

  if (error) throw new Error(`DB 조회 실패: ${error.message}`)

  const usedPaths = new Set<string>()
  // URL 인코딩 디코딩 필수 — Supabase 공개 URL은 인코딩, storage list는 원본 파일명
  const extractPath = (url: string) => {
    if (!url) return null
    try {
      const raw = url.split('/char-images/')[1]?.split('?')[0] ?? null
      return raw ? decodeURIComponent(raw) : null
    } catch { return null }
  }

  for (const c of chars ?? []) {
    if (c.image_url) { const p = extractPath(c.image_url); if (p) usedPaths.add(p) }
    for (const url of (c.expression_images ?? [])) { const p = extractPath(url); if (p) usedPaths.add(p) }
    for (const url of Object.values(c.pose_images ?? {})) { const p = extractPath(url as string); if (p) usedPaths.add(p) }
  }

  console.log('[cleanOrphan] DB에서 추출한 사용 중 경로:', usedPaths.size, '개')

  // 2. Storage에서 전체 파일 목록 가져오기 (폴더별)
  const { data: folders } = await supabase.storage.from('char-images').list('', { limit: 1000 })
  const orphans: string[] = []

  for (const folder of folders ?? []) {
    if (folder.id !== null) continue // 파일이면 스킵 (폴더는 id가 null)
    const { data: files } = await supabase.storage.from('char-images').list(folder.name, { limit: 1000 })
    for (const file of files ?? []) {
      if (!file.id) continue // 하위 폴더면 스킵
      const path = `${folder.name}/${file.name}`
      if (!usedPaths.has(path)) orphans.push(path)
    }
  }

  console.log('[cleanOrphan] 고아 파일 발견:', orphans.length, '개', orphans)

  if (orphans.length === 0) return { deleted: 0, errors: 0, orphans: [] }

  // 3. 고아 파일 삭제 (50개씩 배치)
  let deleted = 0, errors = 0
  for (let i = 0; i < orphans.length; i += 50) {
    const batch = orphans.slice(i, i + 50)
    const { error } = await supabase.storage.from('char-images').remove(batch)
    if (error) errors += batch.length
    else deleted += batch.length
  }

  return { deleted, errors, orphans }
}

async function callRunPodFrames(input: Record<string, unknown>, signal?: AbortSignal): Promise<string[]> {
  const submitRes = await fetch(`${RUNPOD_BASE}/run`, {
    method: 'POST',
    headers: RUNPOD_HEADERS,
    body: JSON.stringify({ input }),
    signal,
  })
  if (!submitRes.ok) throw new Error(`RunPod submit error: ${submitRes.status}`)
  const { id: jobId } = await submitRes.json()
  if (!jobId) throw new Error('RunPod: no job id returned')

  while (true) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch(`${RUNPOD_BASE}/status/${jobId}`, { headers: RUNPOD_HEADERS, signal })
    if (!statusRes.ok) throw new Error(`RunPod status error: ${statusRes.status}`)
    const data = await statusRes.json()
    if (data.status === 'COMPLETED') {
      if (data.output?.status === 'failed') throw new Error(data.output.error)
      return data.output.frames as string[]
    }
    if (data.status === 'FAILED' || data.status === 'CANCELLED') {
      throw new Error(`RunPod job ${data.status}: ${data.error ?? JSON.stringify(data)}`)
    }
  }
}

const POSE_SPRITE_PROMPTS: Record<string, { neutral: string; peak: string }> = {
  missionary: {
    neutral: 'nude Korean woman, missionary sex position, lying on back, legs spread wide, hips flat on bed, body relaxed, breasts resting, explicit, adult, photorealistic',
    peak: 'nude Korean woman, missionary sex position, lying on back, hips thrust high up into the air, back arched dramatically off bed, legs spread wide bent at knees, breasts bouncing upward, body in full thrust motion, explicit, adult, photorealistic',
  },
  doggy: {
    neutral: 'nude Korean woman, doggy style, on all fours, back straight and level, round buttocks facing camera, explicit, adult, photorealistic',
    peak: 'nude Korean woman, doggy style, back deeply arched downward spine curved, large buttocks pushed far back and high up toward camera, hips thrust backward forcefully, explicit, adult, photorealistic',
  },
  cowgirl: {
    neutral: 'nude Korean woman, cowgirl position, sitting straight upright, hips down, body tall, breasts forward, explicit, adult, photorealistic',
    peak: 'nude Korean woman, cowgirl position, hips raised high up, body leaning far forward, breasts hanging and swaying, waist dipped, riding motion peak, explicit, adult, photorealistic',
  },
  side: {
    neutral: 'nude Korean woman, butterfly position, lying on back, legs raised and spread apart, hips flat, body relaxed, explicit, adult, photorealistic',
    peak: 'nude Korean woman, butterfly position, hips lifted and tilted far upward off bed, legs raised high and spread very wide, lower back arched up, breasts bouncing, explicit, adult, photorealistic',
  },
}
const SPRITE_NEG = 'static, blurry, bad anatomy, watermark, text, 3d, cartoon, anime, clothes, clothed, male, man, penis'

export async function generatePoseSprite(
  poseImageUrl: string,
  charId: string,
  poseKey: string,
  signal?: AbortSignal
): Promise<string[]> {
  const basePoseKey = poseKey.replace(/_aroused$|_climax$/, '')
  const prompts = POSE_SPRITE_PROMPTS[basePoseKey] ?? POSE_SPRITE_PROMPTS['missionary']
  const initB64 = await fetchBase64FromUrl(poseImageUrl)
  const baseSeed = Math.floor(Math.random() * 999999999) + 1

  const frames = await callRunPodFrames({
    mode: 'sprite',
    init_image: initB64,
    prompt: prompts.neutral,
    negative_prompt: SPRITE_NEG,
    width: 832,
    height: 1216,
    steps: 20,
    cfg_scale: 7,
    denoise: 0.45,
    num_frames: 3,
    frame_prompts: [prompts.neutral, prompts.peak, prompts.neutral],
    frame_seeds: [baseSeed, baseSeed + 1, baseSeed + 2],
  }, signal)

  const urls: string[] = []
  for (let i = 0; i < frames.length; i++) {
    const url = await uploadToSupabase(frames[i], charId, `pose_${poseKey}_sprite_${i}.png`)
    urls.push(url)
  }
  return urls
}

async function callRunPodVideo(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const submitRes = await fetch(`${RUNPOD_BASE}/run`, {
    method: 'POST',
    headers: RUNPOD_HEADERS,
    body: JSON.stringify({ input }),
    signal,
  })
  if (!submitRes.ok) throw new Error(`RunPod submit error: ${submitRes.status}`)
  const { id: jobId } = await submitRes.json()
  if (!jobId) throw new Error('RunPod: no job id returned')

  while (true) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(`${RUNPOD_BASE}/status/${jobId}`, { headers: RUNPOD_HEADERS, signal })
    if (!statusRes.ok) throw new Error(`RunPod status error: ${statusRes.status}`)
    const data = await statusRes.json()
    if (data.status === 'COMPLETED') {
      if (data.output?.status === 'failed') throw new Error(data.output.error)
      return data.output.video as string  // base64 mp4
    }
    if (data.status === 'FAILED' || data.status === 'CANCELLED') {
      throw new Error(`RunPod job ${data.status}: ${data.error ?? JSON.stringify(data)}`)
    }
  }
}

const POSE_VIDEO_PROMPTS: Record<string, string> = {
  missionary: '1girl, nude Korean woman, missionary sex position, lying on back, legs spread wide, bouncing breasts, rhythmic hip thrusting motion, explicit, adult, animated',
  doggy: '1girl, nude Korean woman, doggy style sex position, on all fours, ass toward camera, buttocks bouncing rhythmically, hip thrusting motion, explicit, adult, animated',
  cowgirl: '1girl, nude Korean woman, cowgirl sex position, riding on top, bouncing up and down, breasts bouncing, hip grinding motion, explicit, adult, animated',
  side: '1girl, nude Korean woman, butterfly position, lying on back, legs raised high and spread, rhythmic thrusting motion, bouncing breasts, explicit, adult, animated',
}
const POSE_VIDEO_NEG = 'static, still, no motion, motionless, frozen, bad anatomy, blurry, low quality, watermark, text, 3d, cartoon, anime'

export async function generatePoseVideo(
  poseImageUrl: string,
  charId: string,
  poseKey: string,
  options?: { numFrames?: number; fps?: number; strength?: number },
  signal?: AbortSignal
): Promise<string> {
  const basePoseKey = poseKey.replace(/_aroused$|_climax$/, '')
  const prompt = POSE_VIDEO_PROMPTS[basePoseKey] ?? POSE_VIDEO_PROMPTS['missionary']
  const initB64 = await fetchBase64FromUrl(poseImageUrl)
  const videoB64 = await callRunPodVideo({
    mode: 'animatediff',
    init_image: initB64,
    prompt,
    negative_prompt: POSE_VIDEO_NEG,
    num_frames: options?.numFrames ?? 16,
    fps: options?.fps ?? 8,
    steps: 25,
    strength: options?.strength ?? 0.7,
    seed: Math.floor(Math.random() * 2 ** 32),
  }, signal)

  // base64 mp4 → Blob → Supabase 업로드
  const binary = atob(videoB64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'video/mp4' })
  const filename = `pose_${poseKey}_video.mp4`
  const path = `${charId}/${filename}`
  const { error } = await supabase.storage.from('char-images').upload(path, blob, { upsert: true, contentType: 'video/mp4' })
  if (error) throw new Error(`Video upload failed: ${error.message}`)
  const { data } = supabase.storage.from('char-images').getPublicUrl(path)
  return data.publicUrl
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
  options?: { randomSeed?: boolean; profileImageUrl?: string },
  signal?: AbortSignal
): Promise<string[]> {
  const charId = c.id ?? 'unknown'
  const base = buildBaseDesc(c, true)
  const bg = buildLocationBg(c.location)
  const outfit = buildProfileOutfit(c.fashion ?? 50, c.bodyType) // 대표이미지와 동일한 outfit 함수
  const neg = `${NEG_CLOTHED}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, full body, legs, feet, lower body`
  const seed = options?.randomSeed ? Math.floor(Math.random() * 999999999) + 1 : charSeed(c)
  const suffix = options?.randomSeed ? `_${Date.now()}` : ''
  const results: string[] = []

  // 대표이미지가 있으면 img2img로 얼굴/옷 일관성 유지
  let profileB64 = ''
  if (options?.profileImageUrl) {
    try { profileB64 = await fetchBase64FromUrl(options.profileImageUrl) } catch { profileB64 = '' }
  }
  const useImg2Img = !!profileB64

  const makeCallOptions = (prompt: string, s: number) =>
    useImg2Img
      ? { mode: 'img2img' as const, prompt, negative_prompt: neg, width: 832, height: 832, seed: s, steps: 30, cfg_scale: 7, init_image: profileB64, denoise: 0.5 }
      : { mode: 'txt2img' as const, prompt, negative_prompt: neg, width: 832, height: 832, seed: s, steps: 30, cfg_scale: 7 }

  const { key: k0, label: l0, expr: e0 } = CONVERSATION_EXPRESSIONS[0]
  onProgress(0, CONVERSATION_EXPRESSIONS.length, l0)
  const basePrompt = `SFW, safe for work, 1girl, solo, ${base}, ${outfit}, ${e0}, upper body portrait, waist up, ${bg}, RAW photo, 8k uhd, DSLR, high quality, photorealistic, soft lighting`

  try {
    const b64 = await callRunPod(makeCallOptions(basePrompt, seed), signal)
    const url = await uploadToSupabase(b64, charId, `expr_${k0}${suffix}.png`)
    results.push(url)
  } catch {
    results.push('')
  }

  for (let i = 1; i < CONVERSATION_EXPRESSIONS.length; i++) {
    const { key, label, expr } = CONVERSATION_EXPRESSIONS[i]
    onProgress(i, CONVERSATION_EXPRESSIONS.length, label)
    const prompt = `SFW, safe for work, 1girl, solo, ${base}, ${outfit}, ${expr}, upper body portrait, waist up, ${bg}, RAW photo, 8k uhd, DSLR, high quality, photorealistic, soft lighting`
    try {
      const b64 = await callRunPod(makeCallOptions(prompt, seed + i), signal)
      const url = await uploadToSupabase(b64, charId, `expr_${key}${suffix}.png`)
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
  const neg = `${NEG_NUDE}, ${ageNegative(c.age ?? 25)}, ${bodyTypeNegative(c.bodyType)}, male, man, penis, cock, dick, balls, testicles, male genitalia, male body, masculine, man's body, two people, couple, multiple people, multiple faces, extra heads, extra faces, 2girls, 3girls, duplicate`
  const results: Record<string, string> = {}
  const total = POSES.length * POSE_EXPRESSIONS.length
  let done = 0

  onProgress(0, total, '포즈 준비 중...')

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

        // 얼굴 레퍼런스(ipadapter) 또는 txt2img
        if (faceB64) {
          url = await generateAndUpload(prompt, neg, 832, 1216, seed, charId, filename, 'ipadapter', undefined, undefined, faceB64)
        } else {
          url = await generateAndUpload(prompt, neg, 832, 1216, seed, charId, filename)
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

export { EXPRESSION_LEVELS, CONVERSATION_EXPRESSIONS, POSE_EXPRESSIONS, POSES, POSE_SPRITE_PROMPTS }

// ─── Ollama Vision 핫스팟 자동 분석 ──────────────────────────────────────────

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434'

export interface HotspotZone {
  key: 'breast' | 'neck' | 'ear' | 'thigh' | 'clitoris' | 'vagina' | 'anal' | 'mouth'
  label: string
  cx: number; cy: number; rx: number; ry: number
  rotation?: number
  color: string
}

const ZONE_COLORS: Record<string, string> = {
  mouth: '#ff6b9d', neck: '#c77dff', ear: '#a855f7', breast: '#ff6b9d',
  thigh: '#f77f00', clitoris: '#e94560', vagina: '#e94560', anal: '#c9a84c',
}
const ZONE_LABELS: Record<string, string> = {
  mouth: '입', neck: '목', ear: '귀', breast: '가슴',
  thigh: '엉덩이/허벅지', clitoris: '클리토리스', vagina: '질', anal: '항문',
}

export const POSE_HOTSPOTS: Record<string, HotspotZone[]> = {
  missionary: [
    { key: 'mouth',    label: '입',         cx: 50, cy: 18, rx: 5,  ry: 2.5,color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 50, cy: 26, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',        cx: 36, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',        cx: 64, cy: 20, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴L',      cx: 37, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴R',      cx: 63, cy: 41, rx: 13, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지L',    cx: 22, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지R',    cx: 78, cy: 72, rx: 16, ry: 13, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 81, rx: 4,  ry: 2,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 50, cy: 86, rx: 3.5,ry: 2,  color: '#e94560' },
  ],
  doggy: [
    { key: 'mouth',    label: '입',         cx: 23, cy: 22, rx: 6,  ry: 4.5,color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 32, cy: 29, rx: 8,  ry: 5,  color: '#c77dff' },
    { key: 'ear',      label: '귀',         cx: 22, cy: 22, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴',       cx: 42, cy: 60, rx: 10, ry: 10, color: '#ff6b9d' },
    { key: 'anal',     label: '항문',       cx: 56, cy: 53, rx: 7,  ry: 5,  color: '#c9a84c' },
    { key: 'vagina',   label: '질',         cx: 55, cy: 62, rx: 4,  ry: 2.5,color: '#e94560' },
    { key: 'clitoris', label: '클리토리스', cx: 54, cy: 68, rx: 3.5,ry: 2,  color: '#e94560' },
    { key: 'thigh',    label: '엉덩이/허벅지L',    cx: 30, cy: 82, rx: 18, ry: 11, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지R',    cx: 72, cy: 82, rx: 14, ry: 11, color: '#f77f00' },
  ],
  cowgirl: [
    { key: 'mouth',    label: '입',         cx: 47, cy: 13, rx: 6,  ry: 4,  color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 47, cy: 22, rx: 7,  ry: 4,  color: '#c77dff' },
    { key: 'ear',      label: '귀L',        cx: 33, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'ear',      label: '귀R',        cx: 61, cy: 14, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴L',      cx: 35, cy: 38, rx: 16, ry: 13, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴R',      cx: 60, cy: 37, rx: 14, ry: 12, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지L',    cx: 22, cy: 75, rx: 13, ry: 16, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지R',    cx: 75, cy: 75, rx: 11, ry: 16, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 49, cy: 79, rx: 4,  ry: 2,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 49, cy: 84, rx: 3.5,ry: 2,  color: '#e94560' },
  ],
  side: [
    { key: 'mouth',    label: '입',         cx: 50, cy: 28, rx: 5.5,ry: 3.5,color: '#ff6b9d' },
    { key: 'neck',     label: '목',         cx: 50, cy: 36, rx: 7,  ry: 3,  color: '#c77dff' },
    { key: 'ear',      label: '귀',         cx: 38, cy: 27, rx: 4,  ry: 5,  color: '#a855f7' },
    { key: 'breast',   label: '가슴L',      cx: 36, cy: 48, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'breast',   label: '가슴R',      cx: 62, cy: 47, rx: 14, ry: 11, color: '#ff6b9d' },
    { key: 'thigh',    label: '엉덩이/허벅지L',    cx: 22, cy: 65, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'thigh',    label: '엉덩이/허벅지R',    cx: 76, cy: 63, rx: 13, ry: 17, color: '#f77f00' },
    { key: 'clitoris', label: '클리토리스', cx: 50, cy: 76, rx: 4,  ry: 2,  color: '#e94560' },
    { key: 'vagina',   label: '질',         cx: 50, cy: 81, rx: 3.5,ry: 2,  color: '#e94560' },
    { key: 'anal',     label: '항문',       cx: 50, cy: 87, rx: 6,  ry: 4,  color: '#c9a84c' },
  ],
}

export async function analyzePoseHotspots(imageUrl: string): Promise<HotspotZone[]> {
  // 이미지를 base64로 변환
  const resp = await fetch(imageUrl)
  const blob = await resp.blob()
  const base64 = await new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(blob)
  })

  const prompt = `You are analyzing a photo to detect human body part positions.
Look carefully at where each body part appears in the image.
For each visible part, measure its actual position as a percentage of the image dimensions (0=left/top, 100=right/bottom).
cx = horizontal center %, cy = vertical center %, rx = horizontal radius %, ry = vertical radius %.

Return ONLY a JSON object with these keys for visible parts: mouth, neckEar, breast_left, breast_right, thigh_left, thigh_right, groin_front, groin_center, groin_lower.
Each value: {"cx": <number>, "cy": <number>, "rx": <number>, "ry": <number>}
Do NOT copy example values. Measure the actual positions from this specific image.
Return ONLY valid JSON, nothing else.`

  const ollamaResp = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llava', prompt, images: [base64], stream: false })
  })
  if (!ollamaResp.ok) throw new Error(`Ollama 연결 실패: ${ollamaResp.status}`)
  const ollamaData = await ollamaResp.json()
  const text: string = ollamaData.response ?? ''
  console.log('[hotspot] ollama:', text)

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`좌표 분석 실패: ${text.slice(0, 100)}`)
  const raw = JSON.parse(jsonMatch[0])

  // 0~1 범위로 반환된 경우 100 곱해서 보정, rx/ry는 부위별 기본값 + 최대 25 제한
  const scale = (v: number) => v <= 1 ? v * 100 : v
  const DEFAULT_RX: Record<string, number> = { mouth: 8, neckEar: 7, breast: 13, thigh: 14, clitoris: 7, vagina: 7, anal: 6 }
  const DEFAULT_RY: Record<string, number> = { mouth: 4, neckEar: 3, breast: 11, thigh: 13, clitoris: 4, vagina: 4, anal: 4 }
  const clamp = (v: number, max: number) => Math.min(v, max)
  const norm = (d: any, key: string) => {
    if (!d) return null
    const cx = scale(d.cx), cy = scale(d.cy)
    const rx = d.rx != null ? clamp(scale(d.rx), 25) : DEFAULT_RX[key] ?? 8
    const ry = d.ry != null ? clamp(scale(d.ry), 20) : DEFAULT_RY[key] ?? 5
    return { cx, cy, rx, ry }
  }

  // HotspotZone 배열로 변환
  const zones: HotspotZone[] = []
  const add = (key: HotspotZone['key'], d: any) => {
    const n = norm(d, key)
    if (!n) return
    zones.push({ key, label: ZONE_LABELS[key], cx: n.cx, cy: n.cy, rx: n.rx, ry: n.ry, color: ZONE_COLORS[key] })
  }
  add('mouth', raw.mouth)
  add('neckEar', raw.neckEar)
  if (raw.breast_left)  add('breast', raw.breast_left)
  if (raw.breast_right) add('breast', raw.breast_right)
  if (!raw.breast_left && !raw.breast_right && raw.breast) add('breast', raw.breast)
  if (raw.thigh_left)  add('thigh', raw.thigh_left)
  if (raw.thigh_right) add('thigh', raw.thigh_right)
  add('clitoris', raw.clitoris ?? raw.groin_front)
  add('vagina', raw.vagina ?? raw.groin_center)
  add('anal', raw.anal ?? raw.groin_lower)

  return zones
}
