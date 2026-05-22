import { useState, useEffect } from 'react'

const CACHE_KEY = 'planner_v1_bing_wallpaper_cache'
const API_URL   = 'https://peapix.com/bing/feed?country=us&n=1'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null } }
function writeCache(d) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)) } catch {} }

export function useBingWallpaper(enabled = true) {
  const [wallpaper, setWallpaper] = useState(() => { const c = readCache(); return c?.url ? c : null })
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!enabled) return
    const today  = todayStr()
    const cached = readCache()
    if (cached?.date === today && cached?.url) { setWallpaper(cached); return }

    setLoading(true); setError(null)
    fetch(API_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(images => {
        const img = images?.[0]
        if (!img?.fullUrl) throw new Error('No image in response')
        const data = {
          url:       img.fullUrl,
          thumbUrl:  img.thumbUrl || img.fullUrl,
          title:     img.title     || '',
          copyright: img.copyright || '',
          location:  (img.title    || '').replace(/,\s*$/, ''),
          date:      today,
        }
        writeCache(data); setWallpaper(data)
      })
      .catch(err => {
        console.warn('[bing] fetch failed:', err)
        const stale = readCache()
        if (stale?.url) setWallpaper(stale)
        else setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [enabled])

  return { wallpaper, loading, error }
}
