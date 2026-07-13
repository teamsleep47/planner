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
    let unsub = () => {}
    let cancelled = false

    // Resolve the pending redirect result FIRST. onAuthStateChanged's very
    // first callback can otherwise fire with user:null before the SDK has
    // finished processing the redirect credential, which flips loading to
    // false with no user and bounces a just-signed-in user back to the
    // login page. Subscribing only after the redirect has settled avoids
    // that race.
    getRedirectResult(auth)
      .catch(e => {
        console.error('[auth] redirect result error:', e)
        setError(e.code || e.message)
      })
      .finally(() => {
        if (cancelled) return
        unsub = onAuthStateChanged(auth, u => {
          setUser(u)
          setLoading(false)
        })
      })

    return () => { cancelled = true; unsub() }
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
