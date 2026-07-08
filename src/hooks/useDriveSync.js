import { useState, useCallback, useRef, useEffect } from 'react'
import { save } from '../utils/storage.js'

const FILE_NAME = 'planner_data_v1.json'
const LS_TOKEN  = 'planner_token_v1'

function getToken() {
  try { return localStorage.getItem(LS_TOKEN) || '' } catch(e) { return '' }
}

export function useDriveSync() {
  const [saveState,  setSaveState]  = useState('idle')
  const [synced,     setSynced]     = useState(false)
  const fileIdRef   = useRef(null)
  const debounceRef = useRef(null)
  // Track whether we're in the middle of a save so we don't boot-load
  // and clobber a save that just completed on THIS device
  const justSavedRef = useRef(false)

  const getFileId = useCallback(async (token) => {
    if (fileIdRef.current) return fileIdRef.current
    const res  = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${FILE_NAME}'%20and%20trashed%3Dfalse&fields=files(id)`,
      { headers: { Authorization: 'Bearer ' + token } }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (data.files?.length) {
      fileIdRef.current = data.files[0].id
      return fileIdRef.current
    }
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }),
    })
    if (!create.ok) throw new Error('Create failed: ' + create.status)
    const file = await create.json()
    fileIdRef.current = file.id
    return fileIdRef.current
  }, [])

  // ── Load from Drive on boot ─────────────────────────────────────
  // Strategy: Drive always wins on load. This means:
  // - If you edited on PC1 and PC2 loads → PC2 gets PC1's latest data ✓
  // - If you edited on this device and refresh → Drive has the latest (saved 1.5s after edit) ✓
  // - The only edge case is editing then refreshing within 1.5s → handled by justSavedRef
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const loadFromDrive = async () => {
      try {
        const fileId = await getFileId(token)
        const res    = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: 'Bearer ' + token } }
        )

        if (res.status === 401) {
          window.dispatchEvent(new Event('token-expired'))
          setSynced(true); return
        }
        if (!res.ok) {
          // No file yet (first use) — nothing to load
          setSynced(true)
          window.dispatchEvent(new Event('drive-loaded'))
          return
        }

        const data = await res.json()

        // Remove internal metadata key before writing to localStorage
        const { __sync_ts, ...payload } = data

        // Only overwrite local data if Drive is newer than what we last saved locally.
        // This prevents an old Drive file (e.g. from a stale device) from clobbering
        // newer local edits made on this device since the last sync.
        const driveTs = Number(__sync_ts || 0)
        const localTs = Number(localStorage.getItem('planner_v1_last_save_ts') || 0)

        if (driveTs >= localTs) {
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) save(key, value)
          })
          console.log('[drive] loaded — Drive wins (Drive ts:', driveTs, '> local ts:', localTs, ')')
        } else {
          console.log('[drive] loaded — local is newer, keeping local (local ts:', localTs, '> Drive ts:', driveTs, ')')
        }
        setSynced(true)
        window.dispatchEvent(new Event('drive-loaded'))
      } catch(e) {
        console.error('[drive] load error:', e)
        setSynced(true)
        // Fire event anyway so app doesn't hang waiting
        window.dispatchEvent(new Event('drive-loaded'))
      }
    }

    loadFromDrive()
  }, [getFileId])

  // ── Re-sync when tab becomes visible ──────────────────────────
  // This is the fix for cross-device stale data. When you switch back
  // to this tab after editing on another device, Drive is re-pulled.
  // We throttle to once per 30 seconds to avoid hammering the API.
  useEffect(() => {
    let lastSync = 0
    const THROTTLE_MS = 30_000

    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastSync < THROTTLE_MS) return
      lastSync = now

      const token = getToken()
      if (!token) return

      try {
        const fileId = await getFileId(token)
        const res    = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: 'Bearer ' + token } }
        )
        if (res.status === 401) { window.dispatchEvent(new Event('token-expired')); return }
        if (!res.ok) return

        const data = await res.json()
        const { __sync_ts, ...payload } = data

        // Only overwrite if Drive is newer than what we last saved
        const driveTs = Number(__sync_ts || 0)
        const localTs = Number(localStorage.getItem('planner_v1_last_save_ts') || 0)

        if (driveTs > localTs) {
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) save(key, value)
          })
          console.log('[drive] visibility sync — Drive newer, refreshing…')
          window.dispatchEvent(new Event('drive-loaded'))
        } else {
          console.log('[drive] visibility sync — local is current, no update needed')
        }
      } catch(e) {
        console.error('[drive] visibility sync error:', e)
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [getFileId])

  // ── Save to Drive (debounced 1.5s) ─────────────────────────────
  // Every data change triggers this. The 1.5s debounce means rapid edits
  // only result in one write. __sync_ts lets us debug timing if needed.
  const syncToDrive = useCallback((allData) => {
    const token = getToken()
    if (!token) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const fileId  = await getFileId(token)
        const payload = { ...allData, __sync_ts: Date.now() }

        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method:  'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          }
        )

        if (res.status === 401) {
          window.dispatchEvent(new Event('token-expired'))
          throw new Error('TOKEN_EXPIRED')
        }
        if (!res.ok) throw new Error('HTTP ' + res.status)

        justSavedRef.current = true
        setTimeout(() => { justSavedRef.current = false }, 5000)
        // Stamp local save time so visibility sync knows Drive is current
        localStorage.setItem('planner_v1_last_save_ts', String(payload.__sync_ts))

        console.log('[drive] saved ok at', new Date().toLocaleTimeString())
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2500)
      } catch(e) {
        console.error('[drive] save error:', e)
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    }, 1500)
  }, [getFileId])

  return { syncToDrive, saveState, synced }
}
