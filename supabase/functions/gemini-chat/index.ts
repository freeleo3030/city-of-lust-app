const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
    const { message, history, charContext, missionContext, lang } = await req.json()

    const systemPrompt = buildSystemPrompt(charContext, missionContext, lang)

    // Gemini contents 형식으로 변환
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

    // JSON 파싱 — Gemini가 텍스트+JSON 혼합으로 출력할 수 있으므로 JSON 블록만 추출
    let reply = ''
    let affection_delta = 0
    let manner_violation = false
    let mission_completed = false

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('no json')
      const parsed = JSON.parse(jsonMatch[0])
      reply = parsed.reply ?? ''
      affection_delta = parsed.affection_delta ?? 0
      manner_violation = parsed.manner_violation ?? false
      mission_completed = parsed.mission_completed ?? false
    } catch {
      reply = raw.replace(/```[\s\S]*$/g, '').trim() || ''
    }

    if (!reply || reply === '...') reply = '흠...'

    return new Response(JSON.stringify({ reply, affection_delta, manner_violation, mission_completed }), {
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: cors,
    })
  }
})

function buildSystemPrompt(ctx: any, missionCtx: any, lang: string): string {
  const name = ctx?.name ?? '그녀'
  const age = ctx?.age ?? 25
  const ageLabel = age < 30 ? '20대' : age < 40 ? '30대' : '40대'
  const married = ctx?.married ?? '미혼'
  const job = ctx?.job ?? '직장인'
  const bodyType = ctx?.bodyType ?? '슬랜더'

  const dateCostShare: number = ctx?.dateCostShare ?? 50
  const p = ctx?.personality ?? { introvert: 3, indirect: 3, friendly: 3 }
  const introvertLabel = p.introvert <= 2 ? '내성적' : p.introvert >= 4 ? '외향적' : '중간'
  const indirectLabel = p.indirect <= 2 ? '우회적' : p.indirect >= 4 ? '직설적' : '중간'
  const friendlyLabel = p.friendly <= 2 ? '친근하고 상냥함' : p.friendly >= 4 ? '도도하고 자신감 있음' : '중간'

  const interests = (ctx?.interestTags ?? []).join(', ') || '없음'
  const dislikes = (ctx?.dislikeTags ?? []).join(', ') || '없음'

  const affection = ctx?.affection ?? 0
  const affectionLabel = affection < 100 ? '초반 (아직 서먹함)' : affection < 250 ? '중반 (친근해지는 중)' : affection < 400 ? '호감 (설레는 감정)' : '고호감 (강한 끌림)'

  const meetCount = ctx?.meetCount ?? 1

  const maleName = ctx?.maleNickname ?? null
  const maleAge = ctx?.maleAge ?? null
  const maleJob = ctx?.maleJob ?? null
  const maleInfo = maleName
    ? `상대방: ${maleName}${maleAge ? `, ${maleAge}세` : ''}${maleJob ? `, ${maleJob}` : ''}`
    : '상대방 정보 없음'

  const prevSummary = ctx?.prevSummary ?? ''

  const missions = missionCtx?.missions ?? []
  const completed = missionCtx?.completed ?? []
  const remaining = missions.filter((m: string) => !completed.includes(m))

  const cooldownNote = meetCount >= 9 ? '이 여자는 이 남자에게 거의 흥미를 잃었다. 퉁명스럽고 빨리 끝내고 싶어한다.'
    : meetCount >= 7 ? '이 여자는 이 남자에게 점점 흥미를 잃어가고 있다. 조금 냉담하게 반응한다.'
    : meetCount >= 5 ? '이 여자는 이 남자와의 만남이 익숙해지고 설렘이 줄었다. 평범하게 반응한다.'
    : ''

  return `너는 데이팅 시뮬레이션 게임 속 여성 캐릭터 '${name}'이야. 절대로 캐릭터에서 벗어나지 마.

【기본 정보】
나이: ${ageLabel} (${age}세) | 결혼: ${married} | 직업: ${job} | 체형: ${bodyType}
만남 횟수: ${meetCount}회차

【성격】
${introvertLabel}, ${indirectLabel}, ${friendlyLabel}
관심사: ${interests}
싫어하는 것: ${dislikes}
데이트 비용: ${dateCostShare === 0 ? '절대 안 냄 (남성이 100% 부담해야 함. 반반 제안도 단호히 거절)' : dateCostShare <= 30 ? `가끔 조금 낼 수 있음 (${dateCostShare}%)` : dateCostShare <= 60 ? `더치페이 수용 (${dateCostShare}%)` : dateCostShare <= 90 ? `자주 내는 편 (${dateCostShare}%)` : '항상 여성이 냄 (100%)'}

【상대방 정보】
${maleInfo}

【현재 호감도】
${affectionLabel} (${affection}/500)
${cooldownNote}

${prevSummary ? `【이전 대화 기억】\n${prevSummary}\n` : ''}
${remaining.length > 0 ? `【오늘 대화 미션】\n${remaining.map((m: string) => `- ${m}`).join('\n')}\n` : ''}
【응답 형식】
반드시 아래 JSON으로만 응답해. 다른 텍스트 절대 금지.
{
  "reply": "1~2문장 한국어 대사",
  "affection_delta": 숫자(-20~+30),
  "manner_violation": false,
  "mission_completed": false
}

규칙:
- reply는 ${lang === 'en' ? '영어' : '한국어'}로, 반드시 1~2문장의 실제 대사로 작성
- reply에 절대 "..."만 쓰지 마. 반드시 실제 문장으로 답해.
- affection_delta: 관심사(${interests}) 주제 대화 성공 시 +8~+15, 일반 좋은 대화 +3~+8, 보통 0~+3, 나쁜 대화 -3~-10
- manner_violation: 욕설/성희롱/무례 시 true
- mission_completed: 미션 주제 대화 성공 시 true
- 상대방 이름(${maleName ?? '상대'})을 자연스럽게 가끔 불러줘`
}
