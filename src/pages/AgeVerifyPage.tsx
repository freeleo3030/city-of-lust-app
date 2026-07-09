import { useState } from 'react'

interface Props {
  onVerified: () => void
}

export default function AgeVerifyPage({ onVerified }: Props) {
  const [checked, setChecked] = useState(false)
  const [birthYear, setBirthYear] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    const year = parseInt(birthYear)
    const currentYear = 2026
    if (!birthYear || isNaN(year) || year < 1900 || year > currentYear) {
      setError('올바른 출생연도를 입력해주세요.')
      return
    }
    if (currentYear - year < 19) {
      setError('본 서비스는 만 19세 이상만 이용 가능합니다.')
      return
    }
    if (!checked) {
      setError('이용약관에 동의해주세요.')
      return
    }
    onVerified()
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔞</div>
        <h1 style={styles.title}>성인 인증</h1>
        <p style={styles.desc}>
          본 서비스는 <span style={styles.highlight}>만 19세 이상</span>만<br />
          이용 가능한 성인 콘텐츠입니다.
        </p>

        <div style={styles.form}>
          <label style={styles.label}>출생연도</label>
          <input
            style={styles.input}
            type="number"
            placeholder="예) 1990"
            value={birthYear}
            onChange={e => { setBirthYear(e.target.value); setError('') }}
            min="1900"
            max="2026"
          />

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => { setChecked(e.target.checked); setError('') }}
              style={styles.checkbox}
            />
            <span style={styles.checkText}>
              만 19세 이상이며, 성인 콘텐츠 이용에 동의합니다.
            </span>
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{ ...styles.btn, opacity: checked ? 1 : 0.5 }}
            onClick={handleConfirm}
          >
            확인 및 입장
          </button>
        </div>

        <p style={styles.warning}>
          ⚠️ 미성년자의 접근은 법으로 금지되어 있습니다.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f2f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#fff',
    border: '1px solid #e0e0e6',
    borderRadius: 16,
    padding: '48px 40px',
    width: 380,
    textAlign: 'center',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { color: '#1a1a2e', fontSize: 28, fontWeight: 'bold', margin: '0 0 12px' },
  desc: { color: '#555', fontSize: 15, lineHeight: 1.7, marginBottom: 32 },
  highlight: { color: '#e94560', fontWeight: 'bold' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' },
  label: { color: '#555', fontSize: 13 },
  input: {
    background: '#f8f8fb',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#1a1a2e',
    fontSize: 15,
    outline: 'none',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
  },
  checkbox: { marginTop: 3, accentColor: '#e94560', width: 16, height: 16 },
  checkText: { color: '#555', fontSize: 13, lineHeight: 1.5 },
  error: { color: '#e94560', fontSize: 13, margin: 0 },
  btn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '14px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
  },
  warning: {
    color: '#bbb',
    fontSize: 11,
    marginTop: 24,
    marginBottom: 0,
  },
}
