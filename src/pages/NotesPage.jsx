import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { getActiveTermCourses, loadTerms } from '../utils/termData.js'
import Tooltip from '../components/Tooltip.jsx'

// Build course list dynamically from termData
function buildCourseList() {
  const terms = loadTerms()
  const list = []
  terms.forEach(term => {
    term.courses.forEach(c => {
      list.push({ id: c.id, label: c.name, sem: term.name, color: c.color })
    })
  })
  return list
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
}

export default function NotesPage({ onDataChange }) {
  const [courses,   setCourses]  = useState(() => buildCourseList())
  const [active,    setActive]   = useState(() => buildCourseList()[0]?.id || '')
  // notes structure: { [courseId]: [ { id, date, label, text } ] }
  const [notes,     setNotes]    = useState(() => load('full_course_notes_v2', {}))
  const [saved,     setSaved]    = useState(false)
  const [editDayId, setEditDayId]= useState(null)  // day entry being edited
  const [editLabel, setEditLabel]= useState('')
  const [openDays,  setOpenDays] = useState({})    // dayId -> bool (textarea expanded)

  useEffect(() => {
    save('full_course_notes_v2', notes)
    onDataChange?.()
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [notes])

  const course = courses.find(c => c.id === active)

  // Get days for active course, newest first
  const courseDays = (notes[active] || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date))

  const addDay = () => {
    const today = new Date().toISOString().slice(0,10)
    const label = todayLabel()
    const newEntry = { id: Math.random().toString(36).slice(2,9), date: today, label, text: '' }
    setNotes(n => ({ ...n, [active]: [newEntry, ...(n[active]||[])] }))
    // Auto-open the new entry
    setOpenDays(o => ({ ...o, [newEntry.id]: true }))
    setEditDayId(newEntry.id)
    setEditLabel(label)
  }

  const updateDayText = (dayId, text) => {
    setNotes(n => ({
      ...n,
      [active]: (n[active]||[]).map(d => d.id===dayId ? {...d, text} : d)
    }))
  }

  const saveDayLabel = (dayId) => {
    setNotes(n => ({
      ...n,
      [active]: (n[active]||[]).map(d => d.id===dayId ? {...d, label:editLabel} : d)
    }))
    setEditDayId(null)
  }

  const deleteDay = (dayId) => {
    setNotes(n => ({ ...n, [active]: (n[active]||[]).filter(d => d.id!==dayId) }))
  }

  const toggleDay = (dayId) => {
    setOpenDays(o => ({ ...o, [dayId]: !o[dayId] }))
  }

  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }

  // Group courses by term
  const terms = loadTerms()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Course notes</div>
          <div className="page-subtitle">Day-by-day notes per course — saved automatically</div>
        </div>
        <span style={{ fontSize:11, color:saved?'var(--green)':'transparent', fontWeight:600, transition:'color .3s' }}>✓ Saved</span>
      </div>

      <div className="page-body" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>

        {/* Course selector */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, width:190, flexShrink:0 }}>
          {terms.map(term => (
            <div key={term.id}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', padding:'10px 10px 5px' }}>
                {term.name}
              </div>
              {term.courses.map(c => {
                const dayCount = (notes[c.id]||[]).length
                return (
                  <Tooltip key={c.id} text={`Open ${c.name} notes`} position="right">
                    <button onClick={()=>setActive(c.id)} style={{
                      width:'100%', textAlign:'left', padding:'9px 12px',
                      borderRadius:'var(--radius-md)', border:'none',
                      background: active===c.id ? 'var(--accent-dim)' : 'transparent',
                      color:      active===c.id ? 'var(--accent)' : 'var(--text-2)',
                      fontWeight: active===c.id ? 700 : 500, fontSize:13,
                      cursor:'pointer', transition:'all .15s',
                      borderLeft: active===c.id ? `3px solid ${c.color}` : '3px solid transparent',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                    }}>
                      <span>{c.name}</span>
                      {dayCount > 0 && (
                        <span style={{fontSize:10, color:'var(--text-3)', marginLeft:6, fontWeight:400}}>
                          {dayCount} {dayCount===1?'day':'days'}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>

        {/* Notes editor area */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Header + Add Day */}
          <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {course && <>
                <div style={{ width:10, height:10, borderRadius:'50%', background:course.color, boxShadow:`0 0 8px ${course.color}` }}/>
                <span style={{ fontWeight:700, fontSize:16 }}>{course.label}</span>
              </>}
            </div>
            <Tooltip text="Add notes for today">
              <button className="btn btn-primary" onClick={addDay} style={{ gap:6, fontSize:13 }}>
                <Plus size={14}/> Add day
              </button>
            </Tooltip>
          </div>

          {courseDays.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-3)' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📓</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>No notes yet</div>
              <div style={{ fontSize:13 }}>Click "Add day" to create your first entry for {course?.label}.</div>
            </div>
          )}

          {courseDays.map(day => {
            const isOpen   = !!openDays[day.id]
            const isEditing = editDayId === day.id
            const lineCount = (day.text||'').split('\n').filter(Boolean).length

            return (
              <div key={day.id} className="card" style={{ padding:0, overflow:'hidden' }}>

                {/* Day header — click to expand */}
                <div style={{
                  display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
                  cursor:'pointer', borderBottom: isOpen ? '1px solid var(--glass-border)' : 'none',
                }} onClick={()=>toggleDay(day.id)}>

                  {isEditing ? (
                    <div style={{flex:1, display:'flex', gap:6}} onClick={e=>e.stopPropagation()}>
                      <input
                        style={{...inputStyle, flex:1, fontSize:13, padding:'5px 9px'}}
                        value={editLabel}
                        onChange={e=>setEditLabel(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter') saveDayLabel(day.id); if(e.key==='Escape') setEditDayId(null) }}
                        autoFocus
                      />
                      <button className="btn-icon" style={{padding:5}} onClick={()=>saveDayLabel(day.id)}><Check size={12}/></button>
                      <button className="btn-icon" style={{padding:5}} onClick={()=>setEditDayId(null)}><X size={12}/></button>
                    </div>
                  ) : (
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{day.label}</div>
                      {!isOpen && lineCount > 0 && (
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{lineCount} line{lineCount!==1?'s':''}</div>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div style={{ display:'flex', gap:3, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                      <Tooltip text="Rename this day entry">
                        <button className="btn-icon" style={{padding:4}} onClick={()=>{ setEditDayId(day.id); setEditLabel(day.label) }}>
                          <Edit2 size={11}/>
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete this day">
                        <button className="btn-icon" style={{padding:4, color:'var(--coral)'}} onClick={()=>deleteDay(day.id)}>
                          <Trash2 size={11}/>
                        </button>
                      </Tooltip>
                      {isOpen ? <ChevronUp size={13} style={{color:'var(--text-3)'}}/> : <ChevronDown size={13} style={{color:'var(--text-3)'}}/>}
                    </div>
                  )}
                </div>

                {/* Textarea — only shown when open */}
                {isOpen && (
                  <textarea
                    className="inline-input"
                    value={day.text||''}
                    onChange={e=>updateDayText(day.id, e.target.value)}
                    placeholder={`Notes for ${day.label}…\n\nTip: Use bullets, key concepts, or Markdown-style formatting.`}
                    autoFocus
                    style={{
                      display:'block', width:'100%', minHeight:220, resize:'vertical',
                      fontSize:13, lineHeight:1.7, fontFamily:'var(--font-mono)',
                      border:'none', borderRadius:0, background:'transparent',
                      padding:'14px 16px',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
