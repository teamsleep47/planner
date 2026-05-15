/**
 * useDriveSync — Google Drive persistence hook
 *
 * Status: scaffold only. Wire up after setting up
 * a Google Cloud project and getting a client ID.
 *
 * Usage (in any page):
 *   const { connected, save, load, connect } = useDriveSync()
 */

import { useState, useCallback } from 'react'

const SCOPES   = 'https://www.googleapis.com/auth/drive.file'
const FILE_KEY = 'dashboard_data_v1.json'

export function useDriveSync() {
  const [connected, setConnected] = useState(false)
  const [token, setToken]         = useState(null)

  // Step 1 — trigger OAuth popup
  const connect = useCallback(() => {
    const CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const REDIRECT   = encodeURIComponent(window.location.origin + window.location.pathname)
    const url = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${CLIENT_ID}`,
      `&redirect_uri=${REDIRECT}`,
      `&response_type=token`,   // implicit flow — safe for static sites (no secret)
      `&scope=${encodeURIComponent(SCOPES)}`,
      `&prompt=consent`,
    ].join('')
    window.location.href = url
  }, [])

  // Step 2 — on page load, check URL hash for token (implicit flow callback)
  const handleCallback = useCallback(() => {
    const hash   = new URLSearchParams(window.location.hash.replace('#', '?'))
    const access = hash.get('access_token')
    if (access) {
      setToken(access)
      setConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Step 3 — save data object to Drive as JSON
  const save = useCallback(async (data) => {
    if (!token) return
    const body = JSON.stringify(data, null, 2)
    // TODO: check if file exists first, then patch vs create
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    })
  }, [token])

  // Step 4 — load data object from Drive
  const load = useCallback(async () => {
    if (!token) return null
    // TODO: search for file by name, then fetch its content
    return null
  }, [token])

  return { connected, connect, handleCallback, save, load }
}
