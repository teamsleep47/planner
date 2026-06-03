import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth.jsx'
import App from './App.jsx'
import './index.css'

// ── Apply saved theme/scheme before first render (prevents flash) ──
const theme  = localStorage.getItem('planner_v1_theme')  || 'dark'
const scheme = localStorage.getItem('planner_v1_scheme') || 'indigo'
document.documentElement.setAttribute('data-theme',  theme)
document.documentElement.setAttribute('data-scheme', scheme)

// ── One-time migrations ────────────────────────────────────────────
// Run before React mounts so no component ever sees stale data.
// Each migration is guarded by a version flag so it only runs once.

const MIGRATION_KEY = 'planner_v1_migrations_done'
const done = JSON.parse(localStorage.getItem(MIGRATION_KEY) || '[]')

// Migration 1 — wipe hardcoded demo tasks that shipped as DEFAULT_TASKS
// Affects any device that never had home_tasks saved to Drive.
// Detects the demo tasks by their hardcoded IDs (1 and 2) and text content.
if (!done.includes('m1_wipe_demo_tasks')) {
  try {
    const raw   = localStorage.getItem('planner_v1_home_tasks')
    const tasks = raw ? JSON.parse(raw) : null
    if (Array.isArray(tasks)) {
      const DEMO_TEXTS = [
        'Read ahead — Humanities Ch.1',
        'Draft discussion post',
        "Read ahead \u2014 Humanities Ch.1",
      ]
      const hasDemoTasks = tasks.some(t =>
        (t.id === 1 || t.id === 2) &&
        DEMO_TEXTS.some(dt => (t.text || '').startsWith(dt.slice(0, 20)))
      )
      if (hasDemoTasks) {
        // Filter out only the demo tasks, keep any real ones the user added
        const realTasks = tasks.filter(t =>
          !(
            (t.id === 1 || t.id === 2) &&
            DEMO_TEXTS.some(dt => (t.text || '').startsWith(dt.slice(0, 20)))
          )
        )
        localStorage.setItem('planner_v1_home_tasks', JSON.stringify(realTasks))
        console.log('[migration] m1: removed demo tasks, kept', realTasks.length, 'real tasks')
      }
    }
  } catch(e) {
    console.warn('[migration] m1 failed:', e)
  }
  localStorage.setItem(MIGRATION_KEY, JSON.stringify([...done, 'm1_wipe_demo_tasks']))
}

// ── Mount app ─────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
