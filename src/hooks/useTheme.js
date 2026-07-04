import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'

const SCHEMES       = ['indigo', 'teal', 'rose', 'amber']
const SCHEME_COLORS = { indigo: '#6366f1', teal: '#14b8a6', rose: '#f43f5e', amber: '#f59e0b' }

// Toggle only cycles dark ↔ light
// Bing is buried — accessible only via setTheme('bing') in Settings
const TOGGLE_CYCLE = ['dark', 'light']

export function useTheme() {
  const [theme,  setThemeState]  = useState(() => load('theme', 'dark'))
  const [scheme, setSchemeState] = useState(() => load('scheme', 'indigo'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme',  theme)
    document.documentElement.setAttribute('data-scheme', scheme)
  }, [theme, scheme])

  const toggleTheme = () => {
    // If currently on bing, toggle goes to dark
    const base = theme === 'bing' ? 'dark' : theme
    const idx  = TOGGLE_CYCLE.indexOf(base)
    const next = TOGGLE_CYCLE[(idx + 1) % TOGGLE_CYCLE.length]
    setThemeState(next)
    save('theme', next)
  }

  const setTheme  = (t) => { setThemeState(t);  save('theme',  t) }
  const setScheme = (s) => { setSchemeState(s); save('scheme', s) }

  return { theme, scheme, toggleTheme, setTheme, setScheme, SCHEMES, SCHEME_COLORS }
}
