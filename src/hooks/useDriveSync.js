import { useState, useCallback, useRef, useEffect } from 'react'
import { save } from '../utils/storage.js'

const FILE_NAME = 'planner_data_v1.json'
const LS_TOKEN  = 'planner_token_v1'
const TS_KEY    = 'planner_v1_last_sync_ts'

function getToken() {
  try { return localStorage.getItem(LS_TOKEN) || '' } catch(e) { return '' }
}
function getLocalTs() {
  try { return Number(localStorage.getItem(TS_KEY) || 0) } catch(e) { return 0 }
}
function setLocalTs(ts) {
  try { localStorage.setItem(TS_KEY, String(ts)) } catch(e) {}
}

export function useDriveSync() {
  const [saveState,  setSaveState]  = useState('idle')
  const [synced,     setSynced]     = useState(false)
  const fileIdRef   = useRef(null)
  const debounceRef = useRef(null)

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
      method:  'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }),
    })
    if (!create.ok) throw new Error('Create failed: ' + create.status)
    const file = await create.json()
    fileIdRef.current = file.id
    return fileIdRef.current
  }, [])

  // ── Load from Drive on boot ─────────────────────────────────────
  // Only overwrites localStorage if Drive data is NEWER than last
  // successful local save. Prevents stale Drive from clobbering
  // fresh edits made on this device while offline.
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
        if (!res.ok) { setSynced(true); return }

        const data    = await res.json()
        const driveTs = Number(data.__sync_ts || 0)
        const localTs = getLocalTs()

        console.log('[drive] load — driveTs:', driveTs, 'localTs:', localTs)

        if (driveTs >= localTs) {
          // Drive is same age or newer — load it
          Object.entries(data).forEach(([key, value]) => {
            if (key === '__sync_ts') return
            if (value !== null && value !== undefined) save(key, value)
          })
          console.log('[drive] loaded from Drive')
        } else {
          // This device is newer — skip Drive load, but still fire event
          console.log('[drive] local is newer — skipping overwrite')
        }

        setSynced(true)
        window.dispatchEvent(new Event('drive-loaded'))
      } catch(e) {
        console.error('[drive] load error:', e)
        setSynced(true)
        window.dispatchEvent(new Event('drive-loaded'))
      }
    }

    loadFromDrive()
  }, [getFileId])

  // ── Save to Drive (debounced 1.5s) ─────────────────────────────
  const syncToDrive = useCallback((allData) => {
    const token = getToken()
    if (!token) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const fileId = await getFileId(token)
        const ts     = Date.now()
        const payload = { ...allData, __sync_ts: ts }

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

        setLocalTs(ts)
        console.log('[drive] saved ok, ts:', ts)
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
