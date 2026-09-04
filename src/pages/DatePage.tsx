import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'
import { useScale } from '../hooks/useScale'

interface Props {
  femaleChar: FemaleCharacterData
  maleChar: any
  userId: string
  onBack: () => void
  onSexUnlocked: (char: FemaleCharacterData) => void
}

interface ChatMsg {
  id: number
  sender: 'player' | 'female'
  text: string
  delta?: number
}

interface Relationship {
  id: string
  affection: number
  meet_count: number
  meet_today: number
  daily_reset_date: string | null
  status: string
  sex_unlocked: boolean
}

const MAX_AFFECTION = 500
const SEX_UNLOCK_THRESHOLD = 450  // 90%
const MAX_MEET_COUNT = 10
const MAX_MEET_TODAY = 3

export default function DatePage({ femaleChar, maleChar, userId, onBack, onSexUnlocked }: Props) {
  const scale = useScale(1440)
  const [rel, setRel] = useState<Relationship | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatLog, setChatLog] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [missions, setMissions] = useState<string[]>([])
  const [completedMissions, setCompletedMissions] = useState<string[]>([])
  const [mannerWarnings, setMannerWarnings] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [endReason, setEndReason] = useState<'broken' | 'sex_unlocked' | 'limit' | 'timeout' | null>(null)
  const [bypassCountdown, setBypassCountdown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(600) // 10분
  const [exprIdx, setExprIdx] = useState(0) // 표정 인덱스 0~4 (평온→설렘)
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [sttLang, setSttLang] = useState<'ko' | 'en'>('ko')
  const chatHistory = useRef<{ role: string; content: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgId = useRef(0)
  const initialized = useRef(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vadAnimRef = useRef<number | null>(null)
  const voiceModeRef = useRef(false)
  const [continuousVoice, setContinuousVoice] = useState(false)
  const continuousVoiceRef = useRef(false)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatLog])

  // 음성 모드 OFF → 혹시 열린 마이크 정리
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
  }, [])

  const unlockAudio = () => { /* autoplay 정책: 버튼 클릭 시 호출로 컨텍스트 활성화 */ }

  // 로컬(개발) 모드 여부 — 로그인 없이 테스트할 때 UUID가 아닌 userId가 들어옴
  const isLocalMode = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
  const isTestChar = maleChar?.nickname === '윈드'

  // 테스트 캐릭터 bypass: 제한 메시지 표시 후 5초 카운트다운 → 대화 입력 허용
  function startBypass() {
    if (!isTestChar) return
    setBypassCountdown(5)
    countdownRef.current = setInterval(() => {
      setBypassCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          setSessionEnded(false)
          setEndReason(null)
          setTimeout(() => inputRef.current?.focus(), 100)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  // Whisper STT — 녹음 시작 (매번 새로 요청, 끝나면 즉시 해제 → 블루투스 A2DP 유지)
  const startListening = async () => {
    try {
      setListening(true)   // 즉시 "준비 중..." 표시
      setMicReady(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      micStreamRef.current = stream
      audioChunksRef.current = []

      // AudioContext: getUserMedia 직후 (사용자 제스처 컨텍스트 안) 에서 생성
      const audioCtx = new AudioContext()
      await audioCtx.resume()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)

      // 지원 코덱 순서로 선택 (Whisper 호환 우선)
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(m => MediaRecorder.isTypeSupported(m)) || ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        micStreamRef.current = null
        setListening(false)
        setMicReady(false)
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        console.log('[STT] blob size:', blob.size, 'type:', mr.mimeType, 'hadSpeech:', lastSoundAt !== null)
        // 말소리 없이 타임아웃된 경우 → STT 스킵, 연속 대화는 중단(무한루프 방지)
        if (lastSoundAt === null) {
          return
        }
        if (blob.size < 500) return
        const transcript = await whisperTranscribe(blob, mr.mimeType)
        if (transcript) sendMessageText(transcript)
      }
      mediaRecorderRef.current = mr

      // 800ms 대기: 블루투스 HFP 전환 완료 + 유저가 "말하세요!" 확인
      await new Promise(r => setTimeout(r, 800))
      mr.start(100)
      setMicReady(true)

      // VAD: setInterval로 음량 감지 → 말소리 감지 후 1.5초 침묵 시 자동 중지
      const VAD_SILENCE_MS = 1500
      const VAD_THRESHOLD = 15
      // 말소리 감지 전엔 최대 5초 대기, 감지 후부터 침묵 카운트 시작
      const VAD_MAX_WAIT_MS = 5000
      let lastSoundAt: number | null = null  // null = 아직 말소리 없음
      let waitStart = Date.now()
      console.log('[VAD] started, ctx state:', audioCtx.state)

      vadTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(buf)
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)
        const vol = Math.round(rms)
        if (vol > VAD_THRESHOLD) lastSoundAt = Date.now()
        if (Date.now() % 500 < 110) console.log('[VAD] vol:', vol, lastSoundAt !== null ? `silence: ${Date.now() - lastSoundAt}` : 'waiting')
        // 말소리 없이 5초 지나면 → 연속 대화면 다시 대기, 아니면 중지
        if (lastSoundAt === null && Date.now() - waitStart > VAD_MAX_WAIT_MS) {
          clearInterval(vadTimerRef.current!); vadTimerRef.current = null
          try { audioCtx.close() } catch {}
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
          return
        }
        if (lastSoundAt === null) return  // 아직 말소리 기다리는 중
        const silence = Date.now() - lastSoundAt
        if (silence >= VAD_SILENCE_MS) {
          console.log('[VAD] auto-stop triggered')
          clearInterval(vadTimerRef.current!)
          vadTimerRef.current = null
          try { audioCtx.close() } catch {}
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
        }
      }, 100)
    } catch {
      setListening(false)
    }
  }

  const stopListening = () => {
    if (vadAnimRef.current) { cancelAnimationFrame(vadAnimRef.current); vadAnimRef.current = null }
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setListening(false)
  }

  const stopContinuousVoice = () => {
    continuousVoiceRef.current = false
    setContinuousVoice(false)
    stopListening()
  }

  const whisperTranscribe = async (blob: Blob, mimeType?: string): Promise<string> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      // 파일 확장자를 mimeType에 맞게 설정
      const ext = mimeType?.includes('ogg') ? 'ogg' : mimeType?.includes('mp4') ? 'mp4' : 'webm'
      const form = new FormData()
      form.append('audio', blob, `audio.${ext}`)
      form.append('lang', sttLang)
      const res = await fetch(`${supabaseUrl}/functions/v1/stt`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey },
        body: form,
      })
      const data = await res.json()
      console.log('[STT] whisper result:', data.text, 'error:', data.error)
      const text = data.text ?? ''
      // Whisper가 오디오를 못 잡으면 prompt 문장을 그대로 반환하는 경우 제거
      const koPrompt = '안녕하세요. 이것은 두 사람 사이의 대화입니다.'
      const enPrompt = 'This is a casual conversation between two people.'
      if (text === koPrompt || text === enPrompt) return ''
      return text
    } catch (e) { console.error('[STT] fetch error:', e); return '' }
  }

  const getVoice = () => {
    // 나이별 OpenAI TTS 목소리 (nova=20대 밝음, shimmer=30~40대 차분함)
    const age = femaleChar.age ?? 25
    if (sttLang === 'en') return age < 30 ? 'nova' : 'shimmer'
    return age < 30 ? 'nova' : 'shimmer'
  }

  const getTtsSpeed = () => {
    const p = (femaleChar as any).personality ?? {}
    const introvert = p.introvert ?? 3  // 1=내향(느림), 5=외향(빠름)
    const friendly  = p.friendly  ?? 3  // 1=친근(부드), 5=도도(차분)
    // 외향적일수록 빠르게, 도도할수록 약간 느리게
    const speed = 1.0 + (introvert - 3) * 0.06 - (friendly - 3) * 0.03
    return Math.round(Math.max(0.8, Math.min(1.3, speed)) * 100) / 100
  }

  const speakReply = async (text: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ text, voice: getVoice(), speed: getTtsSpeed() }),
      })
      const data = await res.json()
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`)
        audio.onended = () => {
          if (continuousVoiceRef.current) startListening()
        }
        audio.onerror = () => {
          console.error('[TTS] audio error, restarting listen')
          if (continuousVoiceRef.current) startListening()
        }
        audio.play().catch(e => {
          console.error('[TTS play]', e)
          if (continuousVoiceRef.current) startListening()
        })
      } else {
        console.error('[TTS] no audioContent:', data)
        if (continuousVoiceRef.current) startListening()
      }
    } catch (e) {
      console.error('[TTS]', e)
      if (continuousVoiceRef.current) startListening()
    }
  }

  // 10분 타이머 — 로딩 끝난 후 시작, 로컬 모드만 제외 (윈드도 UI 동일하게 표시)
  useEffect(() => {
    if (loading || sessionEnded || isLocalMode) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  // 타이머 0 도달 시 종료 처리
  useEffect(() => {
    if (timeLeft === 0 && !sessionEnded && !isLocalMode) {
      setSessionEnded(true)
      setEndReason('timeout')
      startBypass()
    }
  }, [timeLeft])

  // 관계 데이터 로드 및 오늘 횟수 체크
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initRelationship()
  }, [])

  const initRelationship = async () => {
    setLoading(true)

    // 로컬 모드: DB 없이 기본값으로 바로 시작
    if (isLocalMode) {
      const defaultRel: Relationship = {
        id: `local-${femaleChar.id}`,
        affection: 0, meet_count: 0, meet_today: 0,
        daily_reset_date: null, status: 'active', sex_unlocked: false,
      }
      const newMeetCount = 1
      setRel({ ...defaultRel, meet_count: newMeetCount })
      addFemaleMsg(getGreeting(0, newMeetCount, femaleChar, maleChar?.age))
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      generateMissions(defaultRel.id, newMeetCount, 0) // 백그라운드
      return
    }

    try {
    // 1. 하루 5인 제한 체크
    const today = new Date().toISOString().slice(0, 10)
    const { data: todayLog } = await supabase
      .from('daily_date_log')
      .select('female_char_id')
      .eq('user_id', userId)
      .eq('date', today)

    const todayCharIds = todayLog?.map(r => r.female_char_id) ?? []
    const alreadyMet = todayCharIds.includes(femaleChar.id)
    if (!alreadyMet && todayCharIds.length >= 5) {
      addFemaleMsg('오늘은 너무 많이 돌아다녔나봐... 내일 다시 와.')
      setSessionEnded(true)
      setEndReason('limit')
      setLoading(false)
      startBypass()
      return
    }

    // 2. 관계 로드 또는 생성
    let { data: relData } = await supabase
      .from('relationships')
      .select('*')
      .eq('user_id', userId)
      .eq('female_char_id', femaleChar.id)
      .maybeSingle()

    if (!relData) {
      const { data: newRel } = await supabase
        .from('relationships')
        .insert({ user_id: userId, female_char_id: femaleChar.id })
        .select()
        .single()
      relData = newRel
    }

    if (!relData) { setLoading(false); return }

    // 3. 날짜 리셋 처리 (자정 넘으면 meet_today 초기화)
    let meetToday = relData.meet_today
    if (relData.daily_reset_date !== today) {
      await supabase.from('relationships').update({ meet_today: 0, daily_reset_date: today }).eq('id', relData.id)
      meetToday = 0
      relData = { ...relData, meet_today: 0, daily_reset_date: today }
    }

    // 4. 한도 체크
    if (relData.status === 'broken') {
      addFemaleMsg('...우린 이미 끝났잖아.')
      setSessionEnded(true)
      setEndReason('broken')
      setRel(relData)
      setLoading(false)
      startBypass()
      return
    }
    if (meetToday >= MAX_MEET_TODAY) {
      addFemaleMsg('오늘은 충분히 봤어. 내일 또 보자.')
      setSessionEnded(true)
      setEndReason('limit')
      setRel(relData)
      setLoading(false)
      startBypass()
      return
    }
    if (relData.meet_count >= MAX_MEET_COUNT) {
      // 10회 초과 - 호감도 체크
      if (relData.affection < SEX_UNLOCK_THRESHOLD) {
        await supabase.from('relationships').update({ status: 'broken' }).eq('id', relData.id)
        addFemaleMsg('...우리 이제 그냥 모르는 사이로 지내자. 미안해.')
        setSessionEnded(true)
        setEndReason('broken')
        startBypass()
      }
      setRel(relData)
      setLoading(false)
      return
    }

    setRel(relData)

    // 5. 오늘 처음 만나는 여캐면 daily_date_log 기록
    if (!alreadyMet) {
      await supabase.from('daily_date_log').upsert({ user_id: userId, female_char_id: femaleChar.id, date: today })
    }

    // 6. 만남 횟수 증가
    const newMeetCount = relData.meet_count + 1
    const newMeetToday = meetToday + 1
    await supabase.from('relationships').update({ meet_count: newMeetCount, meet_today: newMeetToday }).eq('id', relData.id)
    setRel(prev => prev ? { ...prev, meet_count: newMeetCount, meet_today: newMeetToday } : prev)

    // 7. 첫인사 먼저 (미션은 백그라운드)
    const greeting = getGreeting(relData.affection, newMeetCount, femaleChar, maleChar?.age)
    addFemaleMsg(greeting)
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
    generateMissions(relData.id, newMeetCount, relData.affection) // 백그라운드
    } catch (e) {
      console.error('[DatePage] initRelationship error:', e)
      setLoading(false)
    }
  }

  const generateMissions = async (relId: string, meetNum: number, affection: number) => {
    // 이번 만남의 미션 개수 = 만남 횟수 (max 10)
    const missionCount = Math.min(meetNum, 10)

    // 이미 이번 만남 미션이 있으면 스킵 (DB 모드만)
    if (!isLocalMode) {
      const { data: existing } = await supabase
        .from('date_missions')
        .select('content, completed')
        .eq('relationship_id', relId)
        .eq('meet_number', meetNum)
      if (existing && existing.length > 0) {
        setMissions(existing.map(m => m.content))
        setCompletedMissions(existing.filter(m => m.completed).map(m => m.content))
        return
      }
    }

    // 템플릿 기반 미션 생성 (AI 불안정하여 로컬 생성으로 대체)
    try {
      const job = femaleChar.job ?? ''
      const interests = femaleChar.interestTags ?? []
      const pool: string[] = [
        interests[0] ? `${interests[0]} 얘기하기` : '취미 물어보기',
        `${job} 일 어떤지 물어보기`,
        '최근 여행 얘기 꺼내기',
        '좋아하는 음식 물어보기',
        '주말 뭐 하는지 물어보기',
        interests[1] ? `${interests[1]} 얘기 꺼내기` : '평소 취미 물어보기',
        '요즘 재미있는 거 물어보기',
        '좋아하는 영화/드라마 물어보기',
        '자주 가는 장소 물어보기',
        '가고 싶은 여행지 물어보기',
      ]
      const missionList = pool.slice(0, missionCount)
      console.log('[Mission] local generated:', missionList)
      setMissions(missionList)
      if (!isLocalMode) {
        await supabase.from('date_missions').insert(
          missionList.map(m => ({ relationship_id: relId, meet_number: meetNum, content: m }))
        )
      }
    } catch { /* 미션 생성 실패해도 대화는 진행 */ }
  }

  const buildCharContext = (affection: number, meetCount: number) => ({
    name: femaleChar.nickname,
    nickname: femaleChar.nickname,
    age: femaleChar.age,
    married: femaleChar.married,
    job: femaleChar.job,
    bodyType: femaleChar.bodyType,
    personality: femaleChar.personality,
    interestTags: femaleChar.interestTags,
    dislikeTags: femaleChar.dislikeTags,
    maleAge: maleChar?.age ?? null,
    affection,
    meetCount,
  })

  const addFemaleMsg = (text: string, delta?: number) => {
    setChatLog(prev => [...prev, { id: msgId.current++, sender: 'female', text, delta }])
  }
  const addPlayerMsg = (text: string) => {
    setChatLog(prev => [...prev, { id: msgId.current++, sender: 'player', text }])
  }

  const sendMessageText = async (text: string) => {
    if (!text || sending || sessionEnded || !rel) return
    // 직전 메시지와 동일하면 중복 무시 (STT 더블 트리거 방지)
    const lastMsg = chatHistory.current[chatHistory.current.length - 1]
    if (lastMsg?.role === 'user' && lastMsg?.content === text) return
    setInput('')
    addPlayerMsg(text)
    setSending(true)
    chatHistory.current.push({ role: 'user', content: text })

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({
          message: text,
          history: chatHistory.current.slice(-8),
          charContext: buildCharContext(rel.affection, rel.meet_count),
          missionContext: { missions, completed: completedMissions },
          lang: sttLang,
        }),
      })
      const data = await res.json()
      console.log('[Gemini] res status:', res.status, 'data:', JSON.stringify(data).slice(0, 200))
      let reply: string = data.reply || '...'
      // 혹시 reply에 JSON 전체가 들어온 경우 방어
      if (reply.startsWith('{') || reply.startsWith('```')) {
        try {
          const inner = JSON.parse((reply.match(/\{[\s\S]*\}/) ?? [])[0] ?? '')
          if (inner?.reply) reply = inner.reply
        } catch { reply = '...' }
      }
      const delta: number = data.affection_delta ?? 0
      const mannerViolation: boolean = data.manner_violation ?? false
      const missionCompleted: boolean = data.mission_completed ?? false

      // 표정 업데이트 (0:평온 1:기쁨 2:수줍음 3:실망 4:기대), 3초 후 평온 복귀
      // delta >= 20: 기쁨, delta 10~19: 수줍음, delta 1~9: 기대, delta 0: 평온, delta < 0 또는 매너위반: 실망
      const newExpr = mannerViolation || delta < 0 ? 3 : delta >= 20 ? 1 : delta >= 10 ? 2 : delta >= 1 ? 4 : 0
      setExprIdx(newExpr)
      setTimeout(() => setExprIdx(0), 3000)

      // 빈 응답은 히스토리에 넣지 않음 (쌓이면 Gemini 혼란 유발)
      if (data.reply) chatHistory.current.push({ role: 'assistant', content: reply })

      // 호감도 업데이트
      const newAffection = Math.max(0, Math.min(MAX_AFFECTION, rel.affection + delta))
      if (!isLocalMode) {
        await supabase.from('relationships').update({ affection: newAffection }).eq('id', rel.id)
        await supabase.from('date_messages').insert([
          { relationship_id: rel.id, sender: 'player', content: text, affection_delta: 0 },
          { relationship_id: rel.id, sender: 'female', content: reply, affection_delta: delta, manner_violation: mannerViolation },
        ])
      }

      // 매너 위반 처리
      if (mannerViolation) {
        const newWarnings = mannerWarnings + 1
        setMannerWarnings(newWarnings)
        if (newWarnings >= 3) {
          addFemaleMsg('...이제 그만해. 다신 나한테 연락하지 마.')
          if (!isLocalMode) await supabase.from('relationships').update({ status: 'broken', affection: 0 }).eq('id', rel.id)
          setSessionEnded(true)
          setEndReason('broken')
          setRel(prev => prev ? { ...prev, affection: 0, status: 'broken' } : prev)
          startBypass()
          return
        }
      }

      // 미션 완수 처리
      if (missionCompleted && missions.length > 0) {
        const unfinished = missions.find(m => !completedMissions.includes(m))
        if (unfinished) {
          setCompletedMissions(prev => [...prev, unfinished])
          if (!isLocalMode) {
            await supabase.from('date_missions')
              .update({ completed: true })
              .eq('relationship_id', rel.id)
              .eq('content', unfinished)
          }
        }
      }

      setRel(prev => prev ? { ...prev, affection: newAffection } : prev)
      addFemaleMsg(reply, delta)
      if (voiceMode && reply && reply !== '...') speakReply(reply)

      // SEX 잠금 해제 체크
      if (newAffection >= SEX_UNLOCK_THRESHOLD && !rel.sex_unlocked) {
        if (!isLocalMode) await supabase.from('relationships').update({ sex_unlocked: true, status: 'sex_unlocked' }).eq('id', rel.id)
        setRel(prev => prev ? { ...prev, sex_unlocked: true, status: 'sex_unlocked' } : prev)
        if (timerRef.current) clearInterval(timerRef.current) // SEX 해제 시 타이머 정지
        setTimeout(() => {
          addFemaleMsg('...사실 너한테 특별한 감정이 생긴 것 같아. 오늘 좀 더 있어줄 수 있어?')
        }, 800)
      }
    } catch {
      addFemaleMsg('...')
    } finally {
      setSending(false)
      if (!voiceMode) inputRef.current?.focus()
    }
  }

  const sendMessage = () => sendMessageText(input.trim())

  const affectionPct = rel ? Math.round((rel.affection / MAX_AFFECTION) * 100) : 0
  const barColor = affectionPct >= 90 ? '#c9a84c' : affectionPct >= 50 ? '#e94560' : '#4FC3F7'

  const exprImgSrc = femaleChar.expressionImages?.[exprIdx] || femaleChar.expressionImages?.[0] || femaleChar.imageUrl

  if (loading) return (
    <div style={S.container}>
      <div style={{ color: '#ffffff88', textAlign: 'center', marginTop: 60 }}>잠시만...</div>
    </div>
  )

  return (
    <div style={S.container}>

      {/* ── 좌: 표정 이미지 ── */}
      <div style={S.imagePanel}>
        {exprImgSrc ? (
          <img
            src={exprImgSrc}
            style={S.exprImg}
            alt=""
            draggable={false}
          />
        ) : (
          <div style={{ height: '100%', width: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff22', fontSize: 48 }}>👤</div>
        )}
      </div>

      {/* ── 우: 채팅 패널 ── */}
      <div style={{ ...S.sidePanel, zoom: scale * 0.8 }}>

        {/* 헤더 */}
        <div style={S.header}>
          <button style={S.backBtn} onClick={onBack}>← 나가기</button>
          <div style={S.headerCenter}>
            <div>
              <div style={S.charName}>{femaleChar.nickname}</div>
              <div style={S.charSub}>{femaleChar.job} · {femaleChar.age}세</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {!isLocalMode && (
              <div style={{ color: timeLeft <= 30 ? '#e94560' : '#ffffff88', fontSize: 12, fontWeight: timeLeft <= 30 ? 'bold' : 'normal', fontVariantNumeric: 'tabular-nums' }}>
                ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            )}
            <div style={S.meetBadge}>{rel?.meet_count ?? 0}/{MAX_MEET_COUNT}회</div>
          </div>
        </div>

        {/* 호감도 바 */}
        <div style={S.affectionWrap}>
          <div style={S.affectionLabel}>
            <span style={{ color: '#ffffff88', fontSize: 11 }}>호감도</span>
            <span style={{ color: barColor, fontWeight: 'bold', fontSize: 12 }}>{rel?.affection ?? 0} / {MAX_AFFECTION}</span>
          </div>
          <div style={S.barBg}>
            <div style={{ ...S.barFill, width: `${affectionPct}%`, background: barColor }} />
            <div style={{ ...S.marker, left: '90%' }} title="SEX 잠금 해제">❤️</div>
          </div>
          {rel?.sex_unlocked && (
            <button style={S.sexBtn} onClick={() => onSexUnlocked(femaleChar)}>❤️‍🔥 SEX</button>
          )}
        </div>

        {/* 미션 패널 */}
        {missions.length > 0 && (
          <div style={S.missionPanel}>
            <div style={S.missionTitle}>📋 오늘의 미션 ({completedMissions.length}/{missions.length})</div>
            {missions.map((m, i) => (
              <div key={i} style={{ ...S.missionItem, opacity: completedMissions.includes(m) ? 0.5 : 1 }}>
                <span style={{ color: completedMissions.includes(m) ? '#4FC3F7' : '#ffffff88', marginRight: 6 }}>
                  {completedMissions.includes(m) ? '✓' : '○'}
                </span>
                <span style={{ color: '#ffffffcc', fontSize: 11 }}>{m}</span>
              </div>
            ))}
          </div>
        )}

        {/* 매너 경고 */}
        {mannerWarnings > 0 && (
          <div style={S.warningBar}>
            ⚠️ 매너 경고 {mannerWarnings}/3 {mannerWarnings >= 2 ? '— 한 번 더 하면 강제 종료!' : ''}
          </div>
        )}

        {/* 채팅 */}
        <div style={S.chatArea}>
          {chatLog.map(msg => (
            <div key={msg.id} style={{ ...S.msgRow, justifyContent: msg.sender === 'player' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                ...S.bubble,
                background: msg.sender === 'player' ? '#2a2a4a' : '#1a1a2e',
                border: msg.sender === 'player' ? '1px solid #4FC3F744' : '1px solid #c9a84c44',
                borderRadius: msg.sender === 'player' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              }}>
                <span style={{ color: '#ffffffdd', fontSize: 13, lineHeight: 1.5 }}>{msg.text}</span>
                {msg.delta !== undefined && msg.delta !== 0 && (
                  <span style={{ color: msg.delta > 0 ? '#4FC3F7' : '#e94560', fontSize: 11, marginLeft: 6 }}>
                    {msg.delta > 0 ? `+${msg.delta}` : msg.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ ...S.msgRow, justifyContent: 'flex-start' }}>
              <div style={{ ...S.bubble, background: '#1a1a2e', border: '1px solid #c9a84c44', borderRadius: '4px 16px 16px 16px' }}>
                <span style={{ color: '#ffffff66', fontSize: 13 }}>...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 종료 화면 or 입력창 */}
        {sessionEnded ? (
          <div style={S.endPanel}>
            {endReason === 'broken'      && <div style={{ color: '#e94560', marginBottom: 8 }}>💔 관계가 끝났어</div>}
            {endReason === 'limit'       && <div style={{ color: '#ffffff88', marginBottom: 8 }}>오늘은 여기까지야</div>}
            {endReason === 'sex_unlocked'&& <div style={{ color: '#c9a84c', marginBottom: 8 }}>❤️ SEX 잠금 해제!</div>}
            {endReason === 'timeout'     && <div style={{ color: '#e94560', marginBottom: 8 }}>⏰ 시간이 다 됐어...</div>}
            {bypassCountdown > 0 && (
              <div style={{ color: '#c9a84c', fontSize: 12, marginBottom: 8 }}>
                [TEST] {bypassCountdown}초 후 자동 진입...
              </div>
            )}
            <button style={S.backBtn} onClick={onBack}>나가기</button>
          </div>
        ) : (
          <>
            {/* 음성/텍스트 모드 토글 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 12px 0', gap: 6 }}>
              <button
                style={{ ...S.modeBtn, background: !voiceMode ? '#c9a84c22' : 'none', color: !voiceMode ? '#c9a84c' : '#ffffff44', border: `1px solid ${!voiceMode ? '#c9a84c' : '#ffffff22'}` }}
                onClick={() => { setVoiceMode(false); stopContinuousVoice(); window.speechSynthesis.cancel() }}
              >⌨️ 텍스트</button>
              <button
                style={{ ...S.modeBtn, background: voiceMode ? '#e9456022' : 'none', color: voiceMode ? '#e94560' : '#ffffff44', border: `1px solid ${voiceMode ? '#e94560' : '#ffffff22'}` }}
                onClick={() => { unlockAudio(); setVoiceMode(true) }}
              >🎤 음성</button>
            </div>

            {voiceMode ? (
              /* 음성 모드 입력 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px 8px' }}>
                {/* 연속 대화 상태 표시 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    style={{ width: 36, flexShrink: 0, background: '#1a1a2e', border: '1px solid #ffffff22', borderRadius: 8, padding: '7px 4px', color: '#ffffffcc', fontSize: 14, cursor: 'pointer' }}
                    onClick={() => { if (continuousVoice) { continuousVoiceRef.current = false; setContinuousVoice(false); stopListening() } setSttLang(l => l === 'ko' ? 'en' : 'ko') }}
                    title="언어 전환"
                  >{sttLang === 'ko' ? '🇰🇷' : '🇺🇸'}</button>
                  {!continuousVoice ? (
                    <button
                      style={{ flex: 1, background: '#e9456033', border: '1px solid #e94560', borderRadius: 8, padding: '9px 12px', color: '#e94560', fontSize: 13, cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => { unlockAudio(); continuousVoiceRef.current = true; setContinuousVoice(true); startListening() }}
                    >🎤 음성 대화 시작하기</button>
                  ) : (
                    <button
                      style={{ flex: 1, background: listening ? '#e9456055' : sending ? '#ffffff11' : '#ffffff11', border: `1px solid ${listening ? '#e94560' : '#ffffff33'}`, borderRadius: 8, padding: '9px 12px', color: listening ? '#e94560' : '#ffffff66', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => { continuousVoiceRef.current = false; setContinuousVoice(false); stopListening() }}
                    >
                      {listening && !micReady ? '⏳ 잠깐...' : listening ? '🔴 듣는 중... (탭하면 종료)' : sending ? '⏳ 답변 중...' : '💬 대기 중... (탭하면 종료)'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* 텍스트 모드 입력 */
              <div style={S.inputRow}>
                <input
                  ref={inputRef}
                  style={S.input}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, 200))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="말을 걸어봐... (200자)"
                  disabled={sending}
                />
                <button style={{ ...S.sendBtn, opacity: sending || !input.trim() ? 0.5 : 1 }} onClick={sendMessage} disabled={sending || !input.trim()}>
                  전송
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function getGreeting(affection: number, meetCount: number, char: FemaleCharacterData, maleAge?: number): string {
  // 여캐가 남캐보다 어리면 존댓말, 같거나 많으면 반말
  const formal = maleAge != null && char.age < maleAge

  if (meetCount === 1) {
    return formal
      ? `안녕하세요, 저 ${char.nickname}이에요. 처음 뵙는 분이죠...?`
      : `안녕, 나 ${char.nickname}이야. 처음 보는 얼굴인데...`
  }
  if (affection < 100) return formal ? `어, 또 오셨어요?` : `어, 또 왔어?`
  if (affection < 250) return formal ? `오셨네요. 오늘은 무슨 일이에요?` : `왔어. 오늘은 무슨 일이야?`
  if (affection < 400) return formal ? `어, 오셨구나. 기다리고 있었어요.` : `어, 왔구나. 기다리고 있었어.`
  return formal ? `오셨어요~ 보고 싶었어요.` : `왔어~ 보고 싶었어.`
}

const S: Record<string, React.CSSProperties> = {
  // 전체 컨테이너 — 좌우 2단
  container:    { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'row', background: '#0d0d1a', color: '#fff', fontFamily: 'sans-serif' },

  // 좌: 표정 이미지 — SexScene과 동일 (height:100%, width:auto, flexShrink:0)
  imagePanel:   { position: 'relative', height: '100%', flexShrink: 0, minWidth: 10 },
  exprImg:      { height: '100%', width: 'auto', display: 'block' },

  // 우: 사이드 채팅 패널
  sidePanel:    { flexShrink: 0, width: 340, height: '100%', background: 'rgba(10,10,22,0.97)', borderLeft: '1px solid #ffffff18', display: 'flex', flexDirection: 'column', overflow: 'hidden' },

  // 헤더
  header:       { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #ffffff11', flexShrink: 0 },
  backBtn:      { background: 'none', border: '1px solid #ffffff33', borderRadius: 8, color: '#ffffffcc', padding: '5px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  headerCenter: { flex: 1, minWidth: 0 },
  charName:     { fontWeight: 'bold', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  charSub:      { color: '#ffffff66', fontSize: 11 },
  meetBadge:    { color: '#ffffff88', fontSize: 11, background: '#ffffff11', borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' },

  // 호감도
  affectionWrap:  { padding: '7px 12px', borderBottom: '1px solid #ffffff11', flexShrink: 0 },
  affectionLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  barBg:          { height: 7, background: '#ffffff11', borderRadius: 4, position: 'relative' },
  barFill:        { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  marker:         { position: 'absolute', top: -5, transform: 'translateX(-50%)', fontSize: 12 },
  sexBtn:         { marginTop: 7, width: '100%', background: 'linear-gradient(135deg, #e94560, #c9a84c)', border: 'none', borderRadius: 8, padding: '9px 0', color: '#fff', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' },

  // 미션
  missionPanel: { padding: '6px 12px', borderBottom: '1px solid #ffffff11', background: '#0a0a15', flexShrink: 0 },
  missionTitle: { color: '#c9a84c', fontSize: 11, fontWeight: 'bold', marginBottom: 3 },
  missionItem:  { display: 'flex', alignItems: 'center', marginBottom: 2 },

  // 경고
  warningBar:   { padding: '5px 12px', background: '#e9456022', color: '#e94560', fontSize: 11, flexShrink: 0 },

  // 채팅
  chatArea:     { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 },
  msgRow:       { display: 'flex', alignItems: 'flex-end', gap: 6 },
  bubble:       { maxWidth: '90%', padding: '8px 12px', wordBreak: 'break-word', borderRadius: 10 },

  // 모드 토글
  modeBtn:      { fontSize: 11, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', background: 'none', transition: 'all 0.2s' },

  // 입력
  inputRow:     { display: 'flex', gap: 6, padding: '10px 12px', borderTop: '1px solid #ffffff11', flexShrink: 0 },
  input:        { flex: 1, background: '#1a1a2e', border: '1px solid #ffffff22', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' },
  sendBtn:      { background: '#c9a84c', border: 'none', borderRadius: 8, padding: '9px 14px', color: '#000', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' },
  endPanel:     { padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #ffffff11', flexShrink: 0 },
}
