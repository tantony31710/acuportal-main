import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase';

export function Auth() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)

  useEffect(() => {
  let cancelled = false
  async function check() {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id).maybeSingle()
    if (!cancelled) {
      if (data?.role === 'teacher') navigate('/teacher')
      else navigate('/check-in')
    }
  }
  check()
  const { data: sub } = supabase.auth.onAuthStateChange(() => check())
  return () => { cancelled = true; sub.subscription.unsubscribe() }
}, [navigate])

  const signIn = async () => {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
  }

  const signUp = async () => {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/check-in`, data: { full_name: fullName } } })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Check your email to confirm your account.' })
  }

  const signInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/check-in` } })
    if (error) setMsg({ type: 'error', text: error.message })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">University Attendance</h1>

        <div className="mt-6 flex rounded-lg border border-border overflow-hidden">
          {(['signin','signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setMsg(null) }}
              className={`flex-1 py-2 text-sm font-medium transition ${tab===t ? 'bg-primary text-background' : 'text-muted-foreground hover:bg-secondary'}`}>
              {t === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </div>

          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.type==='success' ? 'bg-success/10 text-success border border-success/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>{msg.text}</div>}

          <button onClick={tab==='signin' ? signIn : signUp} disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-background disabled:opacity-50">
            {loading ? 'Loading…' : tab==='signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <button onClick={signInGoogle} className="w-full rounded-lg border border-border py-2.5 text-sm text-foreground hover:bg-secondary">Continue with Google</button>

          <p className="text-center text-xs text-muted-foreground">New accounts default to the student role. Teachers must be promoted in the database.</p>
        </div>
      </div>
    </div>
  )
}
