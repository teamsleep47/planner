// useCanvas.js — Canvas LMS integration
// Reads token from localStorage only, never exposed externally

const LS_TOKEN   = 'canvas_token_v1'
const LS_URL     = 'canvas_url_v1'
const LS_ICAL    = 'canvas_ical_v1'
const LS_WARNED  = 'canvas_warned_v1'
const BASE_URL   = () => localStorage.getItem(LS_URL) || 'https://scf.instructure.com'

export function getCanvasToken()  { try { return localStorage.getItem(LS_TOKEN) || '' } catch(e) { return '' } }
export function getCanvasIcal()   { try { return localStorage.getItem(LS_ICAL)  || '' } catch(e) { return '' } }
export function getCanvasUrl()    { try { return localStorage.getItem(LS_URL)   || 'https://scf.instructure.com' } catch(e) { return 'https://scf.instructure.com' } }
export function hasWarned()       { try { return !!localStorage.getItem(LS_WARNED) } catch(e) { return false } }

export function saveCanvasToken(t)  { try { localStorage.setItem(LS_TOKEN, t) }   catch(e) {} }
export function saveCanvasUrl(u)    { try { localStorage.setItem(LS_URL, u) }     catch(e) {} }
export function saveCanvasIcal(u)   { try { localStorage.setItem(LS_ICAL, u) }    catch(e) {} }
export function setWarned()         { try { localStorage.setItem(LS_WARNED, '1') } catch(e) {} }
export function clearCanvasToken()  { try { localStorage.removeItem(LS_TOKEN) }    catch(e) {} }

// Generic Canvas API fetch
async function canvasFetch(path) {
  const token = getCanvasToken()
  const base  = getCanvasUrl()
  if (!token) throw new Error('NO_TOKEN')
  const res = await fetch(`${base}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  })
  if (res.status === 401) throw new Error('INVALID_TOKEN')
  if (res.status === 403) throw new Error('FORBIDDEN')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json()
}

// Test CORS + token validity
export async function testCanvasConnection() {
  try {
    const data = await canvasFetch('/users/self')
    return { ok: true, user: data }
  } catch(e) {
    if (e.message === 'NO_TOKEN')       return { ok: false, error: 'no_token' }
    if (e.message === 'INVALID_TOKEN')  return { ok: false, error: 'invalid_token' }
    if (e.name === 'TypeError')         return { ok: false, error: 'cors' }
    return { ok: false, error: e.message }
  }
}

// Fetch active courses
export async function fetchCourses() {
  const data = await canvasFetch('/courses?enrollment_state=active&per_page=20')
  return Array.isArray(data) ? data : []
}

// Fetch grades for a course
export async function fetchGrades(courseId) {
  const data = await canvasFetch(`/courses/${courseId}/students/submissions?student_ids[]=self&per_page=50`)
  return Array.isArray(data) ? data : []
}

// Fetch enrollment (has current_grade)
export async function fetchEnrollment(courseId) {
  const data = await canvasFetch(`/courses/${courseId}/enrollments?user_id=self`)
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

// Fetch modules for a course
export async function fetchModules(courseId) {
  const data = await canvasFetch(`/courses/${courseId}/modules?per_page=20`)
  return Array.isArray(data) ? data : []
}

// Fetch files for a course
export async function fetchFiles(courseId) {
  const data = await canvasFetch(`/courses/${courseId}/files?per_page=20&sort=updated_at&order=desc`)
  return Array.isArray(data) ? data : []
}

// Parse iCal (.ics) text into assignment objects
export function parseIcal(icsText) {
  const events = []
  const blocks = icsText.split('BEGIN:VEVENT')
  blocks.shift() // remove header
  for (const block of blocks) {
    const get = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:(.+)`))
      return m ? m[1].trim().replace(/\\n/g,' ').replace(/\\,/g,',') : ''
    }
    const summary  = get('SUMMARY')
    const dtstart  = get('DTSTART')
    const dtdue    = get('DUE') || get('DTEND') || dtstart
    const desc     = get('DESCRIPTION')
    const url      = get('URL')
    if (!summary || !dtdue) continue
    // Parse date
    let due = ''
    try {
      const raw = dtdue.replace(/T\d{6}Z?$/, '')
      due = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
    } catch(e) { continue }
    // Guess type
    const lower = summary.toLowerCase()
    const type  = lower.includes('quiz') ? 'Quiz'
                : lower.includes('exam') ? 'Exam'
                : lower.includes('lab')  ? 'Lab Report'
                : lower.includes('discussion') ? 'Discussion Post'
                : lower.includes('essay') || lower.includes('paper') ? 'Essay'
                : 'Other'
    events.push({ summary, due, type, url, desc: desc.slice(0,100) })
  }
  return events
}
