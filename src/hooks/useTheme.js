import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'

export function useTheme() {
  const [theme, setThemeState] = useState(() => load('theme', 'dark'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Keep indigo scheme permanently
    document.documentElement.setAttribute('data-scheme', 'indigo')
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    save('theme', next)
  }

  const setTheme = (t) => { setThemeState(t); save('theme', t) }

  return { theme, toggleTheme, setTheme }
}
