import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  getRedirectResult,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase.js'

function toProfile(user) {
  if (!user) return null
  return {
    name:    user.displayName || user.email || 'User',
    email:   user.email || '',
    picture: user.photoURL || '',
  }
}

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    // Surface errors from the redirect round-trip (e.g. popup/redirect closed, access denied)
    getRedirectResult(auth).catch(e => {
      console.error('[auth] redirect result error:', e)
      setError(e.code || e.message)
    })

    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = useCallback(() => {
    setError(null)
    signInWithRedirect(auth, googleProvider)
  }, [])

  const signOut = useCallback(() => {
    fbSignOut(auth)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, profile: toProfile(user), loading, error,
      signIn, signOut,
      isAuthed: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
