const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INTERACTION_RESULTS = [
  'neutral','good_conversation','made_laugh','shared_interest','good_compliment',
  'showed_empathy','remembered_detail','shared_secret','respected_boundary',
  'kept_promise','good_date','successful_flirt','awkward_moment','poor_conversation',
  'inappropriate_question','manner_violation','ignored_boundary','broke_promise',
  'dishonesty','conflict_resolved','good_apology',
] as const

type InteractionResult = typeof INTERACTION_RESULTS[number]

function safeResult(raw: string): InteractionResult {
  return (INTERACTION_RESULTS as readonly string[]).includes(raw)
    ? (raw as InteractionResult)
    : 'neutral'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
    const { message, history, charContext, missionContext, lang } = await req.json()

    const systemPrompt = buildSystemPrompt(charContext, missionContext, lang)

    const contents = [
      ...((history ?? []) as { role: string; content: string }[]).slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1500, temperature: 0.9 },
      }),
    })

    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let reply = ''
    let interaction_result: InteractionResult = 'neutral'
    let emotion = 'neutral'
    let intensity = 0.5
    let gesture = 'idle'
    let eye_contact = 0.5
    let target_trait = ''
    let manner_violation = false
    let mission_completed = false

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('no json')
      const parsed = JSON.parse(jsonMatch[0])
      reply             = parsed.reply ?? ''
      interaction_result = safeResult(parsed.interaction_result ?? 'neutral')
      emotion           = parsed.emotion ?? 'neutral'
      intensity         = Math.max(0, Math.min(1, parsed.intensity ?? 0.5))
      gesture           = parsed.gesture ?? 'idle'
      eye_contact       = Math.max(0, Math.min(1, parsed.eye_contact ?? 0.5))
      target_trait      = parsed.target_trait ?? ''
      manner_violation  = interaction_result === 'manner_violation' || interaction_result === 'ignored_boundary'
      mission_completed = parsed.mission_completed ?? false
    } catch {
      reply = raw.replace(/```[\s\S]*$/g, '').trim() || ''
    }

    if (!reply || reply === '...') reply = '흠...'

    return new Response(JSON.stringify({
      reply,
      interaction_result,
      emotion,
      intensity,
      gesture,
      eye_contact,
      target_trait,
      manner_violation,
      mission_completed,
    }), {
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: cors,
    })
  }
})

function getTrustLevel(trust: number): string {
  if (trust < 20) return 'guarded'
  if (trust < 40) return 'exploring'
  if (trust < 60) return 'comfortable'
  if (trust < 80) return 'trusting'
  return 'deep_trust'
}

function buildSystemPrompt(ctx: any, missionCtx: any, lang: string): string {
  const name        = ctx?.name ?? '그녀'
  const age         = ctx?.age ?? 25
  const ageLabel    = age < 30 ? '20대' : age < 40 ? '30대' : '40대'
  const married     = ctx?.married ?? '미혼'
  const job         = ctx?.job ?? '직장인'
  const bodyType    = ctx?.bodyType ?? '슬랜더'
  const dateCostShare: number = ctx?.dateCostShare ?? 50
  const p           = ctx?.personality ?? { introvert: 3, indirect: 3, friendly: 3 }
  const interests   = (ctx?.interestTags ?? []).join(', ') || '없음'
  const dislikes    = (ctx?.dislikeTags ?? []).join(', ') || '없음'

  const introvertLabel = p.introvert <= 2 ? '내성적' : p.introvert >= 4 ? '외향적' : '중간'
  const indirectLabel  = p.indirect  <= 2 ? '우회적' : p.indirect  >= 4 ? '직설적' : '중간'
  const friendlyLabel  = p.friendly  <= 2 ? '친근하고 상냥함' : p.friendly >= 4 ? '도도하고 자신감 있음' : '중간'

  // 관계 상태
  const rel         = ctx?.relationship ?? {}
  const affection   = rel.affection ?? 0
  const trust       = rel.trust ?? 0
  const comfort     = rel.comfort ?? 0
  const attraction  = rel.attraction ?? 0
  const conflict    = rel.conflict ?? 0
  const stage       = rel.stage ?? 'stranger'
  const trustLevel  = getTrustLevel(trust)
  const meetCount   = ctx?.meetCount ?? 1

  const stageLabel: Record<string, string> = {
    stranger: '처음 만남', interested: '관심 생김',
    dating: '데이트 중', intimate: '친밀한 사이', relationship: '연인',
  }
  const trustDesc: Record<string, string> = {
    guarded:     '경계하고 있음 — 짧게 답하고 사적인 이야기 피함',
    exploring:   '조금씩 탐색 중 — 가벼운 개인 이야기는 함',
    comfortable: '편안해짐 — 경험/고민도 나눌 수 있음',
    trusting:    '신뢰함 — 감정 표현 많고 먼저 이야기 꺼냄',
    deep_trust:  '깊이 신뢰함 — 취약한 이야기도 공유 가능',
  }

  const maleName = ctx?.maleNickname ?? null
  const maleAge  = ctx?.maleAge ?? null
  const maleJob  = ctx?.maleJob ?? null
  const maleInfo = maleName
    ? `상대방: ${maleName}${maleAge ? `, ${maleAge}세` : ''}${maleJob ? `, ${maleJob}` : ''}`
    : '상대방 정보 없음'

  const prevSummary = ctx?.prevSummary ?? ''

  const missions  = missionCtx?.missions ?? []
  const completed = missionCtx?.completed ?? []
  const remaining = missions.filter((m: string) => !completed.includes(m))

  const costDesc = dateCostShare === 0
    ? '절대 안 냄 (남성이 100% 부담. 반반 제안도 단호히 거절)'
    : dateCostShare <= 30 ? `가끔 조금 낼 수 있음 (${dateCostShare}%)`
    : dateCostShare <= 60 ? `더치페이 수용 (${dateCostShare}%)`
    : dateCostShare <= 90 ? `자주 내는 편 (${dateCostShare}%)`
    : '항상 여성이 냄 (100%)'

  const INTERACTION_LIST = [
    'neutral','good_conversation','made_laugh','shared_interest','good_compliment',
    'showed_empathy','remembered_detail','shared_secret','respected_boundary',
    'kept_promise','good_date','successful_flirt','awkward_moment','poor_conversation',
    'inappropriate_question','manner_violation','ignored_boundary','broke_promise',
    'dishonesty','conflict_resolved','good_apology',
  ].join(' | ')

  return `너는 데이팅 시뮬레이션 게임 속 여성 캐릭터 '${name}'이야. 절대로 캐릭터에서 벗어나지 마.

【기본 정보】
나이: ${ageLabel} (${age}세) | 결혼: ${married} | 직업: ${job} | 체형: ${bodyType}
만남 횟수: ${meetCount}회차 | 데이트 비용: ${costDesc}

【성격】
${introvertLabel}, ${indirectLabel}, ${friendlyLabel}
관심사: ${interests} | 싫어하는 것: ${dislikes}

【상대방 정보】
${maleInfo}

【현재 관계 상태】
단계: ${stageLabel[stage] ?? stage} (${stage})
호감: ${affection}/500 | 신뢰: ${trust}/100 (${trustLevel}) | 편안함: ${comfort}/100
끌림: ${attraction}/100 | 갈등: ${conflict}/100
신뢰 상태: ${trustDesc[trustLevel]}

${conflict >= 60 ? '⚠️ 갈등이 심각하게 쌓여 있음 — 퉁명스럽고 경계가 강함\n' : ''}
${prevSummary ? `【이전 대화 기억】\n${prevSummary}\n` : ''}
${remaining.length > 0 ? `【오늘 대화 미션】\n${remaining.map((m: string) => `- ${m}`).join('\n')}\n` : ''}
【응답 형식】
반드시 아래 JSON으로만 응답해. 다른 텍스트 절대 금지.
{
  "reply": "1~2문장 한국어 대사",
  "interaction_result": "${INTERACTION_LIST}" 중 하나,
  "emotion": "neutral | happy | sad | annoyed | shy | surprised | laugh | touched",
  "intensity": 0.0~1.0,
  "gesture": "idle | smile | look_away | nod | shake_head | lean_in | cross_arms | wave",
  "eye_contact": 0.0~1.0,
  "target_trait": "humor | empathy | appearance | fashion | reliability | interest | 빈문자열",
  "mission_completed": false
}

규칙:
- reply는 ${lang === 'en' ? '영어' : '한국어'}로, 반드시 실제 대사 1~2문장
- reply에 절대 "..."만 쓰지 마
- interaction_result는 반드시 위 목록 중 하나만
- intensity: 상황이 강렬할수록 높음 (가벼운 일상=0.2, 감동=0.8)
- eye_contact: trust 낮으면 낮게, 친밀할수록 높게
- target_trait: 이번 대화에서 영향받은 NPC 선호 특성 (없으면 빈문자열)
- 상대방 이름(${maleName ?? '상대'})을 자연스럽게 가끔 불러줘
- trust < 40이면 사적인 질문에 회피하거나 짧게 답해`
}
