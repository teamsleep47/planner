// useDriveSync — auto-saves data to Google Drive on every change
// Shows a 'Saved' indicator for 2 seconds after each save

import { useState, useCallback, useRef } from 'react'

const FILE_NAME = 'planner_data_v1.json'

export function useDriveSync(token) {
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const fileIdRef  = useRef(null)
  const debounceRef = useRef(null)

  // Find or create the data file in Drive
  const getFileId = useCallback(async () => {
    if (fileIdRef.current) return fileIdRef.current
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${FILE_NAME}'%20and%20trashed%3Dfalse&spaces=drive&fields=files(id)`,
      { headers: { Authorization: 'Bearer ' + token } }
    )
    const data = await res.json()
    if (data.files && data.files.length > 0) {
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
  }, [token])

  // Save all localStorage planner data to Drive (debounced 2s)
  const syncToDrive = useCallback((allData) => {
    if (!token) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const fileId = await getFileId()
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
          }
        )
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch(e) {
        console.error('[drive] save error:', e)
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    }, 2000)
  }, [token, getFileId])

  // Load data from Drive on boot
  const loadFromDrive = useCallback(async () => {
    if (!token) return null
    try {
      const fileId = await getFileId()
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
  }, [token, getFileId])

  return { syncToDrive, loadFromDrive, saveState }
}
