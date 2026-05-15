import { useState, useCallback, useRef } from 'react'

const FILE_NAME = 'planner_data_v1.json'
const LS_TOKEN  = 'planner_token_v1'

function getToken() {
  try { return localStorage.getItem(LS_TOKEN) || '' } catch(e) { return '' }
}

export function useDriveSync() {
  const [saveState,  setSaveState]  = useState('idle')
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

  const syncToDrive = useCallback((allData) => {
    const token = getToken()
    if (!token) { console.log('[drive] no token, skipping sync'); return }

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

  const loadFromDrive = useCallback(async () => {
    const token = getToken()
    if (!token) return null
    try {
      const fileId = await getFileId(token)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      if (!res.ok) return null
      return await res.json()
    } catch(e) {
      console.error('[drive] load error:', e)
      return null
    }
  }, [getFileId])

  return { syncToDrive, loadFromDrive, saveState }
}
