import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function CreatorAuth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { profile, login, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && profile?.role === 'creator') {
      navigate('/dashboard/creator')
    }
  }, [authLoading, profile, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { token, user } = await api.post('/auth/login', { email, password })
        login(token, user)
      } else {
        const { token, user } = await api.post('/auth/signup', { name, email, password, role: 'creator' })
        login(token, user)
      }
      navigate('/dashboard/creator')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 bg-bg"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)',
      }}
    >
      <div className="w-full max-w-[400px] bg-bg-2 border border-white/[0.06] rounded-r-3 p-8 animate-fade-up">
        <Link to="/" className="text-text-3 text-sm hover:text-text transition-colors mb-6 inline-block">
          &larr; Back
        </Link>

        <div className="inline-block bg-accent-bg text-accent-2 text-xs font-medium px-3 py-1 rounded-full mb-5">
          🎬 Creator Portal
        </div>

        <h2 className="text-text text-2xl font-serif font-bold mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-text-3 text-sm mb-6">
          {mode === 'login' ? 'Sign in to manage your invoices' : 'Start managing your invoices'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-bg-3 border border-white/[0.06] rounded-r-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 outline-none focus:border-accent-border transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-bg-3 border border-white/[0.06] rounded-r-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 outline-none focus:border-accent-border transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-bg-3 border border-white/[0.06] rounded-r-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 outline-none focus:border-accent-border transition-colors"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white text-sm font-medium py-2.5 rounded-r-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-text-3 text-xs text-center mt-5">
          {mode === 'login' ? (
            <>
              New creator?{' '}
              <button onClick={() => { setMode('signup'); setError('') }} className="text-accent-2 hover:underline">
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-accent-2 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
