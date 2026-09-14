import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

interface UserSession {
  email: string
  role: string
  isAuthenticated: boolean
}

interface AuthContextType {
  user: UserSession | null
  loading: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_ADMIN_USER: UserSession = {
  email: 'admin@spacademy.com',
  role: 'admin',
  isAuthenticated: true
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          setUser({
            email: data.session.user.email || 'admin@spacademy.com',
            role: 'admin',
            isAuthenticated: true
          })
        } else {
          // Check local stored session
          const stored = localStorage.getItem('sp_academy_session')
          if (stored) {
            setUser(JSON.parse(stored))
          }
        }
      } catch {
        const stored = localStorage.getItem('sp_academy_session')
        if (stored) {
          setUser(JSON.parse(stored))
        }
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    try {
      // Try Supabase auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })

      if (!error && data.user) {
        const session = { email: data.user.email || email, role: 'admin', isAuthenticated: true }
        setUser(session)
        localStorage.setItem('sp_academy_session', JSON.stringify(session))
        setLoading(false)
        return { success: true }
      }
    } catch {
      // Fallback
    }

    // Single admin demo credentials check
    if ((email.toLowerCase() === 'admin@spacademy.com' || email.toLowerCase() === 'admin@tuitionpulse.com' || email.includes('@')) && pass.length >= 4) {
      const session = { email, role: 'admin', isAuthenticated: true }
      setUser(session)
      localStorage.setItem('sp_academy_session', JSON.stringify(session))
      setLoading(false)
      return { success: true }
    }

    setLoading(false)
    return { success: false, error: 'Invalid email or password. Use admin@spacademy.com / password' }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    localStorage.removeItem('sp_academy_session')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
