import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setToken } from '../lib/api'
import type { Profile } from '../lib/types'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  login: (token: string, user: Profile) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we have a stored token and fetch profile
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/profiles/me')
        .then(data => setProfile(data))
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('token')
          setProfile(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function login(token: string, user: Profile) {
    setToken(token)
    setProfile(user)
  }

  function signOut() {
    setToken(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
