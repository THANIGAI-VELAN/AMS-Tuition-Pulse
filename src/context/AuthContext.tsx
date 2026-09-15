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

const ADMIN_EMAIL = 'spracademy18@gmail.com'
const ADMIN_PASS = 'Rethusna2018*'

const MOCK_ADMIN_USER: UserSession = {
  email: ADMIN_EMAIL,
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
        if (data.session?.user && data.session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setUser({
            email: ADMIN_EMAIL,
            role: 'admin',
            isAuthenticated: true
          })
        } else {
          // Check local stored session
          const stored = localStorage.getItem('sp_academy_session')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && parsed.isAuthenticated) {
              setUser(parsed)
            } else {
              localStorage.removeItem('sp_academy_session')
            }
          }
        }
      } catch {
        const stored = localStorage.getItem('sp_academy_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && parsed.isAuthenticated) {
            setUser(parsed)
          } else {
            localStorage.removeItem('sp_academy_session')
          }
        }
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    const cleanEmail = email.trim().toLowerCase()

    // Strict Admin Credential Match
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase() || pass !== ADMIN_PASS) {
      setLoading(false)
      return {
        success: false,
        error: 'Access Denied: Only authorized SP Academy Admin can access this application.'
      }
    }

    try {
      // Optional Supabase auth sync
      await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: pass,
      })
    } catch {
      // Offline fallback
    }

    const session = { email: ADMIN_EMAIL, role: 'admin', isAuthenticated: true }
    setUser(session)
    localStorage.setItem('sp_academy_session', JSON.stringify(session))
    setLoading(false)
    return { success: true }
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
