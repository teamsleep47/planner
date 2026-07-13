import { useState, useCallback, useRef, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { save } from '../utils/storage.js'
import { useAuth } from './useAuth.jsx'

const LS_LAST_SAVE_TS = 'planner_v1_last_save_ts'

// ── Real-time Firestore sync ──────────────────────────────────────
// One document per user: users/{uid}/planner/data
// Replaces the old Drive "load on boot + throttled visibility poll"
// with a live onSnapshot listener — updates from other tabs/devices
// arrive automatically, no polling needed.
export function useFirestoreSync(getLocalData) {
  const { user } = useAuth()
  const [saveState, setSaveState] = useState('idle')
  const [synced,    setSynced]    = useState(false)
  const debounceRef      = useRef(null)
  const lastWrittenTsRef = useRef(0)

  useEffect(() => {
    if (!user) { setSynced(false); return }

    const ref = doc(db, 'users', user.uid, 'planner', 'data')

    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) {
        // First sign-in for this user — seed Firestore from whatever is
        // already in localStorage so nothing is lost.
        const payload = { ...getLocalData(), __sync_ts: Date.now() }
        lastWrittenTsRef.current = payload.__sync_ts
        setDoc(ref, payload).catch(e => console.error('[sync] seed error:', e))
        setSynced(true)
        return
      }

      const { __sync_ts, ...payload } = snap.data()
      const remoteTs = Number(__sync_ts || 0)

      // Ignore the snapshot echo of our own just-completed write
      if (remoteTs === lastWrittenTsRef.current) { setSynced(true); return }

      const localTs = Number(localStorage.getItem(LS_LAST_SAVE_TS) || 0)

      if (remoteTs >= localTs) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) save(key, value)
        })
        localStorage.setItem(LS_LAST_SAVE_TS, String(remoteTs))
        console.log('[sync] applied remote update (ts:', remoteTs, ')')
        window.dispatchEvent(new Event('drive-loaded'))
      } else {
        console.log('[sync] local is newer, keeping local (local ts:', localTs, '> remote ts:', remoteTs, ')')
      }
      setSynced(true)
    }, e => {
      console.error('[sync] snapshot error:', e)
      setSynced(true)
    })

    return unsub
  }, [user?.uid, getLocalData])

  // ── Save to Firestore (debounced 1.5s) ──────────────────────────
  const syncToCloud = useCallback((allData) => {
    if (!user) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const ref     = doc(db, 'users', user.uid, 'planner', 'data')
        const payload = { ...allData, __sync_ts: Date.now() }
        lastWrittenTsRef.current = payload.__sync_ts

        await setDoc(ref, payload)

        localStorage.setItem(LS_LAST_SAVE_TS, String(payload.__sync_ts))
        console.log('[sync] saved ok at', new Date().toLocaleTimeString())
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2500)
      } catch (e) {
        console.error('[sync] save error:', e)
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    }, 1500)
  }, [user])

  return { syncToCloud, saveState, synced }
}
