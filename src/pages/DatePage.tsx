import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FemaleCharacterData } from './FemaleCharacterCreatePage'

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
  const [rel, setRel] = useState<Relationship | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatLog, setChatLog] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [missions, setMissions] = useState<string[]>([])
  const [completedMissions, setCompletedMissions] = useState<string[]>([])
  const [mannerWarnings, setMannerWarnings] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [endReason, setEndReason] = useState<'broken' | 'sex_unlocked' | 'limit' | null>(null)
  const chatHistory = useRef<{ role: string; content: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgId = useRef(0)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatLog])

  // 관계 데이터 로드 및 오늘 횟수 체크
  useEffect(() => { initRelationship() }, [])

  const initRelationship = async () => {
    setLoading(true)

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
      return
    }
    if (meetToday >= MAX_MEET_TODAY) {
      addFemaleMsg('오늘은 충분히 봤어. 내일 또 보자.')
      setSessionEnded(true)
      setEndReason('limit')
      setRel(relData)
      setLoading(false)
      return
    }
    if (relData.meet_count >= MAX_MEET_COUNT) {
      // 10회 초과 - 호감도 체크
      if (relData.affection < SEX_UNLOCK_THRESHOLD) {
        await supabase.from('relationships').update({ status: 'broken' }).eq('id', relData.id)
        addFemaleMsg('...우리 이제 그냥 모르는 사이로 지내자. 미안해.')
        setSessionEnded(true)
        setEndReason('broken')
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

    // 7. 미션 생성 (만남 횟수만큼, max 10)
    await generateMissions(relData.id, newMeetCount, relData.affection)

    // 8. 첫인사
    const greeting = getGreeting(relData.affection, newMeetCount, femaleChar)
    addFemaleMsg(greeting)

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const generateMissions = async (relId: string, meetNum: number, affection: number) => {
    // 이번 만남의 미션 개수 = 만남 횟수 (max 10)
    const missionCount = Math.min(meetNum, 10)

    // 이미 이번 만남 미션이 있으면 스킵
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

    // Grok으로 미션 생성
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/date-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({
          message: `[미션생성] 이 여성과 ${meetNum}번째 만남이야. 여성 직업: ${femaleChar.job}, 관심사: ${femaleChar.interestTags?.join(',')}. 현재 호감도: ${affection}/500. 이 상황에 맞는 자연스러운 미션 ${missionCount}개를 JSON 배열로만 반환해. 예: ["미션1", "미션2"]`,
          history: [],
          charContext: buildCharContext(affection, meetNum),
          missionContext: { missions: [], completed: [] },
        }),
      })
      const data = await res.json()
      const reply = data.reply ?? ''
      const match = reply.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed: string[] = JSON.parse(match[0])
        const missionList = parsed.slice(0, missionCount)
        setMissions(missionList)
        // DB에 저장
        await supabase.from('date_missions').insert(
          missionList.map(m => ({ relationship_id: relId, meet_number: meetNum, content: m }))
        )
      }
    } catch { /* 미션 생성 실패해도 대화는 진행 */ }
  }

  const buildCharContext = (affection: number, meetCount: number) => ({
    name: femaleChar.name,
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

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending || sessionEnded || !rel) return
    setInput('')
    addPlayerMsg(text)
    setSending(true)
    chatHistory.current.push({ role: 'user', content: text })

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/date-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({
          message: text,
          history: chatHistory.current.slice(-8),
          charContext: buildCharContext(rel.affection, rel.meet_count),
          missionContext: { missions, completed: completedMissions },
        }),
      })
      const data = await res.json()
      const reply: string = data.reply ?? '...'
      const delta: number = data.affection_delta ?? 0
      const mannerViolation: boolean = data.manner_violation ?? false
      const missionCompleted: boolean = data.mission_completed ?? false

      chatHistory.current.push({ role: 'assistant', content: reply })

      // 호감도 업데이트
      const newAffection = Math.max(0, Math.min(MAX_AFFECTION, rel.affection + delta))
      await supabase.from('relationships').update({ affection: newAffection }).eq('id', rel.id)

      // 대화 기록 저장
      await supabase.from('date_messages').insert([
        { relationship_id: rel.id, sender: 'player', content: text, affection_delta: 0 },
        { relationship_id: rel.id, sender: 'female', content: reply, affection_delta: delta, manner_violation: mannerViolation },
      ])

      // 매너 위반 처리
      if (mannerViolation) {
        const newWarnings = mannerWarnings + 1
        setMannerWarnings(newWarnings)
        if (newWarnings >= 3) {
          addFemaleMsg('...이제 그만해. 다신 나한테 연락하지 마.')
          await supabase.from('relationships').update({ status: 'broken', affection: 0 }).eq('id', rel.id)
          setSessionEnded(true)
          setEndReason('broken')
          setRel(prev => prev ? { ...prev, affection: 0, status: 'broken' } : prev)
          return
        }
      }

      // 미션 완수 처리
      if (missionCompleted && missions.length > 0) {
        const unfinished = missions.find(m => !completedMissions.includes(m))
        if (unfinished) {
          setCompletedMissions(prev => [...prev, unfinished])
          await supabase.from('date_missions')
            .update({ completed: true })
            .eq('relationship_id', rel.id)
            .eq('content', unfinished)
        }
      }

      setRel(prev => prev ? { ...prev, affection: newAffection } : prev)
      addFemaleMsg(reply, delta)

      // SEX 잠금 해제 체크
      if (newAffection >= SEX_UNLOCK_THRESHOLD && !rel.sex_unlocked) {
        await supabase.from('relationships').update({ sex_unlocked: true, status: 'sex_unlocked' }).eq('id', rel.id)
        setRel(prev => prev ? { ...prev, sex_unlocked: true, status: 'sex_unlocked' } : prev)
        setTimeout(() => {
          addFemaleMsg('...사실 너한테 특별한 감정이 생긴 것 같아. 오늘 좀 더 있어줄 수 있어?')
        }, 800)
      }
    } catch {
      addFemaleMsg('...')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const affectionPct = rel ? Math.round((rel.affection / MAX_AFFECTION) * 100) : 0
  const barColor = affectionPct >= 90 ? '#c9a84c' : affectionPct >= 50 ? '#e94560' : '#4FC3F7'

  if (loading) return (
    <div style={S.container}>
      <div style={{ color: '#ffffff88', textAlign: 'center', marginTop: 60 }}>잠시만...</div>
    </div>
  )

  return (
    <div style={S.container}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← 나가기</button>
        <div style={S.headerCenter}>
          {femaleChar.imageUrl && <img src={femaleChar.imageUrl} style={S.avatar} alt="" />}
          <div>
            <div style={S.charName}>{femaleChar.nickname}</div>
            <div style={S.charSub}>{femaleChar.job} · {femaleChar.age}세</div>
          </div>
        </div>
        {/* 만남 횟수 */}
        <div style={S.meetBadge}>{rel?.meet_count ?? 0}/{MAX_MEET_COUNT}회</div>
      </div>

      {/* 호감도 바 */}
      <div style={S.affectionWrap}>
        <div style={S.affectionLabel}>
          <span style={{ color: '#ffffff88', fontSize: 12 }}>호감도</span>
          <span style={{ color: barColor, fontWeight: 'bold', fontSize: 13 }}>{rel?.affection ?? 0} / {MAX_AFFECTION}</span>
        </div>
        <div style={S.barBg}>
          <div style={{ ...S.barFill, width: `${affectionPct}%`, background: barColor }} />
          {/* SEX 잠금 해제 마커 (90%) */}
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
              <span style={{ color: '#ffffffcc', fontSize: 12 }}>{m}</span>
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
            {msg.sender === 'female' && femaleChar.imageUrl && (
              <img src={femaleChar.imageUrl} style={S.msgAvatar} alt="" />
            )}
            <div style={{
              ...S.bubble,
              background: msg.sender === 'player' ? '#2a2a4a' : '#1a1a2e',
              border: msg.sender === 'player' ? '1px solid #4FC3F744' : '1px solid #c9a84c44',
              borderRadius: msg.sender === 'player' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            }}>
              <span style={{ color: '#ffffffdd', fontSize: 14, lineHeight: 1.5 }}>{msg.text}</span>
              {msg.delta !== undefined && msg.delta !== 0 && (
                <span style={{ color: msg.delta > 0 ? '#4FC3F7' : '#e94560', fontSize: 11, marginLeft: 8 }}>
                  {msg.delta > 0 ? `+${msg.delta}` : msg.delta}
                </span>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ ...S.msgRow, justifyContent: 'flex-start' }}>
            <div style={{ ...S.bubble, background: '#1a1a2e', border: '1px solid #c9a84c44', borderRadius: '4px 16px 16px 16px' }}>
              <span style={{ color: '#ffffff66', fontSize: 14 }}>...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 종료 화면 */}
      {sessionEnded ? (
        <div style={S.endPanel}>
          {endReason === 'broken' && <div style={{ color: '#e94560', marginBottom: 8 }}>💔 관계가 끝났어</div>}
          {endReason === 'limit' && <div style={{ color: '#ffffff88', marginBottom: 8 }}>오늘은 여기까지야</div>}
          {endReason === 'sex_unlocked' && <div style={{ color: '#c9a84c', marginBottom: 8 }}>❤️ SEX 잠금 해제!</div>}
          <button style={S.backBtn} onClick={onBack}>나가기</button>
        </div>
      ) : (
        <div style={S.inputRow}>
          <input
            ref={inputRef}
            style={S.input}
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 100))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="말을 걸어봐... (100자)"
            disabled={sending}
          />
          <button style={{ ...S.sendBtn, opacity: sending || !input.trim() ? 0.5 : 1 }} onClick={sendMessage} disabled={sending || !input.trim()}>
            전송
          </button>
        </div>
      )}
    </div>
  )
}

function getGreeting(affection: number, meetCount: number, char: FemaleCharacterData): string {
  if (meetCount === 1) return `안녕, 나 ${char.nickname}이야. 처음 보는 얼굴인데...`
  if (affection < 100) return `어, 또 왔어?`
  if (affection < 250) return `왔어. 오늘은 무슨 일이야?`
  if (affection < 400) return `어, 왔구나. 기다리고 있었어.`
  return `왔어~ 보고 싶었어.`
}

const S: Record<string, React.CSSProperties> = {
  container:    { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0d1a', color: '#fff', fontFamily: 'sans-serif' },
  header:       { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #ffffff11', flexShrink: 0 },
  backBtn:      { background: 'none', border: '1px solid #ffffff33', borderRadius: 8, color: '#ffffffcc', padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  headerCenter: { flex: 1, display: 'flex', alignItems: 'center', gap: 10 },
  avatar:       { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #c9a84c44' },
  charName:     { fontWeight: 'bold', fontSize: 15 },
  charSub:      { color: '#ffffff66', fontSize: 12 },
  meetBadge:    { color: '#ffffff88', fontSize: 12, background: '#ffffff11', borderRadius: 8, padding: '4px 8px' },
  affectionWrap:{ padding: '8px 16px', borderBottom: '1px solid #ffffff11', flexShrink: 0 },
  affectionLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  barBg:        { height: 8, background: '#ffffff11', borderRadius: 4, position: 'relative' },
  barFill:      { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  marker:       { position: 'absolute', top: -6, transform: 'translateX(-50%)', fontSize: 14 },
  sexBtn:       { marginTop: 8, width: '100%', background: 'linear-gradient(135deg, #e94560, #c9a84c)', border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' },
  missionPanel: { padding: '8px 16px', borderBottom: '1px solid #ffffff11', background: '#0a0a15', flexShrink: 0 },
  missionTitle: { color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  missionItem:  { display: 'flex', alignItems: 'center', marginBottom: 2 },
  warningBar:   { padding: '6px 16px', background: '#e9456022', color: '#e94560', fontSize: 12, flexShrink: 0 },
  chatArea:     { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
  msgRow:       { display: 'flex', alignItems: 'flex-end', gap: 8 },
  msgAvatar:    { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  bubble:       { maxWidth: '75%', padding: '10px 14px', wordBreak: 'break-word' },
  inputRow:     { display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #ffffff11', flexShrink: 0 },
  input:        { flex: 1, background: '#1a1a2e', border: '1px solid #ffffff22', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  sendBtn:      { background: '#c9a84c', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' },
  endPanel:     { padding: '16px', textAlign: 'center', borderTop: '1px solid #ffffff11', flexShrink: 0 },
}
