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

  const getFileId = useCallback(async (token) => {
    if (fileIdRef.current) return fileIdRef.current
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${FILE_NAME}'%20and%20trashed%3Dfalse&fields=files(id)`,
      { headers: { Authorization: 'Bearer ' + token } }
    )
    const data = await res.json()
    if (data.files?.length) {
      fileIdRef.current = data.files[0].id
      return fileIdRef.current
    }
    // Create new file
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' })
    })
    const file = await create.json()
    fileIdRef.current = file.id
    return fileIdRef.current
  }, [])

  // ── Load from Drive on boot, overwrite localStorage ──
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const loadFromDrive = async () => {
      try {
        const fileId = await getFileId(token)
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: 'Bearer ' + token } }
        )
        if (!res.ok) { setSynced(true); return }
        const data = await res.json()
        // Write each key from Drive into localStorage
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            save(key, value)
          }
        })
        console.log('[drive] loaded from Drive, refreshing…')
        setSynced(true)
        // Force re-render so pages pick up new localStorage values
        window.dispatchEvent(new Event('drive-loaded'))
      } catch(e) {
        console.error('[drive] load error:', e)
        setSynced(true)
      }
    }

    loadFromDrive()
  }, [getFileId])

  // ── Save to Drive (debounced 1.5s) ──────────────────
  const syncToDrive = useCallback((allData) => {
    const token = getToken()
    if (!token) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const fileId = await getFileId(token)
        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
          }
        )
        if (res.status === 401) {
          // Token expired — trigger silent re-auth
          window.dispatchEvent(new Event('token-expired'))
          throw new Error('TOKEN_EXPIRED')
        }
        if (!res.ok) throw new Error('HTTP ' + res.status)
        console.log('[drive] saved ok')
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
