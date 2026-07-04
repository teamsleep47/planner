import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'

const SCHEMES       = ['indigo', 'teal', 'rose', 'amber']
const SCHEME_COLORS = { indigo: '#6366f1', teal: '#14b8a6', rose: '#f43f5e', amber: '#f59e0b' }

export function useTheme() {
  const [theme,  setThemeState]  = useState(() => load('theme', 'dark'))
  const [scheme, setSchemeState] = useState(() => load('scheme', 'indigo'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme',  theme)
    document.documentElement.setAttribute('data-scheme', scheme)
  }, [theme, scheme])

  // Toggle only cycles dark ↔ light
  // Bing is accessible only via setTheme('bing') in Settings
  const toggleTheme = () => {
    const next = (theme === 'dark' || theme === 'bing') ? 'light' : 'dark'
    setThemeState(next)
    save('theme', next)
  }

  const setTheme  = (t) => { setThemeState(t);  save('theme',  t) }
  const setScheme = (s) => { setSchemeState(s); save('scheme', s) }

  return { theme, scheme, toggleTheme, setTheme, setScheme, SCHEMES, SCHEME_COLORS }
}
