import { load, save } from './storage.js'

const KEY = 'terms_v1'

export const DEFAULT_TERMS = [
  {
    id: 't1', name: 'Summer 2026', active: true,
    courses: [
      { id:'c1', name:'Humanities',           instructor:'', days:'Mon / Wed', time:'', room:'', credits:3, gradeTarget:90, color:'#6366f1', notes:'', assignments:[] },
      { id:'c2', name:'Written Communication', instructor:'', days:'Mon / Wed', time:'', room:'', credits:3, gradeTarget:90, color:'#14b8a6', notes:'', assignments:[] },
    ],
  },
  {
    id: 't2', name: 'Fall 2026', active: false,
    courses: [
      { id:'c3', name:'Anatomy & Physiology', instructor:'', days:'', time:'', room:'', credits:4, gradeTarget:85, color:'#f59e0b', notes:'', assignments:[] },
      { id:'c4', name:'A&P Lab',              instructor:'', days:'', time:'', room:'', credits:1, gradeTarget:85, color:'#f59e0b', notes:'', assignments:[] },
      { id:'c5', name:'American Government',  instructor:'', days:'', time:'', room:'', credits:3, gradeTarget:85, color:'#f43f5e', notes:'', assignments:[] },
    ],
  },
]

export function loadTerms()      { return load(KEY, DEFAULT_TERMS) }
export function saveTerms(terms) { save(KEY, terms) }

export function getAllCourseNames() {
  return loadTerms().flatMap(t => t.courses.map(c => c.name))
}

export function getActiveTermCourses() {
  const terms  = loadTerms()
  const active = terms.find(t => t.active) || terms[0]
  return active ? active.courses : []
}

// ── Site-wide course color map ──────────────────────────────────
// Returns { courseName: hexColor, OTHER: 'var(--green)' }
// Reading directly from localStorage so it's always fresh without
// needing React state — call this inside render functions.
export function getCourseColorMap() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const map    = { OTHER: '#4ade80' }
    terms.forEach(t => t.courses.forEach(c => { map[c.name] = c.color }))
    return map
  } catch(e) {
    return { OTHER: '#4ade80' }
  }
}

export function uid() { return Math.random().toString(36).slice(2, 9) }

export const ASSIGNMENT_TYPES = ['Essay','Discussion Post','Reading Response','Quiz','Exam','Lab Report','Other']
export const PRIORITY_OPTS    = ['none','low','medium','high','urgent']
export const STATUS_OPTS      = ['To do','In progress','Done']

// ── Sort assignments: due date first, priority as tiebreaker ────
// This is THE canonical sort — use everywhere for consistency.
export function sortAssignments(assignments) {
  return [...assignments].sort((a, b) => {
    const aDone = a.status === 'Done', bDone = b.status === 'Done'
    if (aDone && !bDone) return 1
    if (!aDone && bDone) return -1
    // Primary: due date (soonest first)
    if (!a.due && !b.due) return 0
    if (!a.due) return 1
    if (!b.due) return -1
    const dateDiff = new Date(a.due) - new Date(b.due)
    if (dateDiff !== 0) return dateDiff
    // Tiebreaker: priority (only when same due date)
    const pw = { urgent:4, high:3, medium:2, low:1, none:0 }
    return (pw[b.priority||'none']||0) - (pw[a.priority||'none']||0)
  })
}
