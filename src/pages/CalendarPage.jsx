import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatRelativeDue } from '../utils/timeFormat.js'

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAYS_S    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const PRIORITY_BADGE = {
  urgent: { label:'🔴 Urgent', color:'#ef4444' },
  high:   { label:'🟠 High',   color:'#f97316' },
  medium: { label:'🟡 Medium', color:'#f59e0b' },
  low:    { label:'🟢 Low',    color:'#22c55e' },
  none:   { label:'',          color:null       },
}

// ── Read all assignments from termData ──────────────────────────
function getAllAssignments() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (!active) return []
    return active.courses.flatMap(c =>
      c.assignments.map(a => ({
        ...a,
        courseName: c.name,
        courseColor: c.color,
        courseId: c.id,
      }))
    )
  } catch(e) { return [] }
}

// ── Popup component ─────────────────────────────────────────────
function AssignmentPopup({ assignment, anchor, onClose, onJump }) {
  const popupRef = useRef(null)
  const due      = formatRelativeDue(assignment.due, assignment.dueTime)
  const start    = assignment.startDate
    ? formatRelativeDue(assignment.startDate, '')
    : null
  const badge    = PRIORITY_BADGE[assignment.priority || 'none']

  useEffect(() => {
    const handler = e => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Position popup: try to stay inside viewport
  const style = {
    position: 'fixed',
    zIndex: 1000,
    top: Math.min(anchor.y + 8, window.innerHeight - 280),
    left: Math.min(Math.max(anchor.x - 140, 8), window.innerWidth - 320),
    width: 300,
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={onClose}/>
      <div ref={popupRef} className="card" style={{
        ...style,
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        border: `2px solid ${assignment.courseColor}`,
      }}>
        {/* Header bar */}
        <div style={{
          background: `${assignment.courseColor}22`,
          borderBottom: `1px solid ${assignment.courseColor}44`,
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: assignment.courseColor,
            boxShadow: `0 0 8px ${assignment.courseColor}`,
            flexShrink: 0, marginTop: 3,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginBottom: 3 }}>
              {assignment.title}
            </div>
            <div style={{ fontSize: 11, color: assignment.courseColor, fontWeight: 600 }}>
              {assignment.courseName}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:2, flexShrink:0 }}>
            <X size={14}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          {/* Due */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-3)', width:44 }}>Due</span>
            <span style={{ fontSize:13, fontWeight:700, color: due?.color || 'var(--text-2)' }}>
              {due?.label || assignment.due || 'No due date'}
            </span>
          </div>

          {/* Start date */}
          {assignment.startDate && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-3)', width:44 }}>Start</span>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>
                {new Date(assignment.startDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
              </span>
            </div>
          )}

          {/* Type */}
          {assignment.type && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-3)', width:44 }}>Type</span>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>{assignment.type}</span>
            </div>
          )}

          {/* Priority */}
          {badge.label && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-3)', width:44 }}>Priority</span>
              <span style={{ fontSize:12, color: badge.color, fontWeight:600 }}>{badge.label}</span>
            </div>
          )}

          {/* Status */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-3)', width:44 }}>Status</span>
            <span style={{
              fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
              background: assignment.status==='Done'?'var(--green-dim)':assignment.status==='In progress'?'var(--amber-dim)':'var(--glass-bg-2)',
              color: assignment.status==='Done'?'var(--green)':assignment.status==='In progress'?'var(--amber)':'var(--text-3)',
            }}>
              {assignment.status || 'To do'}
            </span>
          </div>

          {/* Notes preview */}
          {assignment.notes && (
            <div style={{
              fontSize: 11, color:'var(--text-3)', lineHeight:1.5,
              background:'var(--glass-bg)', borderRadius:6, padding:'7px 9px',
              maxHeight: 60, overflow:'hidden',
              WebkitMaskImage:'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}>
              {assignment.notes}
            </div>
          )}
        </div>

        {/* Jump button */}
        <div style={{ padding:'0 14px 14px' }}>
          <button onClick={onJump} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', gap:6, fontSize:13 }}>
            <ExternalLink size={13}/> Open in Assignments
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Calendar ───────────────────────────────────────────────
export default function CalendarPage({ onDataChange }) {
  const navigate    = useNavigate()
  const [anchor,    setAnchor]    = useState(new Date())
  const [popup,     setPopup]     = useState(null)   // { assignment, x, y }
  const assignments = getAllAssignments()

  const today    = new Date().toISOString().slice(0, 10)
  const year     = anchor.getFullYear()
  const month    = anchor.getMonth()

  const prev  = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n })
  const next  = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n })
  const goToday = () => setAnchor(new Date())

  // Build calendar grid
  const firstDay   = new Date(year, month, 1)
  const lastDay    = new Date(year, month + 1, 0)
  const startPad   = firstDay.getDay()
  const cells      = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  // Index assignments by date
  const byDue   = {}   // dateStr -> [assignment]
  const byStart = {}   // dateStr -> [assignment]
  assignments.forEach(a => {
    if (a.due) {
      if (!byDue[a.due]) byDue[a.due] = []
      byDue[a.due].push(a)
    }
    if (a.startDate && a.startDate !== a.due) {
      if (!byStart[a.startDate]) byStart[a.startDate] = []
      byStart[a.startDate].push(a)
    }
  })

  // Determine if a date is inside a start→due range (for bar rendering)
  const inRangeAssignments = (dateStr) => {
    return assignments.filter(a => {
      if (!a.startDate || !a.due) return false
      return dateStr > a.startDate && dateStr < a.due
    })
  }

  const handleDotClick = (e, assignment) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopup({ assignment, x: rect.left + rect.width / 2, y: rect.bottom })
  }

  const handleJump = (assignment) => {
    sessionStorage.setItem('planner_cal_jump', JSON.stringify({
      courseId: assignment.courseId,
      assignId: assignment.id,
    }))
    setPopup(null)
    navigate('/courses')
  }

  const cellH = 110

  return (
    <>
      <div className="page-header" style={{ flexWrap:'wrap', gap:10 }}>
        <div>
          <div className="page-title">Calendar</div>
          <div className="page-subtitle">{MONTHS[month]} {year}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button className="btn btn-ghost" onClick={goToday} style={{ fontSize:12 }}>Today</button>
          <button className="btn-icon" onClick={prev} style={{ padding:7 }}><ChevronLeft size={14}/></button>
          <button className="btn-icon" onClick={next} style={{ padding:7 }}><ChevronRight size={14}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding:'0 32px 10px', display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)' }}>
          <div style={{ width:24, height:8, borderRadius:4, background:'var(--accent)', opacity:.85 }}/>
          Due date
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)' }}>
          <div style={{ width:24, height:5, borderRadius:4, background:'var(--accent)', opacity:.25 }}/>
          Start → due range
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', opacity:.5 }}/>
          Start date
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ margin:'0 24px 24px', background:'var(--glass-bg)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>

        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'var(--glass-bg-2)', borderBottom:'1px solid var(--glass-border)' }}>
          {DAYS_S.map(d => (
            <div key={d} style={{ padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'.05em' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((day, i) => {
            if (!day) return (
              <div key={`pad-${i}`} style={{ minHeight: cellH, borderRight:'1px solid var(--glass-border)', borderBottom:'1px solid var(--glass-border)', background:'var(--glass-bg)', opacity:.4 }}/>
            )

            const ds       = day.toISOString().slice(0, 10)
            const isToday  = ds === today
            const dueDates = byDue[ds]    || []
            const startDts = byStart[ds]  || []
            const inRange  = inRangeAssignments(ds)
            const isPast   = ds < today

            return (
              <div key={ds} style={{
                minHeight: cellH,
                borderRight: '1px solid var(--glass-border)',
                borderBottom: '1px solid var(--glass-border)',
                padding: '6px 5px 5px',
                position: 'relative',
                background: isToday ? 'var(--accent-dim)' : isPast ? 'rgba(0,0,0,0.08)' : 'transparent',
                transition: 'background .15s',
              }}>
                {/* Day number */}
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'var(--accent)' : isPast ? 'var(--text-3)' : 'var(--text-2)',
                  marginBottom: 4, lineHeight: 1,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {isToday && (
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 6px var(--accent)' }}/>
                  )}
                  {day.getDate()}
                </div>

                {/* Range bars — drawn behind pills */}
                {inRange.map((a, ri) => (
                  <div key={`range-${a.id}-${ri}`} style={{
                    height: 4, borderRadius: 2, marginBottom: 2,
                    background: a.courseColor,
                    opacity: 0.22,
                  }}/>
                ))}

                {/* Start date markers */}
                {startDts.slice(0, 2).map((a, si) => (
                  <button key={`start-${a.id}-${si}`}
                    onClick={e => handleDotClick(e, a)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      width: '100%', border: 'none', cursor: 'pointer', padding: '1px 3px',
                      background: `${a.courseColor}18`, borderRadius: 3, marginBottom: 2,
                      borderLeft: `2px solid ${a.courseColor}66`,
                    }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:a.courseColor, opacity:.5, flexShrink:0 }}/>
                    <span style={{ fontSize:9, color:a.courseColor, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.8 }}>
                      ▶ {a.title}
                    </span>
                  </button>
                ))}

                {/* Due date pills */}
                {dueDates.slice(0, 3).map((a, di) => {
                  const badge = PRIORITY_BADGE[a.priority || 'none']
                  const isDone = a.status === 'Done'
                  return (
                    <button key={`due-${a.id}-${di}`}
                      onClick={e => handleDotClick(e, a)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        width: '100%', border: 'none', cursor: 'pointer',
                        padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                        background: isDone ? `${a.courseColor}18` : `${a.courseColor}33`,
                        borderLeft: `3px solid ${isDone ? a.courseColor + '44' : a.courseColor}`,
                        opacity: isDone ? 0.55 : 1,
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { if(!isDone) e.currentTarget.style.background=`${a.courseColor}55` }}
                      onMouseLeave={e => { e.currentTarget.style.background = isDone ? `${a.courseColor}18` : `${a.courseColor}33` }}
                    >
                      <div style={{ width:6, height:6, borderRadius:'50%', background:a.courseColor, flexShrink:0, boxShadow:`0 0 4px ${a.courseColor}` }}/>
                      <span style={{ fontSize:9, fontWeight:700, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                        {a.title}
                      </span>
                      {badge.color && !isDone && (
                        <div style={{ width:5, height:5, borderRadius:'50%', background:badge.color, flexShrink:0 }}/>
                      )}
                      {isDone && <span style={{ fontSize:8, color:'var(--green)', flexShrink:0 }}>✓</span>}
                    </button>
                  )
                })}

                {/* Overflow count */}
                {(dueDates.length + startDts.length) > 3 && (
                  <div style={{ fontSize:9, color:'var(--text-3)', paddingLeft:4, marginTop:1 }}>
                    +{(dueDates.length + startDts.length) - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Popup */}
      {popup && (
        <AssignmentPopup
          assignment={popup.assignment}
          anchor={{ x: popup.x, y: popup.y }}
          onClose={() => setPopup(null)}
          onJump={() => handleJump(popup.assignment)}
        />
      )}

      {/* Mobile: responsive padding */}
      <style>{`
        @media (max-width: 768px) {
          .page-body { padding: 0 !important; }
        }
      `}</style>
    </>
  )
}
