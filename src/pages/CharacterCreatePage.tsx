import { useState, useEffect, useRef } from 'react'
import { generateMaleProfileImage } from '../lib/generateCharImages'

interface Props {
  onComplete: (character: CharacterData & { generatedImageUrl?: string }) => void
  initialData?: CharacterData | null
  gold?: number  // 현재 보유 골드 (기본 0)
}

export interface CharacterData {
  avatar: number
  nickname: string
  job: string
  intro: string
  age: number
  // 외모 (S1)
  face: number; height: number; body: number; fashion: number
  // 대화 (S2)
  intellect: number; humor: number; virtue: number; manner: number
  // 성기 (S3 고정)
  penisSize: number; penisGirth: number
  // 발기 (S3)
  erectPower: number; erectDuration: number; erectHardness: number; erectTechnique: number
  appearanceDesc?: string
}

const AVATARS = ['🧑', '👨', '🧔', '👱']

// 골드 → 재력점수 (0~100)
const calcWealth = (gold: number): { score: number; tier: string; color: string; next: string } => {
  if (gold >= 1_000_000) return { score: 100, tier: '최상위', color: '#c9a84c', next: '최고 등급' }
  if (gold >= 500_000)  return { score: 80,  tier: '상위',   color: '#FF9800', next: `+${(1_000_000 - gold).toLocaleString()}G → 100점` }
  if (gold >= 200_000)  return { score: 60,  tier: '중상위', color: '#66BB6A', next: `+${(500_000 - gold).toLocaleString()}G → 80점` }
  if (gold >= 50_000)   return { score: 30,  tier: '중위',   color: '#4FC3F7', next: `+${(200_000 - gold).toLocaleString()}G → 60점` }
  if (gold >= 10_000)   return { score: 10,  tier: '하위',   color: '#ffffff55', next: `+${(50_000 - gold).toLocaleString()}G → 30점` }
  return { score: 0, tier: '최하위', color: '#ffffff33', next: `+${(10_000 - gold).toLocaleString()}G → 10점` }
}

// 나이 → 나이대 / 인생경험치
const getAgeGroup = (age: number) => {
  if (age < 30) return { label: '20대', exp: 20, expMax: 60, color: '#4FC3F7' }
  if (age < 40) return { label: '30대', exp: 50, expMax: 90, color: '#66BB6A' }
  return { label: '40대', exp: 80, expMax: 120, color: '#FF9800' }
}

const KR_SURNAMES = new Set([
  '김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','유',
  '홍','전','고','문','양','손','배','백','허','남','심','노','하','곽','성','차','주','우','구','민',
  '나','진','지','엄','채','원','천','방','공','현','함','변','염','여','추','도','소','석','선','설',
  '마','길','연','위','표','명','기','반','라','왕','금','옥','육','인','맹','제','모','탁','국','봉',
])
const isKoreanName = (s: string) =>
  /^[가-힣]+$/.test(s) && s.length >= 2 && s.length <= 4 && KR_SURNAMES.has(s[0])
const isEnglishName = (s: string) =>
  /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(s.trim())
const isRealName = (s: string) => isKoreanName(s) || isEnglishName(s)

export default function CharacterCreatePage({ onComplete, initialData, gold = 0 }: Props) {
  const d = initialData
  const [nickname, setNickname] = useState(d?.nickname ?? '')
  const [job, setJob] = useState(d?.job ?? '')
  const [intro, setIntro] = useState(d?.intro ?? '')
  const [avatar, setAvatar] = useState(d?.avatar ?? 0)
  const [error, setError] = useState('')
  const [age, setAge] = useState(d?.age != null ? String(d.age) : '')

  const ageNum = parseInt(age)
  const ageGroup = age && !isNaN(ageNum) && ageNum >= 19 ? getAgeGroup(ageNum) : null

  // 외모 S1 (3개 조작 → fashion 자동)
  const LOOK_MIN = 10
  const [look, setLook] = useState({ face: d?.face ?? 25, height: d?.height ?? 25, body: d?.body ?? 25 })
  const fashion = Math.max(LOOK_MIN, 100 - look.face - look.height - look.body)
  const setLookStat = (key: keyof typeof look, val: number) => {
    const otherSum = Object.entries(look).filter(([k]) => k !== key).reduce((a, [, v]) => a + v, 0)
    setLook({ ...look, [key]: Math.max(LOOK_MIN, Math.min(val, 100 - LOOK_MIN - otherSum)) })
  }

  // 대화 S2 (3개 조작 → manner 자동)
  const TALK_MIN = 10
  const [talk, setTalk] = useState({ intellect: d?.intellect ?? 25, humor: d?.humor ?? 25, virtue: d?.virtue ?? 25 })
  const manner = Math.max(TALK_MIN, 100 - talk.intellect - talk.humor - talk.virtue)
  const setTalkStat = (key: keyof typeof talk, val: number) => {
    const otherSum = Object.entries(talk).filter(([k]) => k !== key).reduce((a, [, v]) => a + v, 0)
    setTalk({ ...talk, [key]: Math.max(TALK_MIN, Math.min(val, 100 - TALK_MIN - otherSum)) })
  }

  // 성기 S3 (2개 연동, 생성 시 고정)
  const PENIS_MIN = 20
  const [penis, setPenis] = useState({ penisSize: d?.penisSize ?? 50, penisGirth: d?.penisGirth ?? 50 })
  const setPenisStat = (key: keyof typeof penis, val: number) => {
    const clamped = Math.max(PENIS_MIN, Math.min(val, 100 - PENIS_MIN))
    const other = key === 'penisSize' ? 'penisGirth' : 'penisSize'
    setPenis({ [key]: clamped, [other]: Math.max(PENIS_MIN, 100 - clamped) } as typeof penis)
  }

  // 발기 S3 (3개 조작 → technique 자동)
  const ERECT_MIN = 20
  const [erect, setErect] = useState({ erectPower: d?.erectPower ?? 25, erectDuration: d?.erectDuration ?? 25, erectHardness: d?.erectHardness ?? 25 })
  const erectTechnique = Math.max(ERECT_MIN, 100 - erect.erectPower - erect.erectDuration - erect.erectHardness)
  const setErectStat = (key: keyof typeof erect, val: number) => {
    const otherSum = Object.entries(erect).filter(([k]) => k !== key).reduce((a, [, v]) => a + v, 0)
    setErect({ ...erect, [key]: Math.max(ERECT_MIN, Math.min(val, 100 - ERECT_MIN - otherSum)) })
  }

  const [appearanceDesc, setAppearanceDesc] = useState(d?.appearanceDesc ?? '')
  const [genProgress, setGenProgress] = useState('')

  // 자기소개 자동 생성 (스탯 변경 시 항상 반영)
  const autoIntro = (() => {
    if (!job.trim() || !age || isNaN(ageNum)) return ''
    const ageLabel = ageNum < 30 ? '20대' : ageNum < 40 ? '30대' : '40대'
    const jobStr = job.trim()
    const topLook = Object.entries({ 얼굴: look.face, 키: look.height, 몸매: look.body, 패션: fashion })
      .sort((a, b) => b[1] - a[1])[0][0]
    const topTalk = Object.entries({ 지적능력: talk.intellect, 유머: talk.humor, 덕성: talk.virtue, 매너: manner })
      .sort((a, b) => b[1] - a[1])[0][0]
    const lookTotal = look.face + look.height + look.body + fashion
    const talkTotal = talk.intellect + talk.humor + talk.virtue + manner
    if (lookTotal >= talkTotal)
      return `${ageLabel} ${jobStr}. ${topLook}과 ${topTalk}을 갖춘 남자.`
    else
      return `${ageLabel} ${jobStr}. ${topTalk}과 ${topLook}이 무기인 타입.`
  })()

  const handleComplete = async () => {
    console.log('[완료] 클릭됨, nickname:', nickname, 'job:', job, 'age:', age)
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (nickname.trim().length < 2) { setError('닉네임은 2자 이상이어야 합니다.'); return }
    if (isRealName(nickname.trim())) { setError('실제 이름은 사용할 수 없습니다.'); return }
    if (!job.trim()) { setError('직업을 입력해주세요.'); return }
    if (!age || isNaN(ageNum) || ageNum < 19 || ageNum > 99) { setError('나이를 올바르게 입력해주세요. (19세 이상)'); return }

    console.log('[완료] 검증 통과, RunPod 호출 시작')
    setGenProgress('대표 이미지 생성 중...')
    let generatedImageUrl: string | undefined
    try {
      generatedImageUrl = await generateMaleProfileImage({
        nickname: nickname.trim(),
        age: ageNum,
        job: job.trim(),
        face: look.face,
        height: look.height,
        body: look.body,
        fashion,
        appearanceDesc: appearanceDesc.trim() || undefined,
      })
    } catch (e) {
      console.error('남캐 이미지 생성 실패:', e)
    }
    setGenProgress('')

    onComplete({
      avatar,
      nickname: nickname.trim(), job: job.trim(), intro: autoIntro, age: ageNum,
      face: look.face, height: look.height, body: look.body, fashion,
      intellect: talk.intellect, humor: talk.humor, virtue: talk.virtue, manner,
      penisSize: penis.penisSize, penisGirth: penis.penisGirth,
      erectPower: erect.erectPower, erectDuration: erect.erectDuration,
      erectHardness: erect.erectHardness, erectTechnique,
      appearanceDesc: appearanceDesc.trim() || undefined,
      generatedImageUrl,
    })
  }

  const SliderRow = ({ label, desc, color, value, onChange, max, isAuto = false }: {
    label: string; desc: string; color: string; value: number
    onChange?: (v: number) => void; max?: number; isAuto?: boolean
  }) => (
    <div style={S.statRow}>
      <div style={S.statInfo}>
        <span style={{ ...S.statLabel, color }}>{label}</span>
        <span style={S.statDesc}>{desc}</span>
      </div>
      <div style={S.sliderWrap}>
        <input type="range" min={0} max={max ?? 100} step={5} value={value}
          onChange={e => !isAuto && onChange!(parseInt(e.target.value))}
          disabled={isAuto}
          style={{ ...S.slider, accentColor: color, cursor: isAuto ? 'default' : 'pointer' }} />
        <span style={{ ...S.statVal, color, opacity: isAuto ? 0.5 : 1 }}>{value}</span>
      </div>
    </div>
  )

  return (
    <div style={S.container}>
      <div style={S.card}>
        <h1 style={S.title}>캐릭터 생성</h1>
        <p style={S.subtitle}>루스트 시티에서의 나를 만들어보세요</p>

        <div style={S.notice}>
          ⚡ 스탯은 여성 공략 3단계에 직접 반영됩니다 —
          <span style={{ color: '#4FC3F7' }}> S1 접근(외모)</span> ·
          <span style={{ color: '#CE93D8' }}> S2 데이트(대화+재력)</span> ·
          <span style={{ color: '#e94560' }}> S3 섹스(발기)</span>
        </div>

        {/* 아바타 */}
        <div style={S.avatarRow}>
          {AVATARS.map((a, i) => (
            <button key={i}
              style={{ ...S.avatarBtn, borderColor: avatar === i ? '#c9a84c' : '#ffffff11', background: avatar === i ? '#c9a84c22' : 'transparent' }}
              onClick={() => setAvatar(i)}>
              <span style={{ fontSize: 32 }}>{a}</span>
            </button>
          ))}
        </div>

        {/* 기본 정보 */}
        <div style={S.section}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>닉네임 <span style={S.hint}>(10자, 실명 불가)</span></label>
              <input style={S.input} placeholder="루스트 시티 이름"
                value={nickname} onChange={e => { setNickname(e.target.value); setError('') }} maxLength={10} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>직업 <span style={S.hint}>(10자)</span></label>
              <input style={S.input} placeholder="직장인"
                value={job} onChange={e => { setJob(e.target.value); setError('') }} maxLength={10} />
            </div>
          </div>
          <label style={{ ...S.label, marginTop: 12 }}>
            자기소개 <span style={S.hint}>(스탯 기반 자동생성)</span>
          </label>
          <div style={S.autoIntroBox}>
            {autoIntro || <span style={{ color: '#ffffff33' }}>닉네임·직업·나이·스탯 입력 후 자동생성됩니다</span>}
          </div>
        </div>

        {/* 스탯 2열 */}
        <div style={S.statColumns}>

          {/* 왼쪽: 데이트 스탯 */}
          <div style={S.statCol}>
            <div style={S.colHeader}>💬 데이트 스탯 <span style={{ fontSize: 11, color: '#ffffff44' }}>S1·S2</span></div>

            {/* 나이 + 인생경험치 */}
            <div style={S.section}>
              <label style={S.label}>나이 <span style={S.hint}>(19세 이상)</span></label>
              <input style={S.input} type="number" placeholder="나이 입력"
                value={age} onChange={e => { setAge(e.target.value); setError('') }} min={19} max={99} />

              {ageGroup && (
                <div style={S.ageCard}>
                  <div style={S.ageRow}>
                    <span style={{ color: ageGroup.color, fontWeight: 'bold', fontSize: 14 }}>
                      {ageGroup.label}
                    </span>
                    <span style={S.ageDesc}>나이매칭 — 여캐 선호 나이대 일치 시 S1·S2 보너스</span>
                  </div>
                  <div style={S.expRow}>
                    <span style={S.expLabel}>인생경험치</span>
                    <div style={S.expBarWrap}>
                      <div style={{ ...S.expBar, width: `${(ageGroup.exp / ageGroup.expMax) * 100}%`, background: ageGroup.color }} />
                    </div>
                    <span style={{ color: ageGroup.color, fontWeight: 'bold', fontSize: 13 }}>
                      {ageGroup.exp}
                    </span>
                    <span style={{ color: '#ffffff33', fontSize: 11 }}>/ {ageGroup.expMax}</span>
                  </div>
                  <div style={S.expTip}>
                    S1 나이매칭 15% · S2 나이매칭 10% 반영 —
                    <span style={{ color: '#FF9800' }}> 30~40대는 인생경험치로 S2 역전 가능</span>
                  </div>
                </div>
              )}
            </div>

            {/* 재력점수 */}
            {(() => {
              const w = calcWealth(gold)
              const pct = w.score
              return (
                <div style={S.wealthCard}>
                  <div style={S.wealthTitle}>💰 재력점수 <span style={S.hint}>S1 5% · S2 10% 반영</span></div>
                  <div style={S.wealthScoreRow}>
                    <div style={S.wealthScoreBig}>
                      <span style={{ color: w.color, fontSize: 36, fontWeight: 'bold', lineHeight: 1 }}>{w.score}</span>
                      <span style={{ color: '#ffffff33', fontSize: 14 }}> / 100</span>
                    </div>
                    <div style={S.wealthTierBadge}>
                      <span style={{ ...S.tierBadge, borderColor: w.color, color: w.color }}>{w.tier}</span>
                      <span style={{ color: '#ffffff33', fontSize: 11, marginTop: 4 }}>
                        보유 골드 {gold.toLocaleString()}G
                      </span>
                    </div>
                  </div>
                  <div style={S.wealthBarWrap}>
                    <div style={{ ...S.wealthBar, width: `${pct}%`, background: w.color }} />
                  </div>
                  <div style={S.wealthTiers}>
                    {([
                      [10_000,   10, '#ffffff33'],
                      [50_000,   30, '#4FC3F7'],
                      [200_000,  60, '#66BB6A'],
                      [500_000,  80, '#FF9800'],
                      [1_000_000,100,'#c9a84c'],
                    ] as [number, number, string][]).map(([g, p, c]) => (
                      <div key={g} style={{ ...S.wealthTier, borderColor: gold >= g ? c : '#ffffff11', opacity: gold >= g ? 1 : 0.4 }}>
                        <span style={{ color: c, fontSize: 10, fontWeight: 'bold' }}>{p}점</span>
                        <span style={{ color: '#ffffff55', fontSize: 9 }}>{g >= 1_000_000 ? '100만G+' : `${(g/10000).toFixed(0)}만G`}</span>
                      </div>
                    ))}
                  </div>
                  {w.score < 100 && (
                    <div style={S.wealthNext}>▲ {w.next}</div>
                  )}
                  <div style={S.wealthBody}>Gold + 보석 + 아이템 합산 자동계산 · 여캐 재력선호도와 결합해 호감도 반영</div>
                </div>
              )
            })()}

            {/* 외모 S1 */}
            <div style={S.section}>
              <div style={S.pointsRow}>
                <label style={S.label}>외모 <span style={S.stageTag}>S1 25%</span></label>
                <span style={S.total}>{look.face + look.height + look.body + fashion} / 100</span>
              </div>
              <SliderRow label="얼굴" desc="첫인상 · 성형/스킨케어 아이템으로 상승" color="#FF6B9D"
                value={look.face} max={100 - LOOK_MIN * 2} onChange={v => setLookStat('face', v)} />
              <SliderRow label="키" desc="키높이 구두로 임시 +5 가능" color="#4FC3F7"
                value={look.height} max={100 - LOOK_MIN * 2} onChange={v => setLookStat('height', v)} />
              <SliderRow label="몸매" desc="체형 · 헬스장 등록으로 상승" color="#FF5722"
                value={look.body} max={100 - LOOK_MIN * 2} onChange={v => setLookStat('body', v)} />
              <SliderRow label="패션" desc="쇼핑몰 의류 구매로 상승 (자동계산)" color="#c9a84c"
                value={fashion} max={100 - LOOK_MIN * 2} isAuto />
            </div>

            {/* 대화 S2 */}
            <div style={S.section}>
              <div style={S.pointsRow}>
                <label style={S.label}>대화 <span style={S.stageTag}>S2 20%</span></label>
                <span style={S.total}>{talk.intellect + talk.humor + talk.virtue + manner} / 100</span>
              </div>
              <SliderRow label="지적능력" desc="도서관 책 구매로 상승" color="#4FC3F7"
                value={talk.intellect} max={100 - TALK_MIN * 2} onChange={v => setTalkStat('intellect', v)} />
              <SliderRow label="유머" desc="문화센터 유머 강의로 상승" color="#FF9800"
                value={talk.humor} max={100 - TALK_MIN * 2} onChange={v => setTalkStat('humor', v)} />
              <SliderRow label="덕성" desc="공공기관 자원봉사로 상승" color="#66BB6A"
                value={talk.virtue} max={100 - TALK_MIN * 2} onChange={v => setTalkStat('virtue', v)} />
              <SliderRow label="매너" desc="매너 강의로 상승 (자동계산)" color="#CE93D8"
                value={manner} max={100 - TALK_MIN * 2} isAuto />
            </div>
          </div>

          {/* 오른쪽: 성교 스탯 */}
          <div style={S.statCol}>
            <div style={S.colHeader}>🔥 성교 스탯 <span style={{ fontSize: 11, color: '#ffffff44' }}>S3</span></div>

            {/* 성기 (고정) */}
            <div style={S.section}>
              <div style={S.pointsRow}>
                <label style={S.label}>성기 <span style={S.fixedTag}>생성 후 변경 불가</span></label>
                <span style={S.total}>{penis.penisSize + penis.penisGirth} / 100</span>
              </div>
              <SliderRow label="길이" desc="성기 사이즈 (영구 고정)" color="#e94560"
                value={penis.penisSize} max={100 - PENIS_MIN} onChange={v => setPenisStat('penisSize', v)} />
              <SliderRow label="두께" desc="직경/굵기 (영구 고정)" color="#AB47BC"
                value={penis.penisGirth} max={100 - PENIS_MIN} onChange={v => setPenisStat('penisGirth', v)} />
              <div style={S.fixedNote}>⚠️ 한 번 설정하면 변경 불가 — 신중하게 선택하세요</div>
            </div>

            {/* 발기 S3 */}
            <div style={S.section}>
              <div style={S.pointsRow}>
                <label style={S.label}>발기 <span style={S.stageTag}>S3 45%</span></label>
                <span style={S.total}>{erect.erectPower + erect.erectDuration + erect.erectHardness + erectTechnique} / 100</span>
              </div>
              <SliderRow label="발기력" desc="강도 · 나이↑ 경험치로 약간 감소 · 약국 아이템 임시 보정" color="#FF6B9D"
                value={erect.erectPower} max={100 - ERECT_MIN * 2} onChange={v => setErectStat('erectPower', v)} />
              <SliderRow label="지속력" desc="유지 시간 · 나이↑ 경험치로 약간 감소 · 약국 아이템 임시 보정" color="#FF9800"
                value={erect.erectDuration} max={100 - ERECT_MIN * 2} onChange={v => setErectStat('erectDuration', v)} />
              <SliderRow label="단단함" desc="경직도 · 나이↑ 경험치로 약간 감소 · 약국 아이템 임시 보정" color="#c9a84c"
                value={erect.erectHardness} max={100 - ERECT_MIN * 2} onChange={v => setErectStat('erectHardness', v)} />
              <SliderRow label="테크닉" desc="SEX 성공으로 성장 · 나이↑ 경험치로 크게 상승 (자동계산)" color="#64B5F6"
                value={erectTechnique} max={100 - ERECT_MIN * 2} isAuto />

              <div style={S.infoCard}>
                <div style={{ color: '#64B5F6', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>💡 인생경험치 × 발기 상호작용</div>
                <div style={{ color: '#ffffff66', fontSize: 11, lineHeight: 1.6 }}>
                  나이가 올라갈수록 발기력·지속력·단단함은 <span style={{ color: '#e94560' }}>약간 감소</span>하지만,
                  테크닉은 <span style={{ color: '#66BB6A' }}>크게 상승</span>합니다 (net +5%).
                  40대는 테크닉으로 완전히 역전 가능합니다.
                </div>
              </div>
            </div>

            {/* 성장 레벨 안내 */}
            <div style={S.growthCard}>
              <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📈 게임 내 성장 (생성 후)</div>
              <div style={S.growthRow}>
                <span style={{ color: '#CE93D8' }}>호감도 Lv</span>
                <span style={{ color: '#ffffff66', fontSize: 11 }}>데이트 성공 → S1·S2 +Lv×5 보너스</span>
              </div>
              <div style={S.growthRow}>
                <span style={{ color: '#64B5F6' }}>테크닉 Lv</span>
                <span style={{ color: '#ffffff66', fontSize: 11 }}>SEX 성공 → S3 +Lv×5 보너스</span>
              </div>
              <div style={S.growthRow}>
                <span style={{ color: '#c9a84c' }}>재력점수</span>
                <span style={{ color: '#ffffff66', fontSize: 11 }}>골드 획득·소비로 자동 변동</span>
              </div>
              <div style={S.growthRow}>
                <span style={{ color: '#FF9800' }}>인생경험치</span>
                <span style={{ color: '#ffffff66', fontSize: 11 }}>나이 기반 자동 지급 + 게임 중 성장</span>
              </div>
            </div>

            {/* 외모 설명 */}
            <div style={S.appearanceBox}>
              <label style={{ ...S.label, color: '#4FC3F7' }}>
                🎨 외모 설명 <span style={S.hint}>AI 이미지 생성에 반영됩니다</span>
                <span style={{ color: '#ffffff33', fontSize: 11, float: 'right' }}>{appearanceDesc.length}/200자</span>
              </label>
              <textarea
                style={S.appearanceInput}
                rows={3}
                value={appearanceDesc}
                onChange={e => setAppearanceDesc(e.target.value)}
                placeholder="예) 짧은 머리, 안경, 수염, 근육질, 문신 없음... (예: short hair, glasses, beard)"
                maxLength={200}
              />
              <span style={{ color: '#FF9800', fontSize: 11 }}>⚠️ AI는 영어만 인식합니다 — 한국어 입력 시 무시될 수 있음</span>
            </div>

          </div>

        </div>

        {error && <p style={S.error}>{error}</p>}
        {genProgress && <p style={{ color: '#c9a84c', fontSize: 13, textAlign: 'center', margin: '8px 0' }}>🎨 {genProgress}</p>}
        <button
          style={{ ...S.btn, opacity: genProgress ? 0.6 : 1, pointerEvents: genProgress ? 'none' : 'auto' }}
          onClick={handleComplete}
        >
          {genProgress ? '생성 중...' : '완료 →'}
        </button>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0010 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c33',
    borderRadius: 16, padding: '40px 36px', width: 960, maxWidth: '100%',
  },
  title: { color: '#c9a84c', fontSize: 26, fontWeight: 'bold', margin: '0 0 6px', textAlign: 'center' },
  subtitle: { color: '#ffffff55', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  notice: {
    background: '#c9a84c11', border: '1px solid #c9a84c33',
    borderRadius: 8, padding: '10px 14px', color: '#c9a84ccc', fontSize: 12, marginBottom: 20,
  },
  avatarRow: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 },
  avatarBtn: { border: '2px solid', borderRadius: 12, padding: '8px 10px', cursor: 'pointer', transition: 'all 0.2s' },
  section: { marginBottom: 20 },
  label: { color: '#ffffff88', fontSize: 13, display: 'block', marginBottom: 8 },
  hint: { color: '#ffffff33', fontSize: 11 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
    borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  },
  // 나이 카드
  ageCard: {
    marginTop: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid #ffffff11',
    borderRadius: 8, padding: '12px 14px',
  },
  ageRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  ageDesc: { color: '#ffffff55', fontSize: 11 },
  expRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  expLabel: { color: '#ffffff66', fontSize: 12, minWidth: 56 },
  expBarWrap: { flex: 1, height: 6, background: '#ffffff11', borderRadius: 3, overflow: 'hidden' },
  expBar: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  expTip: { color: '#ffffff44', fontSize: 11, lineHeight: 1.5 },
  // 재력 카드
  wealthCard: {
    marginBottom: 20, background: '#c9a84c0a', border: '1px solid #c9a84c22',
    borderRadius: 8, padding: '12px 14px',
  },
  wealthTitle: { color: '#c9a84c', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  wealthScoreRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  wealthScoreBig: { display: 'flex', alignItems: 'baseline', gap: 2 },
  wealthTierBadge: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' },
  tierBadge: {
    fontSize: 12, fontWeight: 'bold', border: '1px solid',
    borderRadius: 6, padding: '2px 10px',
  },
  wealthBarWrap: { height: 6, background: '#ffffff11', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  wealthBar: { height: '100%', borderRadius: 3, transition: 'width 0.4s' },
  wealthTiers: { display: 'flex', gap: 4, marginBottom: 8 },
  wealthTier: {
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    border: '1px solid', borderRadius: 6, padding: '4px 2px', gap: 2,
  },
  wealthNext: { color: '#ffffff44', fontSize: 11, marginBottom: 6 },
  wealthBody: { color: '#ffffff44', fontSize: 11, lineHeight: 1.5 },
  // 스탯
  pointsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stageTag: {
    fontSize: 10, color: '#4FC3F7', background: '#4FC3F711',
    border: '1px solid #4FC3F733', borderRadius: 4, padding: '1px 5px', marginLeft: 6,
  },
  fixedTag: {
    fontSize: 10, color: '#e94560', background: '#e9456011',
    border: '1px solid #e9456033', borderRadius: 4, padding: '1px 5px', marginLeft: 6,
  },
  total: { color: '#ffffff66', fontSize: 12 },
  statRow: { marginBottom: 14 },
  statInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 14, fontWeight: 'bold' },
  statDesc: { color: '#ffffff44', fontSize: 11 },
  sliderWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  slider: { flex: 1 },
  statVal: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'right' as const },
  fixedNote: {
    marginTop: 8, color: '#e9456088', fontSize: 11,
    background: '#e9456011', borderRadius: 6, padding: '6px 10px',
  },
  // S3 안내
  infoCard: {
    marginTop: 12, background: 'rgba(100,181,246,0.05)', border: '1px solid #64B5F622',
    borderRadius: 8, padding: '10px 12px',
  },
  growthCard: {
    background: 'rgba(201,168,76,0.05)', border: '1px solid #c9a84c22',
    borderRadius: 8, padding: '12px 14px',
  },
  growthRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  // 공통
  error: { color: '#e94560', fontSize: 13, margin: '0 0 12px' },
  btn: {
    width: '100%', background: 'linear-gradient(90deg, #c9a84c, #e94560)',
    color: '#fff', border: 'none', borderRadius: 8, padding: '14px',
    fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 8,
  },
  autoIntroBox: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid #c9a84c33',
    borderRadius: 8, padding: '12px 16px', color: '#c9a84c', fontSize: 14,
    minHeight: 44, lineHeight: 1.5,
  },
  appearanceBox: {
    background: 'rgba(79,195,247,0.05)', border: '1px solid #4FC3F733',
    borderRadius: 12, padding: '16px', marginTop: 20,
    display: 'flex', flexDirection: 'column' as const, gap: 8,
  },
  appearanceInput: {
    width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid #ffffff22',
    borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 14,
    outline: 'none', resize: 'none' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const,
  },
  statColumns: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  statCol: { flex: 1, minWidth: 0 },
  colHeader: {
    color: '#c9a84c', fontSize: 13, fontWeight: 'bold',
    textAlign: 'center' as const, padding: '8px 0', marginBottom: 12,
    borderBottom: '1px solid #c9a84c44',
  },
}
