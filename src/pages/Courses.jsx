import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const SEMESTERS = {
  summer: { label:'Summer 2026', color:'var(--amber)', courses:['Humanities','Written Communication'] },
  fall:   { label:'Fall 2026',   color:'var(--teal)',  courses:['Anatomy & Physiology','A&P Lab','American Government'] },
}
const TYPES    = ['Essay','Discussion Post','Reading Response','Quiz','Exam','Lab Report','Other']
const STATUS   = [
  { key:'To do',       color:'var(--text-3)',  bg:'var(--glass-bg-2)', dot:'var(--text-3)'  },
  { key:'In progress', color:'var(--amber)',   bg:'var(--amber-dim)',  dot:'var(--amber)'   },
  { key:'Done',        color:'var(--green)',   bg:'var(--green-dim)',  dot:'var(--green)'   },
]
const PRIORITY = [
  { key:'none',   label:'—',       color:'var(--text-3)',  bg:'var(--glass-bg-2)' },
  { key:'low',    label:'Low',     color:'var(--green)',   bg:'var(--green-dim)'  },
  { key:'medium', label:'Medium',  color:'var(--amber)',   bg:'var(--amber-dim)'  },
  { key:'high',   label:'High',    color:'var(--coral)',   bg:'var(--coral-dim)'  },
  { key:'urgent', label:'Urgent',  color:'#ef4444',        bg:'rgba(239,68,68,.15)' },
]

const DEFAULT_ASSIGNMENTS = [
  { id:1, title:'Discussion Post Week 1', course:'Humanities',           type:'Discussion Post', due:'2026-05-26', status:'To do', priority:'none', notes:'' },
  { id:2, title:'Essay Draft 1',          course:'Written Communication', type:'Essay',           due:'2026-05-28', status:'To do', priority:'none', notes:'' },
]

function daysUntil(due) {
  const d = Math.ceil((new Date(due) - new Date()) / 86400000)
  if (d < 0)   return { label:'Overdue',   color:'var(--coral)' }
  if (d === 0) return { label:'Due today',  color:'var(--coral)' }
  if (d === 1) return { label:'Tomorrow',   color:'var(--amber)' }
  if (d <= 7)  return { label:`${d}d left`, color:'var(--amber)' }
  return               { label:`${d}d left`, color:'var(--text-3)' }
}

export default function Courses({ onDataChange }) {
  const [tab,         setTab]         = useState('summer')
  const [assignments, setAssignments] = useState(() => load('assignments', DEFAULT_ASSIGNMENTS))
  const [courseNotes, setCourseNotes] = useState(() => load('course_notes', {}))
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState({ title:'', course:SEMESTERS.summer.courses[0], type:TYPES[0], due:'', status:'To do', priority:'none', notes:'' })
  const [expandId,    setExpandId]    = useState(null)

  useEffect(() => { save('assignments', assignments); onDataChange?.() }, [assignments])
  useEffect(() => { save('course_notes', courseNotes); onDataChange?.() }, [courseNotes])

  const sem      = SEMESTERS[tab]
  const filtered = assignments.filter(a=>sem.courses.includes(a.course)).sort((a,b)=>{
    // Urgent/high first, then by due date
    const pw = { urgent:4, high:3, medium:2, low:1, none:0 }
    const pd = (pw[b.priority]||0) - (pw[a.priority]||0)
    if (pd !== 0) return pd
    return new Date(a.due) - new Date(b.due)
  })

  const addAssignment   = () => { if (!form.title||!form.due) return; setAssignments(as=>[...as,{...form,id:Date.now()}]); setForm({title:'',course:sem.courses[0],type:TYPES[0],due:'',status:'To do',priority:'none',notes:''}); setShowForm(false) }
  const setStatus       = (id,status)   => setAssignments(as=>as.map(a=>a.id===id?{...a,status}:a))
  const setPriority     = (id,priority) => setAssignments(as=>as.map(a=>a.id===id?{...a,priority}:a))
  const updateNote      = (id,notes)    => setAssignments(as=>as.map(a=>a.id===id?{...a,notes}:a))
  const deleteAssignment= id            => setAssignments(as=>as.filter(a=>a.id!==id))
  const saveCourseNote  = (course,text) => setCourseNotes(n=>({...n,[course]:text}))

  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Assignments</div><div className="page-subtitle">Track essays, posts, and exams by semester</div></div>
        <Tooltip text="Add a new assignment">
          <button className="btn btn-primary" onClick={()=>setShowForm(s=>!s)}><Plus size={14}/> Add assignment</button>
        </Tooltip>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* Tabs */}
        <div style={{display:'flex',gap:8,background:'var(--glass-bg-2)',padding:4,borderRadius:'var(--radius-md)',width:'fit-content',border:'1px solid var(--glass-border)'}}>
          {Object.entries(SEMESTERS).map(([key,s])=>(
            <button key={key} onClick={()=>setTab(key)} style={{padding:'7px 20px',borderRadius:'var(--radius-sm)',border:'none',background:tab===key?s.color:'transparent',color:tab===key?(key==='summer'?'#1a1a2e':'white'):'var(--text-2)',fontWeight:600,fontSize:13,cursor:'pointer',transition:'all .15s'}}>{s.label}</button>
          ))}
        </div>

        {/* Course notes */}
        <div className="grid-2" style={{gap:12}}>
          {sem.courses.map(course=>(
            <div key={course} className="card" style={{padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:sem.color}}>{course}</span>
                <span style={{fontSize:10,color:'var(--text-3)'}}>📝 Quick notes</span>
              </div>
              <textarea className="inline-input" rows={3} placeholder={`Quick notes for ${course}…`} value={courseNotes[course]||''} onChange={e=>saveCourseNote(course,e.target.value)} style={{fontSize:12,resize:'none'}}/>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card" style={{borderColor:sem.color}}>
            <div className="card-title">New assignment — {sem.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <input placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={{...inputStyle,gridColumn:'1/-1'}}/>
              <select value={form.course}   onChange={e=>setForm(f=>({...f,course:e.target.value}))}   style={inputStyle}>{sem.courses.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={form.type}     onChange={e=>setForm(f=>({...f,type:e.target.value}))}     style={inputStyle}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
              <input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))} style={inputStyle}/>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={inputStyle}>
                {PRIORITY.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{...inputStyle,gridColumn:'1/-1'}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" onClick={addAssignment}>Save</button>
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid-3">
          {STATUS.map(s=>(
            <div key={s.key} className="stat-card">
              <div className="stat-label">{s.key}</div>
              <div className="stat-value" style={{color:s.color}}>{filtered.filter(a=>a.status===s.key).length}</div>
              <div className="stat-sub">assignments</div>
            </div>
          ))}
        </div>

        {/* Assignment list */}
        {filtered.length===0 ? (
          <div className="card" style={{textAlign:'center',padding:'40px 20px',color:'var(--text-3)'}}>No assignments yet — add one above.</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filtered.map(a=>{
              const due    = daysUntil(a.due)
              const pri    = PRIORITY.find(p=>p.key===(a.priority||'none'))
              const isOpen = expandId===a.id
              return (
                <div key={a.id} className="card" style={{padding:0,overflow:'hidden',borderLeft:`3px solid ${sem.color}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                        <span style={{fontWeight:600,fontSize:14}}>{a.title}</span>
                        <span style={{fontSize:11,padding:'2px 7px',borderRadius:20,background:'var(--glass-bg-2)',color:'var(--text-3)',border:'1px solid var(--glass-border)',flexShrink:0}}>{a.type}</span>
                        {/* Priority pill */}
                        {a.priority && a.priority!=='none' && (
                          <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:pri.bg,color:pri.color,fontWeight:700,border:`1px solid ${pri.color}`,flexShrink:0}}>{pri.label}</span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:'var(--text-3)'}}>
                        {a.course} · Due {new Date(a.due+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} · <span style={{color:due.color,fontWeight:700}}>{due.label}</span>
                      </div>
                    </div>

                    {/* Priority buttons */}
                    <div style={{display:'flex',gap:3,flexShrink:0}}>
                      {PRIORITY.filter(p=>p.key!=='none').map(p=>(
                        <Tooltip key={p.key} text={`Set priority: ${p.label}`}>
                          <button onClick={()=>setPriority(a.id,a.priority===p.key?'none':p.key)} style={{
                            padding:'4px 8px',borderRadius:20,
                            border:`1.5px solid ${a.priority===p.key?p.color:'var(--glass-border)'}`,
                            background:a.priority===p.key?p.bg:'transparent',
                            color:a.priority===p.key?p.color:'var(--text-3)',
                            fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                            boxShadow:a.priority===p.key?`0 0 8px ${p.color}44`:'none',
                          }}>{p.label}</button>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Status buttons */}
                    <div style={{display:'flex',gap:3,flexShrink:0}}>
                      {STATUS.map(s=>(
                        <Tooltip key={s.key} text={`Mark as ${s.key}`}>
                          <button onClick={()=>setStatus(a.id,s.key)} style={{
                            padding:'4px 9px',borderRadius:20,
                            border:`1.5px solid ${a.status===s.key?s.dot:'var(--glass-border)'}`,
                            background:a.status===s.key?s.bg:'transparent',
                            color:a.status===s.key?s.color:'var(--text-3)',
                            fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                            boxShadow:a.status===s.key?`0 0 8px ${s.dot}44`:'none',
                          }}>{s.key}</button>
                        </Tooltip>
                      ))}
                    </div>

                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <Tooltip text={isOpen?'Collapse notes':'Expand notes'}>
                        <button className="btn-icon" onClick={()=>setExpandId(isOpen?null:a.id)} style={{padding:5}}>
                          {isOpen?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete assignment">
                        <button className="btn-icon" onClick={()=>deleteAssignment(a.id)} style={{padding:5,color:'var(--coral)'}}><Trash2 size={13}/></button>
                      </Tooltip>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{padding:'0 14px 12px',borderTop:'1px solid var(--glass-border)'}}>
                      <textarea className="inline-input" rows={3} placeholder="Notes…" value={a.notes||''} onChange={e=>updateNote(a.id,e.target.value)} style={{marginTop:10,fontSize:12,resize:'vertical'}}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
