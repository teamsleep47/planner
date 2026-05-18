// termData.js — shared term/course/assignment data layer
// All pages read courses from here for sync

import { load, save } from './storage.js'

const KEY = 'terms_v1'

export const DEFAULT_TERMS = [
  {
    id: 't1',
    name: 'Summer 2026',
    active: true,
    courses: [
      {
        id: 'c1',
        name: 'Humanities',
        instructor: '',
        days: 'Mon / Wed',
        time: '',
        room: '',
        credits: 3,
        gradeTarget: 90,
        color: '#6366f1',
        notes: '',
        assignments: [],
      },
      {
        id: 'c2',
        name: 'Written Communication',
        instructor: '',
        days: 'Mon / Wed',
        time: '',
        room: '',
        credits: 3,
        gradeTarget: 90,
        color: '#14b8a6',
        notes: '',
        assignments: [],
      },
    ],
  },
  {
    id: 't2',
    name: 'Fall 2026',
    active: false,
    courses: [
      { id:'c3', name:'Anatomy & Physiology', instructor:'', days:'', time:'', room:'', credits:4, gradeTarget:85, color:'#f59e0b', notes:'', assignments:[] },
      { id:'c4', name:'A&P Lab',              instructor:'', days:'', time:'', room:'', credits:1, gradeTarget:85, color:'#f59e0b', notes:'', assignments:[] },
      { id:'c5', name:'American Government',  instructor:'', days:'', time:'', room:'', credits:3, gradeTarget:85, color:'#f43f5e', notes:'', assignments:[] },
    ],
  },
]

export function loadTerms()       { return load(KEY, DEFAULT_TERMS) }
export function saveTerms(terms)  { save(KEY, terms) }

// Get flat list of all course names across all terms (for dropdowns)
export function getAllCourseNames() {
  return loadTerms().flatMap(t => t.courses.map(c => c.name))
}

// Get courses for active term only
export function getActiveTermCourses() {
  const terms = loadTerms()
  const active = terms.find(t => t.active) || terms[0]
  return active ? active.courses : []
}

// Generate a simple unique ID
export function uid() { return Math.random().toString(36).slice(2, 9) }

const ASSIGNMENT_TYPES = ['Essay','Discussion Post','Reading Response','Quiz','Exam','Lab Report','Other']
const PRIORITY_OPTS    = ['none','low','medium','high','urgent']
const STATUS_OPTS      = ['To do','In progress','Done']

export { ASSIGNMENT_TYPES, PRIORITY_OPTS, STATUS_OPTS }
