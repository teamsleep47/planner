import { useState, useEffect } from 'react'
import { formatRelativeDue } from '../utils/timeFormat.js'

function getNext3() {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (!active) return []
    return active.courses
      .flatMap(c => c.assignments.map(a => ({ ...a, courseName: c.name, courseColor: c.color })))
      .filter(a => a.status !== 'Done' && a.due)
      .sort((a, b) => {
        const pw = { urgent:4, high:3, medium:2, low:1, none:0 }
        const pd = (pw[b.priority||'none']||0) - (pw[a.priority||'none']||0)
        return pd !== 0 ? pd : new Date(a.due) - new Date(b.due)
      })
      .slice(0, 3)
  } catch(e) { return [] }
}

export default function SidebarMiniAssignments() {
  const [items, setItems] = useState(() => getNext3())

  useEffect(() => {
    const handler = () => setItems(getNext3())
    window.addEventListener('drive-loaded', handler)
    return () => window.removeEventListener('drive-loaded', handler)
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{ margin:'6px 8px 0', padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>
        Upcoming
      </div>

      {items.map((a, i) => {
        const due = formatRelativeDue(a.due, a.dueTime || '')
        return (
          <div key={a.id} style={{
            display:'flex', alignItems:'flex-start', gap:6,
            padding:'4px 0',
            borderBottom: i < items.length-1 ? '1px solid var(--glass-border)' : 'none',
            marginBottom: i < items.length-1 ? 4 : 0,
          }}>
            <div style={{ width:3, minHeight:32, borderRadius:2, background: a.courseColor||'var(--accent)', flexShrink:0, marginTop:2 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</div>
              <div style={{ fontSize:10, color: due?.color||'var(--text-3)', fontWeight:500 }}>{due?.label||a.due}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
