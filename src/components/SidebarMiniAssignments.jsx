import { useState, useEffect } from 'react'
import { formatRelativeDue } from '../utils/timeFormat.js'

function getItems() {
  const today = new Date().toISOString().slice(0,10)

  // Assignments
  let assignments = []
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (active) {
      assignments = active.courses
        .flatMap(c => c.assignments.map(a => ({ ...a, courseName:c.name, courseColor:c.color, _type:'assignment' })))
        .filter(a => a.status !== 'Done' && a.due)
        .sort((a, b) => {
          const pw = { urgent:4, high:3, medium:2, low:1, none:0 }
          const pd = (pw[b.priority||'none']||0) - (pw[a.priority||'none']||0)
          return pd !== 0 ? pd : new Date(a.due) - new Date(b.due)
        })
        .slice(0, 3)
    }
  } catch(e) {}

  // Plans
  let plans = []
  try {
    plans = JSON.parse(localStorage.getItem('planner_v1_calendar_plans') || '[]')
      .filter(p => p.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 2)
      .map(p => ({ ...p, _type:'plan' }))
  } catch(e) {}

  // Merge: assignments first, then plans, max 4 total
  return [...assignments.slice(0,3), ...plans].slice(0,4)
}

export default function SidebarMiniAssignments() {
  const [items, setItems] = useState(() => getItems())

  useEffect(() => {
    const handler = () => setItems(getItems())
    window.addEventListener('drive-loaded', handler)
    return () => window.removeEventListener('drive-loaded', handler)
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{ margin:'6px 8px 0', padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>
        Upcoming
      </div>

      {items.map((item, i) => {
        const isPlan = item._type === 'plan'
        const due    = !isPlan ? formatRelativeDue(item.due, item.dueTime || '') : null
        const planDate = isPlan
          ? new Date(item.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
          : null
        const color  = item.courseColor || item.color || 'var(--accent)'

        return (
          <div key={item.id||i} style={{
            display:'flex', alignItems:'flex-start', gap:6,
            padding:'4px 0',
            borderBottom: i < items.length-1 ? '1px solid var(--glass-border)' : 'none',
            marginBottom: i < items.length-1 ? 4 : 0,
          }}>
            {isPlan
              ? <span style={{fontSize:10,flexShrink:0,marginTop:2}}>📅</span>
              : <div style={{ width:3, minHeight:32, borderRadius:2, background:color, flexShrink:0, marginTop:2 }}/>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {item.title}
              </div>
              <div style={{ fontSize:10, color: due?.color || (isPlan ? 'var(--amber)' : 'var(--text-3)'), fontWeight:500 }}>
                {due?.label || planDate || item.due}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
