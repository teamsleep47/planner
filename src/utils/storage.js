// storage.js — localStorage persistence layer
// Every page uses this instead of raw localStorage

const PREFIX = 'planner_v1_'

export function load(key, fallback = null) {
  try {
    const val = localStorage.getItem(PREFIX + key)
    return val ? JSON.parse(val) : fallback
  } catch(e) { return fallback }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch(e) {}
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key) } catch(e) {}
}
