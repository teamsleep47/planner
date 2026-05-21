// useBingWallpaper.js — fetches today's Bing daily photo
// Uses allorigins.win as a CORS proxy since Bing doesn't allow direct cross-origin fetches.
// Caches result in localStorage keyed by date so it only fetches once per day.

import { useState, useEffect } from 'react'

const CACHE_KEY = 'planner_v1_bing_wallpaper_cache'
const PROXY     = 'https://api.allorigins.win/get?url='
const BING_URL  = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'

function todayStr() {
  return new Date().toISOString().slice(0, 10)          // "2026-05-21"
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
}

export function useBingWallpaper(enabled = true) {
  const [wallpaper, setWallpaper] = useState(null)   // { url, title, copyright, location }
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!enabled) return

    const today = todayStr()
    const cached = readCache()

    // Return cached data if it's from today
    if (cached?.date === today && cached?.url) {
      setWallpaper(cached)
      return
    }

    setLoading(true)
    setError(null)

    const encoded = encodeURIComponent(BING_URL)
    fetch(`${PROXY}${encoded}`)
      .then(r => r.json())
      .then(proxy => {
        const json = JSON.parse(proxy.contents)
        const img  = json.images?.[0]
        if (!img) throw new Error('No image in response')

        // Bing returns paths like /th?id=OHR.xyz — make them absolute
        const url = `https://www.bing.com${img.url}`

        // Try to split "Title (Location)" into parts for the overlay
        const rawTitle = img.title || ''
        const rawCopyright = img.copyright || ''
        // copyright looks like "Acropolis of Athens, Greece (© example)"
        const locationMatch = rawCopyright.match(/^(.+?)\s*\(/)
        const location = locationMatch ? locationMatch[1].trim() : rawCopyright

        const data = { url, title: rawTitle, copyright: rawCopyright, location, date: today }
        writeCache(data)
        setWallpaper(data)
      })
      .catch(err => {
        console.warn('[bing] fetch failed:', err)
        // Try fallback: use cached even if stale
        if (cached?.url) setWallpaper(cached)
        else setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [enabled])

  return { wallpaper, loading, error }
}
