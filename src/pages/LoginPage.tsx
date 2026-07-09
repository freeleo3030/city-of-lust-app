import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setError('가입 완료! 이메일을 확인해주세요.')
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>욕정의 도시</h1>
        <p style={styles.subtitle}>City of Lust</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? '처리 중...' : '로그인'}
          </button>
          <button style={styles.btnSecondary} type="button" onClick={handleSignup} disabled={loading}>
            회원가입
          </button>
        </form>
        <div style={styles.divider}>── 또는 ──</div>
        <button style={styles.btnGoogle} type="button" onClick={handleGoogle} disabled={loading}>
          <span style={{marginRight: 8}}>G</span> Google로 로그인
        </button>
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
    width: 360,
    textAlign: 'center',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  title: {
    color: '#c9a84c',
    fontSize: 32,
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    background: '#f8f8fb',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#1a1a2e',
    fontSize: 15,
    outline: 'none',
  },
  btnPrimary: {
    background: '#c9a84c',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '13px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
  },
  btnSecondary: {
    background: 'transparent',
    color: '#c9a84c',
    border: '1px solid #c9a84c',
    borderRadius: 8,
    padding: '12px',
    fontSize: 15,
    cursor: 'pointer',
  },
  error: {
    color: '#e94560',
    fontSize: 13,
    margin: 0,
  },
  divider: {
    color: '#bbb',
    fontSize: 12,
    textAlign: 'center',
  },
  btnGoogle: {
    background: '#fff',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 15,
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
