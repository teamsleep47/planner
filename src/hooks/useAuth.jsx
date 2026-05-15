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

function saveProfile(p) { try { localStorage.setItem(LS_PROFILE, JSON.stringify(p)) } catch(e) {} }
function loadProfile()  { try { return JSON.parse(localStorage.getItem(LS_PROFILE)||'null') } catch(e) { return null } }
function saveHint(h)    { try { localStorage.setItem(LS_HINT, h||'') } catch(e) {} }
function loadHint()     { try { return localStorage.getItem(LS_HINT)||'' } catch(e) { return '' } }
function saveToken(t)   { try { localStorage.setItem(LS_TOKEN, t||'') } catch(e) {} }
function loadToken()    { try { return localStorage.getItem(LS_TOKEN)||'' } catch(e) { return '' } }
function clearSession() {
  try {
    localStorage.removeItem(LS_PROFILE)
    localStorage.removeItem(LS_HINT)
    localStorage.removeItem(LS_TOKEN)
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

function parseHash() {
  const hash = window.location.hash
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

// ── Context so token is available everywhere ──────
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(() => loadToken())
  const [profile, setProfile] = useState(loadProfile)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
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

  const bootWithToken = useCallback((tok) => {
    setToken(tok); saveToken(tok)
    setLoading(false); setError(null)
    clearTimeout(refreshRef.current)
    refreshRef.current = setTimeout(() => {
      const hint = loadHint()
      window.location.href = buildOauthUrl(hint || null)
    }, 55 * 60 * 1000)
    fetchProfile(tok)
  }, [fetchProfile])

  const signIn  = useCallback(() => { setError(null); window.location.href = buildOauthUrl(null) }, [])
  const signOut = useCallback(() => {
    clearTimeout(refreshRef.current)
    clearSession()
    setToken(null); setProfile(null); setLoading(false)
  }, [])

  useEffect(() => {
    const params = parseHash()
    if (params.error) { clearHash(); setError(params.error); setLoading(false); return }
    if (params.access_token) { clearHash(); bootWithToken(params.access_token); return }
    // Check persisted token
    const persisted = loadToken()
    if (persisted) { bootWithToken(persisted); return }
    // Try silent restore
    const hint = loadHint()
    if (hint) { window.location.href = buildOauthUrl(hint) }
    else { setLoading(false) }
  }, [bootWithToken])

  return (
    <AuthContext.Provider value={{ token, profile, loading, error, signIn, signOut, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
