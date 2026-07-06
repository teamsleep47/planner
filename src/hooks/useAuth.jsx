import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'

const CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE      = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')
const LS_PROFILE = 'planner_profile_v1'
const LS_HINT    = 'planner_hint_v1'
const LS_TOKEN   = 'planner_token_v1'
const LS_EXPIRY  = 'planner_token_expiry_v1'

function saveProfile(p) { try { localStorage.setItem(LS_PROFILE, JSON.stringify(p)) } catch(e) {} }
function loadProfile()  { try { return JSON.parse(localStorage.getItem(LS_PROFILE)||'null') } catch(e) { return null } }
function saveHint(h)    { try { localStorage.setItem(LS_HINT, h||'') } catch(e) {} }
function loadHint()     { try { return localStorage.getItem(LS_HINT)||'' } catch(e) { return '' } }
function saveToken(t)   { try { localStorage.setItem(LS_TOKEN, t||'') } catch(e) {} }
function loadToken()    { try { return localStorage.getItem(LS_TOKEN)||'' } catch(e) { return '' } }
function saveExpiry(ms) { try { localStorage.setItem(LS_EXPIRY, String(ms)) } catch(e) {} }
function loadExpiry()   { try { return Number(localStorage.getItem(LS_EXPIRY)||'0') } catch(e) { return 0 } }
function clearSession() {
  try {
    localStorage.removeItem(LS_PROFILE)
    localStorage.removeItem(LS_HINT)
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_EXPIRY)
  } catch(e) {}
}

function currentPageUrl() { return window.location.origin + window.location.pathname }

function buildOauthUrl(hint) {
  const p = new URLSearchParams({
    client_id:              CLIENT_ID,
    redirect_uri:           currentPageUrl(),
    response_type:          'token',
    scope:                  SCOPE,
    include_granted_scopes: 'true',
    prompt:                 hint ? 'none' : 'select_account',
    ...(hint ? { login_hint: hint } : {}),
  })
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString()
}

function parseHash(hash) {
  if (!hash || hash.length < 2) return {}
  const params = {}
  hash.slice(1).split('&').forEach(pair => {
    const eq = pair.indexOf('=')
    if (eq < 0) return
    try { params[decodeURIComponent(pair.slice(0,eq))] = decodeURIComponent(pair.slice(eq+1).replace(/\+/g,'%20')) } catch(e) {}
  })
  return params
}

function clearHash() {
  try { history.replaceState(null,'',window.location.pathname+window.location.search) } catch(e) {}
}

function isTokenExpired() {
  const expiry = loadExpiry()
  if (!expiry) return false  // old session without expiry — assume valid
  return Date.now() > expiry - 60_000  // treat as expired 1 min early
}

// ── Context ──────────────────────────────────────
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,        setToken]       = useState(null)
  const [profile,      setProfile]     = useState(loadProfile)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const refreshRef = useRef(null)

  const fetchProfile = useCallback((tok) => {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tok }
    })
      .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json() })
      .then(u => {
        const name = (u.name || ((u.given_name||'')+' '+(u.family_name||'')).trim() || u.email || '?').trim()
        const p = { name, email: u.email||'', picture: u.picture||'' }
        saveProfile(p); saveHint(p.email); setProfile(p)
      })
      .catch(e => console.error('[auth] userinfo:', e))
  }, [])

  const bootWithToken = useCallback((tok, expiresInSec) => {
    setToken(tok); saveToken(tok)
    setLoading(false); setError(null); setSessionExpired(false)

    // Store expiry timestamp so we can check it on visibility restore
    if (expiresInSec) {
      saveExpiry(Date.now() + Number(expiresInSec) * 1000)
    } else {
      // Default: assume 1 hour from now
      saveExpiry(Date.now() + 3600 * 1000)
    }

    clearTimeout(refreshRef.current)
    // Schedule refresh at 50 minutes (10 min before expiry)
    // Use 50min so it fires before the token actually dies
    refreshRef.current = setTimeout(() => {
      console.log('[auth] proactive token refresh…')
      doSilentRefresh()
    }, 50 * 60 * 1000)

    fetchProfile(tok)
  }, [fetchProfile])

  // Silent refresh via hidden iframe — doesn't affect current page
  const doSilentRefresh = useCallback(() => {
    const hint = loadHint()
    if (!hint) {
      // No hint means we can't do silent refresh — show expired overlay
      setSessionExpired(true)
      return
    }

    // Try iframe-based silent refresh first
    // Google will post a message back if it succeeds
    const url = buildOauthUrl(hint) + '&response_mode=fragment'

    // Fallback: just redirect — this is the simplest reliable approach
    // We save current data first (nothing to save here — App.jsx handles that)
    window.location.href = buildOauthUrl(hint)
  }, [])

  // Check token validity on tab visibility restore
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!loadToken()) return
      if (isTokenExpired()) {
        console.log('[auth] token expired while backgrounded — showing refresh prompt')
        setSessionExpired(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Listen for 401s from Drive sync
  useEffect(() => {
    const handler = () => {
      console.log('[auth] 401 received — token expired')
      setSessionExpired(true)
    }
    window.addEventListener('token-expired', handler)
    return () => window.removeEventListener('token-expired', handler)
  }, [])

  const signIn = useCallback(() => {
    setError(null); setSessionExpired(false)
    window.location.href = buildOauthUrl(null)
  }, [])

  const signOut = useCallback(() => {
    clearTimeout(refreshRef.current)
    clearSession()
    setToken(null); setProfile(null); setLoading(false); setSessionExpired(false)
  }, [])

  const refreshNow = useCallback(() => {
    const hint = loadHint()
    window.location.href = buildOauthUrl(hint || null)
  }, [])

  // On mount: parse hash or restore session
  useEffect(() => {
    const params = parseHash(window.location.hash)

    if (params.error) {
      clearHash()
      // error=access_denied means silent refresh was rejected (user revoked, etc.)
      if (params.error === 'access_denied' || params.error === 'interaction_required') {
        setSessionExpired(true)
        setLoading(false)
      } else {
        setError(params.error)
        setLoading(false)
      }
      return
    }

    if (params.access_token) {
      clearHash()
      bootWithToken(params.access_token, params.expires_in)
      return
    }

    // Restore persisted token
    const persisted = loadToken()
    if (persisted) {
      if (isTokenExpired()) {
        // Token is expired — don't boot with it, show expired overlay
        console.log('[auth] persisted token is expired')
        setSessionExpired(true)
        setLoading(false)
      } else {
        bootWithToken(persisted, null)
      }
      return
    }

    // No token — try silent restore with hint
    const hint = loadHint()
    if (hint) {
      window.location.href = buildOauthUrl(hint)
    } else {
      setLoading(false)
    }
  }, [bootWithToken])

  return (
    <AuthContext.Provider value={{
      token, profile, loading, error,
      signIn, signOut, refreshNow,
      isAuthed: !!token && !sessionExpired,
      sessionExpired,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
