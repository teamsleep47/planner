import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, ExternalLink, Edit2, Trash2, Check } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { useNavigate } from 'react-router-dom'
import { loadTerms, saveTerms, uid, ASSIGNMENT_TYPES, getCourseColorMap } from '../utils/termData.js'
import { useSaveHalo } from '../hooks/useSaveHalo.js'
import { formatRelativeDue } from '../utils/timeFormat.js'

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_S  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const PLAN_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e',
  '#f59e0b','#f97316','#22c55e','#14b8a6',
  '#06b6d4','#3b82f6','#a855f7','#84cc16',
  '#e11d48','#0ea5e9','#10b981','#64748b',
]

// Returns a darkened/saturated version of a hex color for text on tinted backgrounds
function darkenColor(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgb(${Math.round(r*.55)},${Math.round(g*.55)},${Math.round(b*.55)})`
}

const PRIORITY_BADGE = {
  urgent: { label:'🔴 Urgent', color:'#ef4444' },
  high:   { label:'🟠 High',   color:'#f97316' },
  medium: { label:'🟡 Medium', color:'#f59e0b' },
  low:    { label:'🟢 Low',    color:'#22c55e' },
  none:   { label:'',          color:null       },
}

function getAllAssignments() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (!active) return []
    return active.courses.flatMap(c =>
      c.assignments.map(a => ({ ...a, courseName: c.name, courseColor: c.color, courseId: c.id, _type: 'assignment' }))
    )
  } catch(e) { return [] }
}

function getActiveCourses() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    return active?.courses || []
  } catch(e) { return [] }
}

// ── Plan popup — matches assignment popup style ──────────────────
function PlanPopup({ plan, anchor, onClose, onEdit, onDelete }) {
  const style = {
    position:'fixed', zIndex:1000,
    top:  Math.min(anchor.y + 8, window.innerHeight - 260),
    left: Math.min(Math.max(anchor.x - 150, 8), window.innerWidth - 320),
    width: 300,
  }
  const planDate = plan.date
    ? new Date(plan.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
    : null
  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:999}} onClick={onClose}/>
      <div className="card" style={{...style,padding:0,overflow:'hidden',border:`2px solid ${plan.color}`,boxShadow:'0 16px 48px rgba(0,0,0,.4)'}}>
        <div style={{background:`${plan.color}22`,borderBottom:`1px solid ${plan.color}44`,padding:'12px 14px 10px',display:'flex',alignItems:'flex-start',gap:10}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:plan.color,boxShadow:`0 0 8px ${plan.color}`,flexShrink:0,marginTop:3}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:3}}>{plan.title}</div>
            <div style={{fontSize:11,color:plan.color,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
              {'\u{1F4C5}'} Personal event
              {plan.tasked && <span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:`${plan.color}33`,color:plan.color,border:`1px solid ${plan.color}66`,fontWeight:700}}>tasked</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,flexShrink:0}}><X size={14}/></button>
        </div>
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {planDate && <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--text-3)',width:44}}>Date</span><span style={{fontSize:13,fontWeight:700,color:'var(--text-1)'}}>{planDate}</span></div>}
          {plan.notes && <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.5,background:'var(--glass-bg)',borderRadius:6,padding:'7px 9px',maxHeight:60,overflow:'hidden',WebkitMaskImage:'linear-gradient(to bottom,black 60%,transparent 100%)'}}>{plan.notes}</div>}
        </div>
        <div style={{padding:'0 14px 14px',display:'flex',gap:8}}>
          <button onClick={()=>{onEdit();onClose()}} className="btn btn-primary" style={{flex:1,justifyContent:'center',gap:6,fontSize:13}}>
            <Edit2 size={13}/> Edit
          </button>
          <button onClick={()=>{if(confirm('Delete this plan?')){onDelete();onClose()}}} className="btn btn-ghost" style={{color:'var(--coral)',fontSize:13,padding:'8px 12px'}}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Assignment popup ─────────────────────────────────────────────
function AssignmentPopup({ item, anchor, onClose, onJump }) {
  const due   = item.due ? formatRelativeDue(item.due, item.dueTime) : null
  const badge = PRIORITY_BADGE[item.priority || 'none']
  const style = {
    position:'fixed', zIndex:1000,
    top:  Math.min(anchor.y + 8, window.innerHeight - 300),
    left: Math.min(Math.max(anchor.x - 150, 8), window.innerWidth - 320),
    width:300,
  }
  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:999}} onClick={onClose}/>
      <div className="card" style={{...style,padding:0,overflow:'hidden',border:`2px solid ${item.courseColor}`,boxShadow:'0 16px 48px rgba(0,0,0,.4)'}}>
        <div style={{background:`${item.courseColor}22`,borderBottom:`1px solid ${item.courseColor}44`,padding:'12px 14px 10px',display:'flex',alignItems:'flex-start',gap:10}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:item.courseColor,boxShadow:`0 0 8px ${item.courseColor}`,flexShrink:0,marginTop:3}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:3}}>{item.title}</div>
            <div style={{fontSize:11,color:item.courseColor,fontWeight:600}}>{item.courseName}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,flexShrink:0}}><X size={14}/></button>
        </div>
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {due && <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--text-3)',width:44}}>Due</span><span style={{fontSize:13,fontWeight:700,color:due.color}}>{due.label}</span></div>}
          {item.startDate && <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--text-3)',width:44}}>Start</span><span style={{fontSize:12,color:'var(--text-2)'}}>{new Date(item.startDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>}
          {item.type && <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--text-3)',width:44}}>Type</span><span style={{fontSize:12,color:'var(--text-2)'}}>{item.type}</span></div>}
          {badge.label && <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--text-3)',width:44}}>Priority</span><span style={{fontSize:12,color:badge.color,fontWeight:600}}>{badge.label}</span></div>}
          {item.notes && <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.5,background:'var(--glass-bg)',borderRadius:6,padding:'7px 9px',maxHeight:60,overflow:'hidden',WebkitMaskImage:'linear-gradient(to bottom,black 60%,transparent 100%)'}}>{item.notes}</div>}
        </div>
        <div style={{padding:'0 14px 14px'}}>
          <button onClick={onJump} className="btn btn-primary" style={{width:'100%',justifyContent:'center',gap:6,fontSize:13}}>
            <ExternalLink size={13}/> Open in Assignments
          </button>
        </div>
      </div>
    </>
  )
}

// ── Plan edit modal ──────────────────────────────────────────────
function PlanEditModal({ plan, onClose, onSave, onDelete, onAddAsTask }) {
  const [form,        setForm]        = useState({ title: plan.title, date: plan.date, notes: plan.notes || '', color: plan.color })
  const [showTaskForm,setShowTaskForm]= useState(false)
  const [taskCourse,  setTaskCourse]  = useState('OTHER')
  const [taskUrgency, setTaskUrgency] = useState('none')

  const inp = { padding:'9px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5, display:'block' }

  const courses = getActiveCourses()

  const URGENCY_OPTS = [
    { key:'none',   label:'No priority' },
    { key:'low',    label:'🟢 Relaxed'  },
    { key:'medium', label:'🟡 Soon'     },
    { key:'high',   label:'🟠 High'     },
    { key:'urgent', label:'🔴 Urgent'   },
  ]

  return (
    <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)'}}/>
      <div className="card" style={{position:'relative',zIndex:1,width:'100%',maxWidth:480,maxHeight:'90vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--glass-border)'}}>
          <span style={{fontWeight:700,fontSize:15}}>Edit plan</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={16}/></button>
        </div>
        <div style={{padding:18}}>
          <div style={{marginBottom:14}}><label style={lbl}>Title</label><input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Date</label><input type="date" style={inp} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>Color</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,marginTop:4}}>
              {PLAN_COLORS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:`3px solid ${form.color===c?'white':'transparent'}`,boxShadow:form.color===c?`0 0 8px ${c}`:'none'}}/>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>Notes</label><textarea style={{...inp,minHeight:60,resize:'vertical',lineHeight:1.6,fontFamily:'var(--font-mono)'}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="What's this for?"/></div>

          {/* ── Add as task mini-form ── */}
          <div style={{borderTop:'1px solid var(--glass-border)',paddingTop:14,marginBottom:16}}>
            <button onClick={()=>setShowTaskForm(s=>!s)} style={{
              display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 12px',
              borderRadius:'var(--radius-md)',cursor:'pointer',textAlign:'left',
              background:showTaskForm?'var(--accent-dim)':'var(--glass-bg)',
              border:`1px solid ${showTaskForm?'var(--accent)':'var(--glass-border)'}`,
              color:showTaskForm?'var(--accent)':'var(--text-2)',
              fontSize:13,fontWeight:600,transition:'all .15s',
            }}>
              <span style={{fontSize:16}}>✅</span>
              {showTaskForm ? 'Cancel adding as task' : 'Also add as a task →'}
            </button>

            {showTaskForm && (
              <div style={{marginTop:10,padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,color:'var(--text-3)'}}>
                  Will add "<strong style={{color:'var(--text-1)'}}>{form.title||plan.title}</strong>" to Today's Focus with due date {form.date}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:4}}>Course</div>
                    <select style={inp} value={taskCourse} onChange={e=>setTaskCourse(e.target.value)}>
                      <option value="OTHER">Other / Personal</option>
                      {courses.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:4}}>Priority</div>
                    <select style={inp} value={taskUrgency} onChange={e=>setTaskUrgency(e.target.value)}>
                      {URGENCY_OPTS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{justifyContent:'center',fontSize:12}} onClick={()=>{
                  onAddAsTask({ text: form.title||plan.title, course: taskCourse, urgency: taskUrgency, due: form.date, isPlan: false })
                  setShowTaskForm(false)
                }}>
                  Add to Today's Focus
                </button>
              </div>
            )}
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>{ if(!form.title.trim()) return; onSave(form); onClose() }}>Save</button>
            <button className="btn btn-ghost" style={{color:'var(--coral)'}} onClick={()=>{ if(confirm('Delete this plan?')) { onDelete(); onClose() } }}><Trash2 size={13}/></button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add modal ────────────────────────────────────────────────────
function AddModal({ date, onClose, onSaveAssignment, onSavePlan }) {
  const courses = getActiveCourses()
  const [step,   setStep]   = useState('pick')
  const [course, setCourse] = useState(null)
  const [aForm,  setAForm]  = useState({ title:'', type:'Essay', due:date, dueTime:'', startDate:'', status:'To do', priority:'none', notes:'', score:'', maxScore:'100', submissionType:'Canvas' })
  const [pForm,  setPForm]  = useState({ title:'', date, notes:'', color: PLAN_COLORS[0] })

  const inp = { padding:'9px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5, display:'block' }
  const row = { marginBottom:14 }

  const dateLabel = new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})

  return (
    <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)'}}/>
      <div className="card" style={{position:'relative',zIndex:1,width:'100%',maxWidth:500,maxHeight:'90vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--glass-border)'}}>
          <div>
            <span style={{fontWeight:700,fontSize:15}}>
              {step==='pick' ? 'Add to calendar' : step==='assignment' ? `New assignment — ${course?.name}` : 'New event'}
            </span>
            <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{dateLabel}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={16}/></button>
        </div>

        <div style={{padding:18}}>
          {/* Step 1: pick type */}
          {step==='pick' && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* Assignment: course quick-pick */}
              {courses.length > 0 && (
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Add assignment to course</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
                    {courses.map(c=>(
                      <button key={c.id} onClick={()=>{ setCourse(c); setAForm(f=>({...f,due:date})); setStep('assignment') }} style={{
                        padding:'12px 14px', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'left',
                        background:`${c.color}18`, border:`2px solid ${c.color}44`, transition:'all .15s',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.border=`2px solid ${c.color}`;e.currentTarget.style.background=`${c.color}28`}}
                        onMouseLeave={e=>{e.currentTarget.style.border=`2px solid ${c.color}44`;e.currentTarget.style.background=`${c.color}18`}}>
                        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:c.color,boxShadow:`0 0 6px ${c.color}`,flexShrink:0}}/>
                          <span style={{fontWeight:700,fontSize:12,color:'var(--text-1)'}}>{c.name}</span>
                        </div>
                        <div style={{fontSize:10,color:'var(--text-3)'}}>{c.assignments?.length||0} assignments</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{borderTop:'1px solid var(--glass-border)',paddingTop:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Personal event</div>
                <button onClick={()=>setStep('plan')} style={{
                  width:'100%',padding:'12px 14px',borderRadius:'var(--radius-md)',cursor:'pointer',textAlign:'left',
                  background:'var(--glass-bg-2)',border:'2px solid var(--glass-border)',transition:'all .15s',display:'flex',alignItems:'center',gap:12,
                }}
                  onMouseEnter={e=>e.currentTarget.style.border='2px solid var(--accent)'}
                  onMouseLeave={e=>e.currentTarget.style.border='2px solid var(--glass-border)'}>
                  <span style={{fontSize:20}}>📅</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>Study session / reminder</div>
                    <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Appointments, study blocks, custom reminders</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2a: assignment form */}
          {step==='assignment' && course && (
            <div>
              <div style={row}><label style={lbl}>Title *</label><input style={inp} value={aForm.title} onChange={e=>setAForm(f=>({...f,title:e.target.value}))} placeholder="Assignment title" autoFocus/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Type</label><select style={inp} value={aForm.type} onChange={e=>setAForm(f=>({...f,type:e.target.value}))}>{ASSIGNMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={lbl}>Submission</label><select style={inp} value={aForm.submissionType} onChange={e=>setAForm(f=>({...f,submissionType:e.target.value}))}>{['Canvas','In class','Both','Email','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Start date</label><input type="date" style={inp} value={aForm.startDate} onChange={e=>setAForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div><label style={lbl}>Due date *</label><input type="date" style={inp} value={aForm.due} onChange={e=>setAForm(f=>({...f,due:e.target.value}))}/></div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Priority</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {['none','low','medium','high','urgent'].map(p=>(
                    <button key={p} onClick={()=>setAForm(f=>({...f,priority:p}))} style={{padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${aForm.priority===p?'var(--accent)':'var(--glass-border)'}`,background:aForm.priority===p?'var(--accent-dim)':'transparent',color:aForm.priority===p?'var(--accent)':'var(--text-3)'}}>
                      {p.charAt(0).toUpperCase()+p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}><label style={lbl}>Notes</label><textarea style={{...inp,minHeight:70,resize:'vertical',lineHeight:1.6,fontFamily:'var(--font-mono)'}} value={aForm.notes} onChange={e=>setAForm(f=>({...f,notes:e.target.value}))} placeholder="Requirements, reminders…"/></div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setStep('pick')} style={{fontSize:12}}>← Back</button>
                <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>{ if(!aForm.title.trim()||!aForm.due) return; onSaveAssignment(course,aForm); onClose() }} disabled={!aForm.title.trim()||!aForm.due}>
                  Add assignment
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: plan/event form */}
          {step==='plan' && (
            <div>
              <div style={row}><label style={lbl}>Title *</label><input style={inp} value={pForm.title} onChange={e=>setPForm(f=>({...f,title:e.target.value}))} placeholder="Study session, appointment…" autoFocus/></div>
              <div style={row}><label style={lbl}>Date *</label><input type="date" style={inp} value={pForm.date} onChange={e=>setPForm(f=>({...f,date:e.target.value}))}/></div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Color</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,marginTop:4}}>
                  {PLAN_COLORS.map(c=>(
                    <button key={c} onClick={()=>setPForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:`3px solid ${pForm.color===c?'white':'transparent'}`,boxShadow:pForm.color===c?`0 0 8px ${c}`:'none'}}/>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:14}}><label style={lbl}>Notes</label><textarea style={{...inp,minHeight:60,resize:'vertical',lineHeight:1.6,fontFamily:'var(--font-mono)'}} value={pForm.notes} onChange={e=>setPForm(f=>({...f,notes:e.target.value}))} placeholder="What's this for?"/></div>

              {/* Also add as task — prominent, in creation form */}
              <div style={{marginBottom:16,padding:12,borderRadius:'var(--radius-md)',background:pForm.alsoTask?'var(--accent-dim)':'var(--glass-bg)',border:`2px solid ${pForm.alsoTask?'var(--accent)':'var(--glass-border)'}`,cursor:'pointer',transition:'all .2s'}}
                onClick={()=>setPForm(f=>({...f,alsoTask:!f.alsoTask}))}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:20,height:20,borderRadius:6,background:pForm.alsoTask?'var(--accent)':'transparent',border:`2px solid ${pForm.alsoTask?'var(--accent)':'var(--glass-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                    {pForm.alsoTask && <Check size={12} color="white"/>}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:pForm.alsoTask?'var(--accent)':'var(--text-1)'}}>✅ Also add as a task</div>
                    <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Adds to Today's Focus so you can track it</div>
                  </div>
                </div>
                {pForm.alsoTask && (
                  <div style={{marginTop:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}} onClick={e=>e.stopPropagation()}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:4}}>Course</div>
                      <select style={inp} value={pForm.taskCourse||'OTHER'} onChange={e=>setPForm(f=>({...f,taskCourse:e.target.value}))}>
                        <option value="OTHER">Other / Personal</option>
                        {getActiveCourses().map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:4}}>Priority</div>
                      <select style={inp} value={pForm.taskUrgency||'none'} onChange={e=>setPForm(f=>({...f,taskUrgency:e.target.value}))}>
                        <option value="none">No priority</option>
                        <option value="low">🟢 Relaxed</option>
                        <option value="medium">🟡 Soon</option>
                        <option value="high">🟠 High</option>
                        <option value="urgent">🔴 Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setStep('pick')} style={{fontSize:12}}>← Back</button>
                <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>{
                  if(!pForm.title.trim()||!pForm.date) return
                  const taskData = pForm.alsoTask ? { text:pForm.title, course:pForm.taskCourse||'OTHER', urgency:pForm.taskUrgency||'none', due:pForm.date, isPlan:false } : null
                  onSavePlan({...pForm, tasked:!!pForm.alsoTask}, taskData)
                  onClose()
                }} disabled={!pForm.title.trim()||!pForm.date}>
                  Add event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ── Mobile day overlay — tapping the date number shows all items ─
function DayOverlay({ ds, x, y, assignments, plans, onClose, onAssignClick, onPlanClick, onPlanEdit, onAdd }) {
  const dues    = assignments.filter(a => a.due === ds)
  const starts  = assignments.filter(a => a.startDate === ds && a.startDate !== a.due)
  const dayPlan = plans.filter(p => p.date === ds)
  const allItems = [...dues, ...starts, ...dayPlan]

  const date = new Date(ds + 'T12:00:00')
  const label = date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  // Position: try to keep on screen
  const overlayW = Math.min(300, window.innerWidth - 16)
  const posX = Math.min(Math.max(x, 8), window.innerWidth - overlayW - 8)
  const posY = Math.min(y, window.innerHeight - 320)

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:800}} onClick={onClose}/>
      <div className="cal-day-overlay card" style={{
        position:'fixed', zIndex:801,
        top: posY, left: posX, width: overlayW,
        padding:0, overflow:'hidden',
        boxShadow:'0 16px 48px rgba(0,0,0,0.45)',
        border:'1px solid var(--glass-border)',
      }}>
        {/* Header */}
        <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--glass-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--glass-bg-2)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text-1)'}}>{label}</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>{onAdd(ds);onClose()}} style={{background:'var(--accent-dim)',border:'1px solid var(--accent)',borderRadius:8,color:'var(--accent)',fontSize:11,fontWeight:700,padding:'4px 10px',cursor:'pointer'}}>+ Add</button>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={14}/></button>
          </div>
        </div>

        {/* Items */}
        <div style={{padding:'10px',display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflowY:'auto'}}>
          {allItems.length === 0 && (
            <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'12px 0'}}>Nothing scheduled — tap + to add</div>
          )}

          {/* Assignment items */}
          {[...dues, ...starts].map((a, i) => {
            const due = a.due ? formatRelativeDue(a.due, a.dueTime) : null
            const isStart = a.startDate === ds && a.due !== ds
            return (
              <button key={`a-${a.id}-${i}`} onClick={()=>{ onAssignClick(a); onClose() }}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:`${a.courseColor}18`,border:`1px solid ${a.courseColor}44`,cursor:'pointer',textAlign:'left',width:'100%'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:a.courseColor,flexShrink:0,boxShadow:`0 0 6px ${a.courseColor}`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                  <div style={{fontSize:10,color:a.courseColor,fontWeight:600,marginTop:2}}>
                    {isStart ? '▶ Start date' : 'Due'} · {a.courseName}
                    {due && !isStart && <span style={{color:due.color,marginLeft:6}}>{due.label}</span>}
                  </div>
                </div>
                <ExternalLink size={12} style={{color:'var(--text-3)',flexShrink:0}}/>
              </button>
            )
          })}

          {/* Plan items */}
          {dayPlan.map((p, i) => (
            <button key={`p-${p.id}-${i}`}
              onClick={()=>{ onPlanEdit(p); onClose() }}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:`${p.color}18`,border:`1px solid ${p.color}44`,cursor:'pointer',textAlign:'left',width:'100%'}}>
              <span style={{fontSize:14,flexShrink:0}}>📅</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:p.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                {p.notes && <div style={{fontSize:10,color:'var(--text-3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.notes}</div>}
                {p.tasked && <div style={{fontSize:10,color:p.color,fontWeight:600,marginTop:2}}>✓ Added as task</div>}
              </div>
              <Edit2 size={12} style={{color:'var(--text-3)',flexShrink:0}}/>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Main calendar ────────────────────────────────────────────────
export default function CalendarPage({ onDataChange }) {
  const { haloRef: calHaloRef, triggerHalo: triggerCalHalo } = useSaveHalo()
  const navigate   = useNavigate()
  const [anchor,   setAnchor]   = useState(new Date())
  const [popup,    setPopup]    = useState(null)
  const [addModal, setAddModal] = useState(null)   // date string
  const [editPlan,      setEditPlan]      = useState(null)
  const [planPopup,     setPlanPopup]     = useState(null)
  const [dayOverlay,    setDayOverlay]    = useState(null)
  const [plans,         setPlans]         = useState(() => load('calendar_plans', []))
  const [dragPill,      setDragPill]      = useState(null)   // { type:'plan'|'assignment', item, originDate }
  const [dragOverDate,  setDragOverDate]  = useState(null)
  const [dupModal,      setDupModal]      = useState(null)   // { type, item, newDate, oldDate }
  const [confirmDelete, setConfirmDelete] = useState(null)   // { planId, taskId, planTitle }

  const [assignments, setAssignments] = useState(() => getAllAssignments())

  useEffect(() => { save('calendar_plans', plans); onDataChange?.(); triggerCalHalo('green') }, [plans])

  // Re-read plans and assignments when Drive syncs or assignments updated
  useEffect(() => {
    const refreshPlans = () => setPlans(load('calendar_plans', []))
    const refreshAssignments = () => setAssignments(getAllAssignments())
    const refreshAll = () => { refreshPlans(); refreshAssignments() }
    window.addEventListener('drive-loaded', refreshAll)
    window.addEventListener('assignments-updated', refreshAssignments)
    return () => {
      window.removeEventListener('drive-loaded', refreshAll)
      window.removeEventListener('assignments-updated', refreshAssignments)
    }
  }, [])

  // Local date — avoids UTC offset bug (toISOString returns yesterday before 8pm EDT)
  const today = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const year  = anchor.getFullYear()
  const month = anchor.getMonth()

  const prev    = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n })
  const next    = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n })
  const goToday = () => setAnchor(new Date())

  // Calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month+1, 0)
  const cells    = []
  for (let i=0; i<firstDay.getDay(); i++) cells.push(null)
  for (let d=1; d<=lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  // Index by date
  const byDue   = {}
  const byStart = {}
  assignments.forEach(a => {
    if (a.due) { if (!byDue[a.due]) byDue[a.due]=[]; byDue[a.due].push(a) }
    if (a.startDate && a.startDate !== a.due) { if (!byStart[a.startDate]) byStart[a.startDate]=[]; byStart[a.startDate].push(a) }
  })

  const inRangeFor = ds => assignments.filter(a => a.startDate && a.due && ds > a.startDate && ds < a.due)
  const plansFor   = ds => plans.filter(p => p.date === ds)

  const handleAssignClick = (e, item) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopup({ item, x: rect.left + rect.width/2, y: rect.bottom })
  }

  const handleJump = item => {
    sessionStorage.setItem('planner_cal_jump', JSON.stringify({ courseId: item.courseId, assignId: item.id }))
    setPopup(null)
    navigate('/courses')
  }

  const handleSaveAssignment = (course, form) => {
    const terms  = loadTerms()
    const active = terms.find(t=>t.active)||terms[0]
    if (!active) return
    const updated = terms.map(t => t.id!==active.id ? t : {
      ...t, courses: t.courses.map(c => c.id!==course.id ? c : {
        ...c, assignments: [...c.assignments, { ...form, id: uid() }]
      })
    })
    saveTerms(updated)
    onDataChange?.()
  }

  const handleSavePlan = (form, taskData) => {
    const planId  = uid()
    const taskId  = taskData ? Date.now() : undefined
    setPlans(ps => [...ps, { ...form, id: planId, _type:'plan', ...(taskId ? {taskId} : {}) }])
    if (taskData) {
      const tasks   = load('home_tasks', [])
      const newTask = { ...taskData, text: '📅 '+taskData.text, id: taskId, done: false, calendarPlanId: planId }
      save('home_tasks', [newTask, ...tasks])
      onDataChange?.()
    }
  }
  const handleUpdatePlan = (id, form) => {
    const oldPlan = plans.find(p => p.id === id)
    setPlans(ps => ps.map(p => p.id===id ? { ...p, ...form } : p))
    // Sync title change to linked task
    if (oldPlan?.taskId && form.title && form.title !== oldPlan.title) {
      const tasks = load('home_tasks', [])
      const updated = tasks.map(t => {
        if (t.id !== oldPlan.taskId) return t
        const prefix = t.text.startsWith('📅 ') ? '📅 ' : ''
        return { ...t, text: prefix + form.title }
      })
      save('home_tasks', updated)
      onDataChange?.()
    }
  }

  const handleDeletePlan = id => {
    const plan = plans.find(p => p.id === id)
    if (plan?.taskId) {
      setConfirmDelete({ planId: id, taskId: plan.taskId, planTitle: plan.title })
    } else {
      setPlans(ps => ps.filter(p => p.id !== id))
    }
  }

  const handleConfirmDelete = (alsoTask) => {
    if (!confirmDelete) return
    setPlans(ps => ps.filter(p => p.id !== confirmDelete.planId))
    if (alsoTask && confirmDelete.taskId) {
      const tasks = load('home_tasks', [])
      save('home_tasks', tasks.filter(t => t.id !== confirmDelete.taskId))
    }
    setConfirmDelete(null)
  }

  // ── Drag-to-reschedule ────────────────────────────────────────
  const handlePillDragStart = (e, type, item) => {
    e.stopPropagation()
    setDragPill({ type, item, originDate: type==='plan' ? item.date : item.due })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleCellDragOver = (e, ds) => {
    if (!dragPill) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(ds)
  }

  const handleCellDrop = (e, ds) => {
    e.preventDefault()
    if (!dragPill || dragPill.originDate === ds) { setDragPill(null); setDragOverDate(null); return }
    setDupModal({ type: dragPill.type, item: dragPill.item, newDate: ds, oldDate: dragPill.originDate })
    setDragPill(null)
    setDragOverDate(null)
  }

  const applyReschedule = (duplicate) => {
    if (!dupModal) return
    const { type, item, newDate, oldDate } = dupModal
    if (type === 'plan') {
      if (duplicate) {
        setPlans(ps => [...ps, { ...item, id: uid(), date: newDate, tasked: false, taskId: undefined }])
      } else {
        setPlans(ps => ps.map(p => p.id===item.id ? { ...p, date: newDate } : p))
        // Also update linked task due date
        if (item.taskId) {
          const tasks = load('home_tasks', [])
          save('home_tasks', tasks.map(t => t.id===item.taskId ? { ...t, due: newDate } : t))
        }
      }
    } else if (type === 'assignment') {
      // Update due date in terms_v1
      const terms = loadTerms()
      const updated = terms.map(term => ({
        ...term,
        courses: term.courses.map(c => ({
          ...c,
          assignments: c.assignments.map(a =>
            a.id === item.id
              ? duplicate ? null : { ...a, due: newDate }
              : a
          ).filter(Boolean)
        }))
      }))
      if (duplicate) {
        // Add a copy with new date to the correct course
        const active = terms.find(t=>t.active)||terms[0]
        const targetCourse = active?.courses.find(c=>c.name===item.courseName)
        if (targetCourse) {
          const finalTerms = updated.map(term => ({
            ...term,
            courses: term.courses.map(c =>
              c.id===targetCourse.id ? { ...c, assignments: [...c.assignments, { ...item, id: uid(), due: newDate, _type: undefined, courseName: undefined, courseColor: undefined, courseId: undefined }] } : c
            )
          }))
          saveTerms(finalTerms)
        }
      } else {
        saveTerms(updated)
      }
      onDataChange?.()
    }
    setDupModal(null)
  }

  // Add a calendar plan as a home task; marks the plan as tasked
  const handleAddPlanAsTask = (taskData, planId) => {
    const taskId  = Date.now()
    const tasks   = load('home_tasks', [])
    const newTask = { ...taskData, text: '📅 '+taskData.text, id: taskId, done: false, calendarPlanId: planId }
    save('home_tasks', [newTask, ...tasks])
    // Mark the plan as tasked and store taskId link
    if (planId) setPlans(ps => ps.map(p => p.id===planId ? {...p, tasked:true, taskId} : p))
    onDataChange?.()
  }

  const cellH = 115

  return (
    <>
      <div className="page-header" style={{flexWrap:'wrap',gap:10}}>
        <div>
          <div className="page-title">Calendar</div>
          <div className="page-subtitle">{MONTHS[month]} {year} — double-click a date to add</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button className="btn btn-ghost cal-today-btn" onClick={goToday} style={{fontSize:12}}>Today</button>
          <button className="btn-icon cal-nav-btn" onClick={prev} style={{padding:7}}><ChevronLeft size={16}/></button>
          <button className="btn-icon cal-nav-btn" onClick={next} style={{padding:7}}><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{padding:'0 32px 10px',display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <div style={{width:20,height:7,borderRadius:4,background:'var(--accent)',opacity:.85}}/> Assignment
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <div style={{width:20,height:4,borderRadius:4,background:'var(--accent)',opacity:.22}}/> Start → due range
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <span style={{fontSize:12}}>📅</span> Personal event
        </div>
        <div style={{fontSize:11,color:'var(--text-3)',marginLeft:'auto',opacity:.6}}>Double-click to edit events · double-click a date to add</div>
      </div>

      {/* Grid */}
      <div ref={calHaloRef} style={{margin:'0 24px 24px',background:'var(--glass-bg)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
        {/* Day headers */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'var(--glass-bg-2)',borderBottom:'1px solid var(--glass-border)'}}>
          {DAYS_S.map(d=>(
            <div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-3)',letterSpacing:'.05em'}}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {cells.map((day, i) => {
            if (!day) return (
              <div key={`pad-${i}`} style={{minHeight:cellH,borderRight:'1px solid var(--glass-border)',borderBottom:'1px solid var(--glass-border)',background:'var(--glass-bg)',opacity:.35}}/>
            )

            const ds      = day.toISOString().slice(0, 10)
            const isToday = ds === today
            const isPast  = ds < today
            const dues    = byDue[ds]   || []
            const starts  = byStart[ds] || []
            const ranges  = inRangeFor(ds)
            const dayPlan = plansFor(ds)

            return (
              <div key={ds} className="cal-day-cell"
                onClick={e=>{ const r=e.currentTarget.getBoundingClientRect(); setDayOverlay({ds,x:r.left,y:r.bottom+2}) }}
                onDoubleClick={e=>{ e.stopPropagation(); setAddModal(ds) }}
                onDragOver={e=>handleCellDragOver(e,ds)}
                onDragLeave={()=>setDragOverDate(null)}
                onDrop={e=>handleCellDrop(e,ds)}
                onMouseEnter={e=>{ if(!isToday&&!dragPill) e.currentTarget.style.background='var(--glass-bg-2)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background=isToday?'var(--accent-dim)':isPast?'rgba(0,0,0,.07)':'transparent' }}
                style={{
                  minHeight:cellH, maxHeight:200, overflowY:'auto',
                  borderRight:'1px solid var(--glass-border)', borderBottom:'1px solid var(--glass-border)',
                  padding:'6px 5px 5px', position:'relative',
                  background:dragOverDate===ds?'var(--accent-dim)':isToday?'var(--accent-dim)':isPast?'rgba(0,0,0,.07)':'transparent',
                  cursor:'pointer', transition:'background .1s',
                  outline: dragOverDate===ds ? '2px solid var(--accent)' : 'none',
                }}
              >
                {/* Day number */}
                <div className="cal-day-num"
                  style={{fontSize:12,fontWeight:isToday?800:500,lineHeight:1,marginBottom:4,color:isToday?'var(--accent)':isPast?'var(--text-3)':'var(--text-2)',display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                  {isToday && <div style={{width:5,height:5,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px var(--accent)'}}/>}
                  {day.getDate()}
                </div>

                {/* Range bars */}
                {ranges.map((a,ri)=>(
                  <div key={`r-${a.id}-${ri}`} style={{height:3,borderRadius:2,marginBottom:2,background:a.courseColor,opacity:.2}}/>
                ))}

                {/* Start markers */}
                {starts.map((a,si)=>(
                  <button key={`s-${a.id}-${si}`} onClick={e=>handleAssignClick(e,a)} style={{display:'flex',alignItems:'center',gap:3,width:'100%',border:'none',cursor:'pointer',padding:'1px 3px',background:`${a.courseColor}18`,borderRadius:3,marginBottom:2,borderLeft:`2px solid ${a.courseColor}55`}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:a.courseColor,opacity:.5,flexShrink:0}}/>
                    <span style={{fontSize:9,color:a.courseColor,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',opacity:.8}}>▶ {a.title}</span>
                  </button>
                ))}

                {/* Due pills */}
                {dues.map((a,di)=>{
                  const badge=PRIORITY_BADGE[a.priority||'none']
                  const isDone=a.status==='Done'
                  return (
                    <button key={`d-${a.id}-${di}`} className="cal-pill cal-pill-nomobile"
                      draggable={!isDone}
                      onDragStart={e=>handlePillDragStart(e,'assignment',a)}
                      onClick={e=>{e.stopPropagation();handleAssignClick(e,a)}} style={{display:'flex',alignItems:'center',gap:3,width:'100%',border:`2px solid rgba(0,0,0,${isDone?.15:.55})`,cursor:isDone?'default':'grab',padding:'2px 5px',borderRadius:4,marginBottom:2,background:isDone?`${a.courseColor}15`:`${a.courseColor}30`,borderLeft:`4px solid ${isDone?a.courseColor+'44':a.courseColor}`,boxShadow:isDone?'none':`0 1px 3px rgba(0,0,0,.25)`,opacity:isDone?.5:1,transition:'all .1s'}}
                      onMouseEnter={e=>{if(!isDone)e.currentTarget.style.background=`${a.courseColor}50`}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isDone?`${a.courseColor}15`:`${a.courseColor}30`}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:a.courseColor,flexShrink:0,boxShadow:`0 0 4px ${a.courseColor}`}}/>
                      <span style={{fontSize:9,fontWeight:700,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{a.title}</span>
                      {badge.color&&!isDone&&<div style={{width:4,height:4,borderRadius:'50%',background:badge.color,flexShrink:0}}/>}
                      {isDone&&<span style={{fontSize:8,color:'var(--green)',flexShrink:0}}>✓</span>}
                    </button>
                  )
                })}

                {/* Plan pills — click=popup, double-click=edit, X=delete */}
                {dayPlan.map((p,pi)=>(
                  <div key={`p-${p.id}-${pi}`}
                    draggable
                    onDragStart={e=>handlePillDragStart(e,'plan',p)}
                    style={{display:'flex',alignItems:'center',gap:2,marginBottom:2,borderRadius:4,background:`${p.color}25`,borderLeft:`3px solid ${p.color}`,transition:'all .1s',cursor:'grab'}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${p.color}40`}
                    onMouseLeave={e=>e.currentTarget.style.background=`${p.color}25`}
                  >
                    <button
                      onClick={e=>{ e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); setPlanPopup({plan:p,x:r.left+r.width/2,y:r.bottom}) }}
                      onDoubleClick={e=>{ e.stopPropagation(); setPlanPopup(null); setEditPlan(p) }}
                      style={{display:'flex',alignItems:'center',gap:3,flex:1,border:'none',cursor:'pointer',padding:'2px 5px',background:'transparent',borderRadius:4}}
                    >
                      <span style={{fontSize:9}}>☑️</span>
                      <span style={{fontSize:9,fontWeight:700,color:darkenColor(p.color),overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.title}</span>
                      {p.tasked && <span style={{fontSize:7,padding:'0 3px',borderRadius:3,background:`${p.color}44`,color:darkenColor(p.color),fontWeight:700,flexShrink:0}}>tasked</span>}
                    </button>
                    <button onClick={e=>{ e.stopPropagation(); handleDeletePlan(p.id) }}
                      style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',color:'var(--text-3)',display:'flex',flexShrink:0,borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--coral)'}
                      onMouseLeave={e=>e.currentTarget.style.color='var(--text-3)'}>
                      <X size={8}/>
                    </button>
                  </div>
                ))}


              </div>
            )
          })}
        </div>
      </div>

      {/* Assignment popup */}
      {popup && (
        <AssignmentPopup item={popup.item} anchor={{x:popup.x,y:popup.y}} onClose={()=>setPopup(null)} onJump={()=>handleJump(popup.item)}/>
      )}

      {/* Add modal */}
      {addModal && (
        <AddModal date={addModal} onClose={()=>setAddModal(null)} onSaveAssignment={handleSaveAssignment} onSavePlan={handleSavePlan}/>
      )}

      {/* Mobile day overlay */}
      {dayOverlay && (
        <DayOverlay
          ds={dayOverlay.ds}
          x={dayOverlay.x}
          y={dayOverlay.y}
          assignments={assignments}
          plans={plans}
          onClose={()=>setDayOverlay(null)}
          onAssignClick={a=>{ const r={left:window.innerWidth/2,bottom:window.innerHeight/2}; setPopup({item:a, x:r.left, y:r.bottom}) }}
          onPlanEdit={p=>setEditPlan(p)}
          onAdd={ds=>setAddModal(ds)}
        />
      )}

      {/* Plan popup — single click */}
      {planPopup && (
        <PlanPopup
          plan={planPopup.plan}
          anchor={{x:planPopup.x, y:planPopup.y}}
          onClose={()=>setPlanPopup(null)}
          onEdit={()=>setEditPlan(planPopup.plan)}
          onDelete={()=>handleDeletePlan(planPopup.plan.id)}
        />
      )}

      {/* Plan edit modal */}
      {editPlan && (
        <PlanEditModal
          plan={editPlan}
          onClose={()=>setEditPlan(null)}
          onSave={form=>handleUpdatePlan(editPlan.id,form)}
          onDelete={()=>handleDeletePlan(editPlan.id)}
          onAddAsTask={(taskData)=>handleAddPlanAsTask(taskData, editPlan.id)}
        />
      )}

      {/* Drag-to-reschedule: duplicate? modal */}
      {dupModal && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)'}}>
          <div className="card" style={{maxWidth:360,width:'100%',padding:24,textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:12}}>📋</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Moved to {new Date(dupModal.newDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginBottom:20,lineHeight:1.6}}>
              Do you want to <strong>duplicate</strong> "{dupModal.item.title||dupModal.item.title}" on the new date, or <strong>reschedule</strong> (move it)?
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>applyReschedule(true)}>
                📋 Duplicate — keep original + add copy
              </button>
              <button className="btn btn-primary" style={{justifyContent:'center'}} onClick={()=>applyReschedule(false)}>
                📅 Reschedule — move to new date
              </button>
              <button className="btn btn-ghost" style={{justifyContent:'center',color:'var(--text-3)'}} onClick={()=>setDupModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete plan confirm — when plan has a linked task */}
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)'}}>
          <div className="card" style={{maxWidth:360,width:'100%',padding:24,textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:12}}>🔗</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Linked task exists</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginBottom:20,lineHeight:1.6}}>
              "{confirmDelete.planTitle}" has a linked task in Today's Focus. Delete that too?
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="btn btn-primary" style={{justifyContent:'center'}} onClick={()=>handleConfirmDelete(true)}>
                Yes, delete both
              </button>
              <button className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>handleConfirmDelete(false)}>
                Delete plan only
              </button>
              <button className="btn btn-ghost" style={{justifyContent:'center',color:'var(--text-3)'}} onClick={()=>setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
