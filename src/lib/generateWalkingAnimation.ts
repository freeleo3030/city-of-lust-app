const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const KLING_API_KEY = import.meta.env.VITE_KLING_API_KEY as string
const PROXY_URL = `${SUPABASE_URL}/functions/v1/kling-proxy`

const call = (body: object) =>
  fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'x-kling-key': KLING_API_KEY,
    },
    body: JSON.stringify(body),
  }).then(r => r.json())

export async function generateWalkingAnimation(imageUrl: string): Promise<string> {
  // 1단계: 작업 생성
  const createData = await call({ action: 'create', imageUrl })
  if (createData.code !== 0) throw new Error(`Kling 오류: ${createData.message}`)
  const taskId: string = createData.data.task_id

  // 2단계: 완료될 때까지 폴링 (최대 5분)
  const start = Date.now()
  while (Date.now() - start < 300_000) {
    await new Promise(r => setTimeout(r, 5_000))
    const pollData = await call({ action: 'poll', taskId })
    if (pollData.code !== 0) continue

    const status: string = pollData.data.task_status
    if (status === 'succeed') return pollData.data.task_result.videos[0].url
    if (status === 'failed') throw new Error(`영상 생성 실패: ${pollData.data.task_status_msg}`)
  }

  throw new Error('Kling 영상 생성 시간 초과 (5분)')
}
