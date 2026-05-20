// useNotifications.js — browser push + in-app bell notifications

import { useState, useEffect, useCallback } from 'react'
import { load, save } from '../utils/storage.js'

const DEFAULT_SETTINGS = {
  enabled:        true,
  browserPush:    false,  // requires permission
  dueSoon3d:      true,
  dueSoon1d:      true,
  dueToday:       true,
  streakBreak:    true,
  habitReminder:  false,
  habitReminderTime: '20:00',
}

const NOTIF_KEY     = 'notification_settings'
const SEEN_KEY      = 'notifications_seen'
const LAST_CHECK    = 'notifications_last_check'

export function useNotifications() {
  const [settings,  setSettings]  = useState(() => load(NOTIF_KEY, DEFAULT_SETTINGS))
  const [notifs,    setNotifs]    = useState([])
  const [unread,    setUnread]    = useState(0)
  const [permission,setPermission]= useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'default')

  const saveSettings = (s) => { setSettings(s); save(NOTIF_KEY, s) }

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const sendBrowserNotif = useCallback((title, body, tag) => {
    if (permission !== 'granted' || !settings.browserPush) return
    try {
      new Notification(title, { body, tag, icon: '/planner/favicon.svg', badge: '/planner/favicon.svg' })
    } catch(e) {}
  }, [permission, settings.browserPush])

  const addNotif = useCallback((id, title, body, color = 'var(--accent)', urgent = false) => {
    const seen = load(SEEN_KEY, [])
    if (seen.includes(id)) return null
    const notif = { id, title, body, color, urgent, time: new Date().toISOString() }
    setNotifs(ns => [notif, ...ns].slice(0, 20))
    setUnread(u => u + 1)
    return notif
  }, [])

  const markAllRead = useCallback(() => {
    const ids = notifs.map(n => n.id)
    const seen = load(SEEN_KEY, [])
    save(SEEN_KEY, [...new Set([...seen, ...ids])])
    setUnread(0)
  }, [notifs])

  const clearNotif = useCallback((id) => {
    setNotifs(ns => ns.filter(n => n.id !== id))
    setUnread(u => Math.max(0, u - 1))
  }, [])

  // Check for notifications
  const checkNotifications = useCallback(() => {
    if (!settings.enabled) return
    const today = new Date().toISOString().slice(0, 10)
    const lastCheck = load(LAST_CHECK, '')
    save(LAST_CHECK, today)

    // Get assignments from terms
    try {
      const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
      const active = terms.find(t => t.active) || terms[0]
      if (active) {
        const assignments = active.courses.flatMap(c =>
          c.assignments.map(a => ({ ...a, courseName: c.name }))
        ).filter(a => a.status !== 'Done' && a.due)

        assignments.forEach(a => {
          const diffDays = Math.ceil((new Date(a.due) - new Date()) / 86400000)
          const shortTitle = a.title.length > 30 ? a.title.slice(0, 30) + '…' : a.title

          if (settings.dueSoon3d && diffDays === 3) {
            const id = `due3d-${a.id}-${today}`
            const n = addNotif(id, '📅 Due in 3 days', `${shortTitle} — ${a.courseName}`, 'var(--amber)')
            if (n) sendBrowserNotif('Due in 3 days', `${a.title} (${a.courseName})`, id)
          }
          if (settings.dueSoon1d && diffDays === 1) {
            const id = `due1d-${a.id}-${today}`
            const n = addNotif(id, '⚠️ Due tomorrow', `${shortTitle} — ${a.courseName}`, 'var(--coral)', true)
            if (n) sendBrowserNotif('Due tomorrow!', `${a.title} (${a.courseName})`, id)
          }
          if (settings.dueToday && diffDays === 0) {
            const id = `due0d-${a.id}-${today}`
            const n = addNotif(id, '🔴 Due today', `${shortTitle} — ${a.courseName}`, '#ef4444', true)
            if (n) sendBrowserNotif('Due today!', `${a.title} (${a.courseName})`, id)
          }
        })
      }
    } catch(e) {}

    // Streak reminder
    if (settings.streakBreak) {
      const sessions = load('study_sessions', [])
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const studiedToday = sessions.some(s => s.date === todayStr)
      const streak = load('streak', 0)
      if (!studiedToday && streak > 0 && new Date().getHours() >= 18) {
        const id = `streak-${today}`
        const n = addNotif(id, '🔥 Streak at risk!', `Study today to keep your ${streak}-day streak alive`, 'var(--amber)', true)
        if (n) sendBrowserNotif('Streak at risk!', `Study today to keep your ${streak}-day streak`, id)
      }
    }
  }, [settings, addNotif, sendBrowserNotif])

  // Run check on mount and every hour
  useEffect(() => {
    checkNotifications()
    const id = setInterval(checkNotifications, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [checkNotifications])

  return {
    settings, saveSettings,
    notifs, unread, markAllRead, clearNotif,
    permission, requestPermission,
    DEFAULT_SETTINGS,
  }
}
