import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, BookOpen, ArrowUp, ArrowDown } from 'lucide-react'
import { loadTerms, saveTerms, uid, ASSIGNMENT_TYPES, STATUS_OPTS } from '../utils/termData.js'
import InlineNotes from '../components/InlineNotes.jsx'
import { formatRelativeDue } from '../utils/timeFormat.js'
import Tooltip from '../components/Tooltip.jsx'

const PRIORITY = [
  { key:'none',   label:'—',      color:'var(--text-3)',  bg:'var(--glass-bg-2)' },
  { key:'low',    label:'Low',    color:'var(--green)',   bg:'var(--green-dim)'  },
  { key:'medium', label:'Medium', color:'var(--amber)',   bg:'var(--amber-dim)'  },
  { key:'high',   label:'High',   color:'var(--coral)',   bg:'var(--coral-dim)'  },
  { key:'urgent', label:'Urgent', color:'#ef4444',        bg:'rgba(239,68,68,.15)'},
]
const STATUS = [
  { key:'To do',       color:'var(--text-3)',  bg:'var(--glass-bg-2)', dot:'var(--text-3)' },
  { key:'In progress', color:'var(--amber)',   bg:'var(--amber-dim)',  dot:'var(--amber)'  },
  { key:'Done',        color:'var(--green)',   bg:'var(--green-dim)',  dot:'var(--green)'  },
]
const COURSE_COLORS = ['#6366f1','#14b8a6','#f59e0b','#f43f5e','#22c55e','#8b5cf6','#06b6d4','#ec4899']

const BLANK_COURSE = { name:'', instructor:'', days:'', time:'', room:'', credits:3, gradeTarget:90, color:COURSE_COLORS[0], notes:'' }
const BLANK_ASSIGN = { title:'', type:ASSIGNMENT_TYPES[0], due:'', dueTime:'', status:'To do', priority:'none', notes:'' }

export default function Courses({ onDataChange }) {
  const [terms,        setTerms]        = useState(() => loadTerms())
  const [activeTermId, setActiveTermId] = useState(() => { const t=loadTerms().find(t=>t.active); return t?.id||loadTerms()[0]?.id })
  const [expandedCourses, setExpandedCourses] = useState({})

  const [showAddTerm,   setShowAddTerm]   = useState(false)
  const [newTermName,   setNewTermName]   = useState('')
  const [editTermId,    setEditTermId]    = useState(null)
  const [editTermName,  setEditTermName]  = useState('')

  const [showAddCourse, setShowAddCourse] = useState(null)
  const [newCourse,     setNewCourse]     = useState(BLANK_COURSE)
  const [editCourseId,  setEditCourseId]  = useState(null)
  const [editCourseForm,setEditCourseForm]= useState(BLANK_COURSE)

  const [showAddAssign, setShowAddAssign] = useState(null)
  const [newAssign,     setNewAssign]     = useState(BLANK_ASSIGN)
  const [editAssignId,  setEditAssignId]  = useState(null)
  const [editAssign,    setEditAssign]    = useState({})

  useEffect(() => { saveTerms(terms); onDataChange?.() }, [terms])

  const updateTerms = fn => setTerms(ts => fn([...ts]))

  // ── Term ops ──────────────────────────────────────
  const addTerm = () => {
    if (!newTermName.trim()) return
    updateTerms(ts => [...ts, { id:uid(), name:newTermName.trim(), active:false, courses:[] }])
    setNewTermName(''); setShowAddTerm(false)
  }
  const deleteTerm = id => {
    if (!confirm('Delete this term and all its courses and assignments?')) return
    updateTerms(ts => ts.filter(t => t.id!==id))
    if (activeTermId===id) setActiveTermId(terms.find(t=>t.id!==id)?.id)
  }
  const saveTermName = id => {
    updateTerms(ts => ts.map(t => t.id===id ? {...t, name:editTermName} : t))
    setEditTermId(null)
  }
  const setActiveTerm = id => {
    setActiveTermId(id)
    updateTerms(ts => ts.map(t => ({...t, active: t.id===id})))
  }

  // ── Course ops ────────────────────────────────────
  const addCourse = (termId) => {
    if (!newCourse.name.trim()) return
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: [...t.courses, { ...newCourse, id:uid(), assignments:[] }]
    }))
    setNewCourse(BLANK_COURSE); setShowAddCourse(null)
  }
  const deleteCourse = (termId, courseId) => {
    if (!confirm('Delete this course and all its assignments?')) return
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: t.courses.filter(c => c.id!==courseId)
    }))
  }
  const saveCourse = (termId, courseId) => {
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: t.courses.map(c => c.id!==courseId ? c : {...c, ...editCourseForm})
    }))
    setEditCourseId(null)
  }
  // Move course up/down within a term
  const moveCourse = (termId, courseId, dir) => {
    updateTerms(ts => ts.map(t => {
      if (t.id !== termId) return t
      const cs  = [...t.courses]
      const idx = cs.findIndex(c => c.id === courseId)
      const to  = idx + dir
      if (to < 0 || to >= cs.length) return t
      ;[cs[idx], cs[to]] = [cs[to], cs[idx]]
      return { ...t, courses: cs }
    }))
  }

  // ── Assignment ops ────────────────────────────────
  const addAssignment = (termId, courseId) => {
    if (!newAssign.title.trim() || !newAssign.due) return
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: t.courses.map(c => c.id!==courseId ? c : {
        ...c, assignments: [...c.assignments, { ...newAssign, id:uid() }]
      })
    }))
    setNewAssign(BLANK_ASSIGN); setShowAddAssign(null)
  }
  const updateAssign = (termId, courseId, assignId, patch) => {
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: t.courses.map(c => c.id!==courseId ? c : {
        ...c, assignments: c.assignments.map(a => a.id!==assignId ? a : {...a, ...patch})
      })
    }))
  }
  const startEditAssign = (a) => {
    setEditAssignId(a.id)
    setEditAssign({ title:a.title, type:a.type, due:a.due, dueTime:a.dueTime||'', status:a.status, priority:a.priority||'none', notes:a.notes||'' })
  }
  const saveAssign = (termId, courseId, assignId) => {
    updateAssign(termId, courseId, assignId, editAssign)
    setEditAssignId(null)
  }
  const deleteAssign = (termId, courseId, assignId) => {
    updateTerms(ts => ts.map(t => t.id!==termId ? t : {
      ...t, courses: t.courses.map(c => c.id!==courseId ? c : {
        ...c, assignments: c.assignments.filter(a => a.id!==assignId)
      })
    }))
  }

  const activeTerm = terms.find(t => t.id===activeTermId) || terms[0]
  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const smallInput = { ...inputStyle, fontSize:12, padding:'6px 9px' }

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Assignments</div><div className="page-subtitle">Terms → Courses → Assignments</div></div>
        <Tooltip text="Add a new semester or term">
          <button className="btn btn-primary" onClick={()=>setShowAddTerm(s=>!s)}><Plus size={14}/> Add term</button>
        </Tooltip>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {showAddTerm && (
          <div className="card" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input style={{...inputStyle,flex:1}} placeholder="Term name (e.g. Fall 2026)" value={newTermName} onChange={e=>setNewTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTerm()} autoFocus/>
            <button className="btn btn-primary" onClick={addTerm}>Add</button>
            <button className="btn btn-ghost" onClick={()=>setShowAddTerm(false)}>Cancel</button>
          </div>
        )}

        {/* Term tabs */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {terms.map(term => (
            <div key={term.id} style={{display:'flex',alignItems:'center',gap:4}}>
              {editTermId===term.id ? (
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input style={{...inputStyle,width:160}} value={editTermName} onChange={e=>setEditTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveTermName(term.id)} autoFocus/>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>saveTermName(term.id)}><Check size={11}/></button>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>setEditTermId(null)}><X size={11}/></button>
                </div>
              ) : (
                <button onClick={()=>setActiveTerm(term.id)} style={{
                  padding:'7px 16px', borderRadius:'var(--radius-md)',
                  border:`1.5px solid ${activeTermId===term.id?'var(--accent)':'var(--glass-border)'}`,
                  background: activeTermId===term.id ? 'var(--accent)' : 'var(--glass-bg-2)',
                  color: activeTermId===term.id ? 'white' : 'var(--text-2)',
                  fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .15s',
                  boxShadow: activeTermId===term.id ? '0 0 12px var(--accent-glow)' : 'none',
                }}>
                  {term.name}
                  {term.active && <span style={{fontSize:9,marginLeft:5,opacity:.7}}>●</span>}
                </button>
              )}
              {activeTermId===term.id && editTermId!==term.id && (
                <div style={{display:'flex',gap:2}}>
                  <Tooltip text="Rename term">
                    <button className="btn-icon" style={{padding:3}} onClick={()=>{setEditTermId(term.id);setEditTermName(term.name)}}><Edit2 size={10}/></button>
                  </Tooltip>
                  <Tooltip text="Delete term">
                    <button className="btn-icon" style={{padding:3,color:'var(--coral)'}} onClick={()=>deleteTerm(term.id)}><Trash2 size={10}/></button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>

        {activeTerm && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {activeTerm.courses.length > 0 && (
              <div className="grid-3">
                {STATUS.map(s=>(
                  <div key={s.key} className="stat-card">
                    <div className="stat-label">{s.key}</div>
                    <div className="stat-value" style={{color:s.color,fontSize:22}}>
                      {activeTerm.courses.reduce((sum,c)=>sum+c.assignments.filter(a=>a.status===s.key).length,0)}
                    </div>
                    <div className="stat-sub">across all courses</div>
                  </div>
                ))}
              </div>
            )}

            {/* Course accordions */}
            {activeTerm.courses.map((course, courseIdx) => {
              const isExpanded  = expandedCourses[course.id] !== false
              const doneCount   = course.assignments.filter(a=>a.status==='Done').length
              const totalCount  = course.assignments.length
              // Sort by due date only — urgency does NOT affect order here
              const sorted = [...course.assignments].sort((a,b) => {
                if (!a.due && !b.due) return 0
                if (!a.due) return 1
                if (!b.due) return -1
                return new Date(a.due) - new Date(b.due)
              })

              return (
                <div key={course.id} className="card" style={{padding:0,overflow:'hidden',borderLeft:`3px solid ${course.color}`}}>

                  {/* Course header */}
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',cursor:'pointer'}}
                    onClick={()=>setExpandedCourses(e=>({...e,[course.id]:!isExpanded}))}>

                    {/* Reorder arrows */}
                    <div style={{display:'flex',flexDirection:'column',gap:1,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <Tooltip text="Move course up">
                        <button className="btn-icon" style={{padding:2,opacity:courseIdx===0?0.25:1}}
                          onClick={()=>moveCourse(activeTerm.id,course.id,-1)} disabled={courseIdx===0}>
                          <ArrowUp size={10}/>
                        </button>
                      </Tooltip>
                      <Tooltip text="Move course down">
                        <button className="btn-icon" style={{padding:2,opacity:courseIdx===activeTerm.courses.length-1?0.25:1}}
                          onClick={()=>moveCourse(activeTerm.id,course.id,1)} disabled={courseIdx===activeTerm.courses.length-1}>
                          <ArrowDown size={10}/>
                        </button>
                      </Tooltip>
                    </div>

                    <div style={{width:10,height:10,borderRadius:'50%',background:course.color,boxShadow:`0 0 6px ${course.color}`,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14}}>{course.name}</div>
                      <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>
                        {[course.instructor,course.days,course.time,course.room].filter(Boolean).join(' · ')||'No details added'}
                        {totalCount>0&&<span style={{marginLeft:8}}>{doneCount}/{totalCount} done</span>}
                      </div>
                    </div>

                    <div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <Tooltip text="Edit course details">
                        <button className="btn-icon" style={{padding:4}} onClick={()=>{setEditCourseId(course.id);setEditCourseForm({name:course.name,instructor:course.instructor||'',days:course.days||'',time:course.time||'',room:course.room||'',credits:course.credits||3,gradeTarget:course.gradeTarget||90,color:course.color,notes:course.notes||''})}}>
                          <Edit2 size={12}/>
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete course">
                        <button className="btn-icon" style={{padding:4,color:'var(--coral)'}} onClick={()=>deleteCourse(activeTerm.id,course.id)}>
                          <Trash2 size={12}/>
                        </button>
                      </Tooltip>
                      <Tooltip text="Add assignment">
                        <button className="btn-icon" style={{padding:4,color:'var(--accent)'}} onClick={()=>setShowAddAssign(course.id)}>
                          <Plus size={12}/>
                        </button>
                      </Tooltip>
                    </div>

                    {isExpanded ? <ChevronUp size={14} style={{color:'var(--text-3)',flexShrink:0}}/> : <ChevronDown size={14} style={{color:'var(--text-3)',flexShrink:0}}/>}
                  </div>

                  {/* Progress bar */}
                  {totalCount>0 && (
                    <div style={{height:2,background:'var(--glass-border)',margin:'0 16px 12px'}}>
                      <div style={{height:'100%',background:course.color,borderRadius:2,width:`${(doneCount/totalCount)*100}%`,transition:'width .4s'}}/>
                    </div>
                  )}

                  {/* Edit course form */}
                  {editCourseId===course.id && (
                    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:8,borderTop:'1px solid var(--glass-border)',paddingTop:12}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <input style={{...smallInput,gridColumn:'1/-1'}} placeholder="Course name" value={editCourseForm.name} onChange={e=>setEditCourseForm(f=>({...f,name:e.target.value}))}/>
                        <input style={smallInput} placeholder="Instructor" value={editCourseForm.instructor} onChange={e=>setEditCourseForm(f=>({...f,instructor:e.target.value}))}/>
                        <input style={smallInput} placeholder="Days (e.g. Mon/Wed)" value={editCourseForm.days} onChange={e=>setEditCourseForm(f=>({...f,days:e.target.value}))}/>
                        <input style={smallInput} placeholder="Time" value={editCourseForm.time} onChange={e=>setEditCourseForm(f=>({...f,time:e.target.value}))}/>
                        <input style={smallInput} placeholder="Room" value={editCourseForm.room} onChange={e=>setEditCourseForm(f=>({...f,room:e.target.value}))}/>
                        <input style={smallInput} type="number" placeholder="Credits" value={editCourseForm.credits} onChange={e=>setEditCourseForm(f=>({...f,credits:Number(e.target.value)}))}/>
                        <input style={smallInput} type="number" placeholder="Grade target %" value={editCourseForm.gradeTarget} onChange={e=>setEditCourseForm(f=>({...f,gradeTarget:Number(e.target.value)}))}/>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                        <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                        {COURSE_COLORS.map(c=>(
                          <button key={c} onClick={()=>setEditCourseForm(f=>({...f,color:c}))} style={{width:20,height:20,borderRadius:'50%',background:c,border:`2px solid ${editCourseForm.color===c?'white':'transparent'}`,cursor:'pointer'}}/>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>saveCourse(activeTerm.id,course.id)}>Save</button>
                        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setEditCourseId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Assignments list */}
                  {isExpanded && (
                    <div style={{borderTop:'1px solid var(--glass-border)'}}>

                      {sorted.length===0 && showAddAssign!==course.id && (
                        <div style={{padding:'16px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No assignments yet</div>
                      )}

                      {sorted.map(a => {
                        const due = formatRelativeDue(a.due, a.dueTime) || { label:'No due date', color:'var(--text-3)' }
                        const pri = PRIORITY.find(p=>p.key===(a.priority||'none'))
                        const isEditing = editAssignId === a.id

                        return (
                          <div key={a.id} style={{borderBottom:'1px solid var(--glass-border)'}}>
                            {isEditing ? (
                              <div style={{padding:'12px 16px',background:'var(--glass-bg-2)'}}>
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                                  <input style={{...smallInput,gridColumn:'1/-1'}} value={editAssign.title} onChange={e=>setEditAssign(f=>({...f,title:e.target.value}))} placeholder="Title" autoFocus/>
                                  <select style={smallInput} value={editAssign.type} onChange={e=>setEditAssign(f=>({...f,type:e.target.value}))}>
                                    {ASSIGNMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input type="date" style={smallInput} value={editAssign.due} onChange={e=>setEditAssign(f=>({...f,due:e.target.value}))}/>
                                  <input type="time" style={smallInput} value={editAssign.dueTime||''} onChange={e=>setEditAssign(f=>({...f,dueTime:e.target.value}))} placeholder="Time (optional)"/>
                                </div>
                                <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
                                  <span style={{fontSize:11,color:'var(--text-3)',alignSelf:'center',marginRight:4}}>Priority:</span>
                                  {PRIORITY.filter(p=>p.key!=='none').map(p=>(
                                    <button key={p.key} onClick={()=>setEditAssign(f=>({...f,priority:f.priority===p.key?'none':p.key}))} style={{padding:'3px 9px',borderRadius:20,border:`1.5px solid ${editAssign.priority===p.key?p.color:'var(--glass-border)'}`,background:editAssign.priority===p.key?p.bg:'transparent',color:editAssign.priority===p.key?p.color:'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>{p.label}</button>
                                  ))}
                                </div>
                                <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
                                  <span style={{fontSize:11,color:'var(--text-3)',alignSelf:'center',marginRight:4}}>Status:</span>
                                  {STATUS.map(s=>(
                                    <button key={s.key} onClick={()=>setEditAssign(f=>({...f,status:s.key}))} style={{padding:'3px 9px',borderRadius:20,border:`1.5px solid ${editAssign.status===s.key?s.dot:'var(--glass-border)'}`,background:editAssign.status===s.key?s.bg:'transparent',color:editAssign.status===s.key?s.color:'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>{s.key}</button>
                                  ))}
                                </div>
                                <textarea style={{...smallInput,width:'100%',resize:'vertical',lineHeight:1.6,marginBottom:10}} rows={3} value={editAssign.notes} onChange={e=>setEditAssign(f=>({...f,notes:e.target.value}))} placeholder="Notes…"/>
                                <div style={{display:'flex',gap:6}}>
                                  <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>saveAssign(activeTerm.id,course.id,a.id)}>Save</button>
                                  <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setEditAssignId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="assign-row" style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',flexWrap:'wrap'}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3}}>
                                      <span style={{fontWeight:600,fontSize:13}}>{a.title}</span>
                                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:20,background:'var(--glass-bg-2)',color:'var(--text-3)',border:'1px solid var(--glass-border)',flexShrink:0}}>{a.type}</span>
                                      {a.priority!=='none'&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:pri.bg,color:pri.color,fontWeight:700,border:`1px solid ${pri.color}`,flexShrink:0}}>{pri.label}</span>}
                                    </div>
                                    <div style={{fontSize:11,color:'var(--text-3)'}}>
                                      <span style={{color:due.color,fontWeight:700}}>{due.label}</span>
                                    </div>
                                  </div>
                                  <div className="pill-row" style={{display:'flex',gap:3,flexShrink:0}}>
                                    {PRIORITY.filter(p=>p.key!=='none').map(p=>(
                                      <button key={p.key} onClick={()=>updateAssign(activeTerm.id,course.id,a.id,{priority:a.priority===p.key?'none':p.key})} style={{padding:'3px 7px',borderRadius:20,border:`1.5px solid ${a.priority===p.key?p.color:'var(--glass-border)'}`,background:a.priority===p.key?p.bg:'transparent',color:a.priority===p.key?p.color:'var(--text-3)',fontSize:10,fontWeight:600,cursor:'pointer',transition:'all .15s'}}>{p.label}</button>
                                    ))}
                                  </div>
                                  <div className="pill-row" style={{display:'flex',gap:3,flexShrink:0}}>
                                    {STATUS.map(s=>(
                                      <button key={s.key} onClick={()=>updateAssign(activeTerm.id,course.id,a.id,{status:s.key})} style={{padding:'3px 8px',borderRadius:20,border:`1.5px solid ${a.status===s.key?s.dot:'var(--glass-border)'}`,background:a.status===s.key?s.bg:'transparent',color:a.status===s.key?s.color:'var(--text-3)',fontSize:10,fontWeight:600,cursor:'pointer',transition:'all .15s',boxShadow:a.status===s.key?`0 0 6px ${s.dot}44`:'none'}}>{s.key}</button>
                                    ))}
                                  </div>
                                  <div style={{display:'flex',gap:3,flexShrink:0}}>
                                    <Tooltip text="Edit assignment">
                                      <button className="btn-icon" style={{padding:4}} onClick={()=>startEditAssign(a)}><Edit2 size={12}/></button>
                                    </Tooltip>
                                    <Tooltip text="Delete assignment">
                                      <button className="btn-icon" style={{padding:4,color:'var(--coral)'}} onClick={()=>deleteAssign(activeTerm.id,course.id,a.id)}><Trash2 size={12}/></button>
                                    </Tooltip>
                                  </div>
                                </div>
                                <div style={{padding:'0 16px 10px'}}>
                                  <InlineNotes
                                    value={a.notes||''}
                                    onChange={notes=>updateAssign(activeTerm.id,course.id,a.id,{notes})}
                                    placeholder="Add notes for this assignment…"
                                    title={a.title}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}

                      {/* Add assignment form */}
                      {showAddAssign===course.id ? (
                        <div style={{padding:'12px 16px',background:'var(--glass-bg-2)',borderTop:'1px solid var(--glass-border)'}}>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                            <input style={{...smallInput,gridColumn:'1/-1'}} placeholder="Assignment title" value={newAssign.title} onChange={e=>setNewAssign(f=>({...f,title:e.target.value}))} autoFocus/>
                            <select style={smallInput} value={newAssign.type} onChange={e=>setNewAssign(f=>({...f,type:e.target.value}))}>
                              {ASSIGNMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                            <input type="date" style={smallInput} value={newAssign.due} onChange={e=>setNewAssign(f=>({...f,due:e.target.value}))}/>
                            <input type="time" style={smallInput} value={newAssign.dueTime||''} onChange={e=>setNewAssign(f=>({...f,dueTime:e.target.value}))} placeholder="Time (optional)"/>
                          </div>
                          <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,color:'var(--text-3)',alignSelf:'center',marginRight:4}}>Priority:</span>
                            {PRIORITY.filter(p=>p.key!=='none').map(p=>(
                              <button key={p.key} onClick={()=>setNewAssign(f=>({...f,priority:f.priority===p.key?'none':p.key}))} style={{padding:'3px 9px',borderRadius:20,border:`1.5px solid ${newAssign.priority===p.key?p.color:'var(--glass-border)'}`,background:newAssign.priority===p.key?p.bg:'transparent',color:newAssign.priority===p.key?p.color:'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>{p.label}</button>
                            ))}
                          </div>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>addAssignment(activeTerm.id,course.id)}>Add</button>
                            <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setShowAddAssign(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{padding:'10px 16px'}}>
                          <button className="btn btn-ghost" style={{fontSize:12,gap:6,width:'100%',justifyContent:'center'}} onClick={()=>setShowAddAssign(course.id)}>
                            <Plus size={12}/> Add assignment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add course */}
            {showAddCourse===activeTerm.id ? (
              <div className="card">
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>New course</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <input style={{...inputStyle,gridColumn:'1/-1'}} placeholder="Course name*" value={newCourse.name} onChange={e=>setNewCourse(f=>({...f,name:e.target.value}))} autoFocus/>
                  <input style={inputStyle} placeholder="Instructor" value={newCourse.instructor} onChange={e=>setNewCourse(f=>({...f,instructor:e.target.value}))}/>
                  <input style={inputStyle} placeholder="Days (e.g. Mon/Wed)" value={newCourse.days} onChange={e=>setNewCourse(f=>({...f,days:e.target.value}))}/>
                  <input style={inputStyle} placeholder="Time" value={newCourse.time} onChange={e=>setNewCourse(f=>({...f,time:e.target.value}))}/>
                  <input style={inputStyle} placeholder="Room" value={newCourse.room} onChange={e=>setNewCourse(f=>({...f,room:e.target.value}))}/>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                  {COURSE_COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewCourse(f=>({...f,color:c}))} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${newCourse.color===c?'white':'transparent'}`,cursor:'pointer'}}/>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary" onClick={()=>addCourse(activeTerm.id)} style={{flex:1}}>Add course</button>
                  <button className="btn btn-ghost" onClick={()=>setShowAddCourse(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{gap:8,alignSelf:'flex-start'}} onClick={()=>setShowAddCourse(activeTerm.id)}>
                <Plus size={14}/> Add course
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
