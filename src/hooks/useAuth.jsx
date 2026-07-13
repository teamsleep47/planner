import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
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
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  // Popup instead of redirect: the app isn't served from Firebase Hosting,
  // so the authDomain's redirect-relay iframe can't self-configure via
  // /__/firebase/init.json (that path only exists once Hosting has been
  // deployed for the project), which breaks signInWithRedirect entirely.
  // Popup resolves the credential directly through its promise, in the
  // same page lifecycle, without depending on that relay.
  const signIn = useCallback(() => {
    setError(null)
    signInWithPopup(auth, googleProvider).catch(e => {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return
      console.error('[auth] sign-in error:', e)
      setError(e.code || e.message)
    })
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
