import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, ExternalLink, Plus } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { useNavigate } from 'react-router-dom'
import { loadTerms, saveTerms, uid, ASSIGNMENT_TYPES } from '../utils/termData.js'
import { formatRelativeDue } from '../utils/timeFormat.js'

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_S  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const PLAN_COLORS = ['#6366f1','#14b8a6','#f59e0b','#f43f5e','#22c55e','#8b5cf6','#06b6d4','#ec4899']

const PRIORITY_BADGE = {
  urgent: { label:'🔴 Urgent', color:'#ef4444' },
  high:   { label:'🟠 High',   color:'#f97316' },
  medium: { label:'🟡 Medium', color:'#f59e0b' },
  low:    { label:'🟢 Low',    color:'#22c55e' },
  none:   { label:'',          color:null       },
}

// ── Read assignments from active term ────────────────────────────
function getAllAssignments() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (!active) return []
    return active.courses.flatMap(c =>
      c.assignments.map(a => ({
        ...a,
        courseName:  c.name,
        courseColor: c.color,
        courseId:    c.id,
        _type:       'assignment',
      }))
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

// ── Popup preview ────────────────────────────────────────────────
function Popup({ item, anchor, onClose, onJump }) {
  const due   = item.due ? formatRelativeDue(item.due, item.dueTime) : null
  const badge = PRIORITY_BADGE[item.priority || 'none']

  const style = {
    position: 'fixed',
    zIndex: 1000,
    top:  Math.min(anchor.y + 8, window.innerHeight - 300),
    left: Math.min(Math.max(anchor.x - 150, 8), window.innerWidth - 320),
    width: 300,
  }

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:999}} onClick={onClose}/>
      <div className="card" style={{
        ...style, padding:0, overflow:'hidden',
        border: `2px solid ${item.color || item.courseColor || 'var(--accent)'}`,
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          background: `${item.color || item.courseColor}22`,
          borderBottom: `1px solid ${item.color || item.courseColor}44`,
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{
            width:10, height:10, borderRadius:'50%',
            background: item.color || item.courseColor,
            boxShadow: `0 0 8px ${item.color || item.courseColor}`,
            flexShrink:0, marginTop:3,
          }}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:3}}>{item.title}</div>
            <div style={{fontSize:11,color:item.color||item.courseColor,fontWeight:600}}>
              {item._type === 'assignment' ? item.courseName : '📅 Plan'}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,flexShrink:0}}>
            <X size={14}/>
          </button>
        </div>

        {/* Body */}
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
          {due && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,color:'var(--text-3)',width:44}}>Due</span>
              <span style={{fontSize:13,fontWeight:700,color:due.color}}>{due.label}</span>
            </div>
          )}
          {item.startDate && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,color:'var(--text-3)',width:44}}>Start</span>
              <span style={{fontSize:12,color:'var(--text-2)'}}>
                {new Date(item.startDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              </span>
            </div>
          )}
          {item.type && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,color:'var(--text-3)',width:44}}>Type</span>
              <span style={{fontSize:12,color:'var(--text-2)'}}>{item.type}</span>
            </div>
          )}
          {badge.label && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,color:'var(--text-3)',width:44}}>Priority</span>
              <span style={{fontSize:12,color:badge.color,fontWeight:600}}>{badge.label}</span>
            </div>
          )}
          {item.notes && (
            <div style={{
              fontSize:11,color:'var(--text-3)',lineHeight:1.5,
              background:'var(--glass-bg)',borderRadius:6,padding:'7px 9px',
              maxHeight:60,overflow:'hidden',
              WebkitMaskImage:'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}>
              {item.notes}
            </div>
          )}
        </div>

        {item._type === 'assignment' && (
          <div style={{padding:'0 14px 14px'}}>
            <button onClick={onJump} className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',gap:6,fontSize:13}}>
              <ExternalLink size={13}/> Open in Assignments
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Add modal — step 1: pick type, step 2: fill form ────────────
function AddModal({ date, onClose, onSaveAssignment, onSavePlan }) {
  const courses = getActiveCourses()
  const [step,     setStep]     = useState('pick')   // pick | assignment | plan
  const [course,   setCourse]   = useState(null)
  const [aForm,    setAForm]    = useState({
    title:'', type:'Essay', due: date, dueTime:'', startDate:'',
    status:'To do', priority:'none', notes:'', score:'', maxScore:'100', submissionType:'Canvas',
  })
  const [pForm,    setPForm]    = useState({
    title:'', date, notes:'', color: PLAN_COLORS[0],
  })

  const inp = { padding:'9px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5, display:'block' }
  const row = { marginBottom:14 }

  return (
    <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)'}}/>
      <div className="card" style={{position:'relative',zIndex:1,width:'100%',maxWidth:500,maxHeight:'90vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--glass-border)'}}>
          <span style={{fontWeight:700,fontSize:15}}>
            {step==='pick' ? `Add to ${new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})}` :
             step==='assignment' ? `New assignment — ${course?.name}` : 'New plan'}
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={16}/></button>
        </div>

        <div style={{padding:18}}>
          {/* Step 1: pick type */}
          {step === 'pick' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{fontSize:13,color:'var(--text-2)',marginBottom:6}}>What are you adding?</div>

              {/* Assignment: course quick-pick */}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Assignment</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
                  {courses.map(c => (
                    <button key={c.id} onClick={()=>{ setCourse(c); setAForm(f=>({...f,due:date})); setStep('assignment') }} style={{
                      padding:'12px 14px', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'left',
                      background:`${c.color}18`, border:`2px solid ${c.color}55`,
                      transition:'all .15s',
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.border=`2px solid ${c.color}`;e.currentTarget.style.background=`${c.color}28`}}
                      onMouseLeave={e=>{e.currentTarget.style.border=`2px solid ${c.color}55`;e.currentTarget.style.background=`${c.color}18`}}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:c.color,boxShadow:`0 0 6px ${c.color}`,flexShrink:0}}/>
                        <span style={{fontWeight:700,fontSize:12,color:'var(--text-1)'}}>{c.name}</span>
                      </div>
                      <div style={{fontSize:10,color:'var(--text-3)'}}>{c.assignments?.length||0} assignments</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{borderTop:'1px solid var(--glass-border)',paddingTop:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Plan / Study block</div>
                <button onClick={()=>setStep('plan')} style={{
                  width:'100%',padding:'12px 14px',borderRadius:'var(--radius-md)',cursor:'pointer',textAlign:'left',
                  background:'var(--glass-bg-2)',border:'2px solid var(--glass-border)',transition:'all .15s',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.border='2px solid var(--accent)'}}
                  onMouseLeave={e=>{e.currentTarget.style.border='2px solid var(--glass-border)'}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>📅 Add a plan</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>Study session, appointment, reminder, or any custom event</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2a: assignment form */}
          {step === 'assignment' && course && (
            <div>
              <div style={row}>
                <label style={lbl}>Title *</label>
                <input style={inp} value={aForm.title} onChange={e=>setAForm(f=>({...f,title:e.target.value}))} placeholder="Assignment title" autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={lbl}>Type</label>
                  <select style={inp} value={aForm.type} onChange={e=>setAForm(f=>({...f,type:e.target.value}))}>
                    {ASSIGNMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Submission</label>
                  <select style={inp} value={aForm.submissionType} onChange={e=>setAForm(f=>({...f,submissionType:e.target.value}))}>
                    {['Canvas','In class','Both','Email','Other'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={lbl}>Start date</label>
                  <input type="date" style={inp} value={aForm.startDate} onChange={e=>setAForm(f=>({...f,startDate:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>Due date *</label>
                  <input type="date" style={inp} value={aForm.due} onChange={e=>setAForm(f=>({...f,due:e.target.value}))}/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Priority</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {['none','low','medium','high','urgent'].map(p=>(
                    <button key={p} onClick={()=>setAForm(f=>({...f,priority:p}))} style={{
                      padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
                      border:`1.5px solid ${aForm.priority===p?'var(--accent)':'var(--glass-border)'}`,
                      background:aForm.priority===p?'var(--accent-dim)':'transparent',
                      color:aForm.priority===p?'var(--accent)':'var(--text-3)',
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={lbl}>Notes</label>
                <textarea style={{...inp,minHeight:70,resize:'vertical',lineHeight:1.6,fontFamily:'var(--font-mono)'}}
                  value={aForm.notes} onChange={e=>setAForm(f=>({...f,notes:e.target.value}))} placeholder="Requirements, reminders…"/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setStep('pick')} style={{fontSize:12}}>← Back</button>
                <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}}
                  onClick={()=>{ if(!aForm.title.trim()||!aForm.due) return; onSaveAssignment(course, aForm); onClose() }}
                  disabled={!aForm.title.trim()||!aForm.due}>
                  Add assignment
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: plan form */}
          {step === 'plan' && (
            <div>
              <div style={row}>
                <label style={lbl}>Title *</label>
                <input style={inp} value={pForm.title} onChange={e=>setPForm(f=>({...f,title:e.target.value}))} placeholder="Study session, appointment…" autoFocus/>
              </div>
              <div style={row}>
                <label style={lbl}>Date *</label>
                <input type="date" style={inp} value={pForm.date} onChange={e=>setPForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Color</label>
                <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                  {PLAN_COLORS.map(c=>(
                    <button key={c} onClick={()=>setPForm(f=>({...f,color:c}))} style={{
                      width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',
                      border:`3px solid ${pForm.color===c?'white':'transparent'}`,
                      boxShadow:pForm.color===c?`0 0 8px ${c}`:'none',
                    }}/>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={lbl}>Notes</label>
                <textarea style={{...inp,minHeight:70,resize:'vertical',lineHeight:1.6,fontFamily:'var(--font-mono)'}}
                  value={pForm.notes} onChange={e=>setPForm(f=>({...f,notes:e.target.value}))} placeholder="What are you planning to do?"/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setStep('pick')} style={{fontSize:12}}>← Back</button>
                <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}}
                  onClick={()=>{ if(!pForm.title.trim()||!pForm.date) return; onSavePlan(pForm); onClose() }}
                  disabled={!pForm.title.trim()||!pForm.date}>
                  Add plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main calendar ────────────────────────────────────────────────
export default function CalendarPage({ onDataChange }) {
  const navigate    = useNavigate()
  const [anchor,    setAnchor]    = useState(new Date())
  const [popup,     setPopup]     = useState(null)
  const [addModal,  setAddModal]  = useState(null)   // date string
  const [plans,     setPlans]     = useState(() => load('calendar_plans', []))

  const assignments = getAllAssignments()

  useEffect(() => { save('calendar_plans', plans); onDataChange?.() }, [plans])

  const today = new Date().toISOString().slice(0,10)
  const year  = anchor.getFullYear()
  const month = anchor.getMonth()

  const prev    = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n })
  const next    = () => setAnchor(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n })
  const goToday = () => setAnchor(new Date())

  // Build calendar grid
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

  const inRangeFor = (ds) => assignments.filter(a => a.startDate && a.due && ds > a.startDate && ds < a.due)
  const plansFor   = (ds) => plans.filter(p => p.date === ds)

  const handleDotClick = (e, item) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopup({ item, x: rect.left + rect.width/2, y: rect.bottom })
  }

  const handleJump = (item) => {
    sessionStorage.setItem('planner_cal_jump', JSON.stringify({ courseId: item.courseId, assignId: item.id }))
    setPopup(null)
    navigate('/courses')
  }

  // Save assignment into terms_v1
  const handleSaveAssignment = (course, form) => {
    const terms  = loadTerms()
    const active = terms.find(t=>t.active)||terms[0]
    if (!active) return
    const newTerms = terms.map(t => t.id!==active.id ? t : {
      ...t, courses: t.courses.map(c => c.id!==course.id ? c : {
        ...c, assignments: [...c.assignments, { ...form, id: uid() }]
      })
    })
    saveTerms(newTerms)
    onDataChange?.()
  }

  const handleSavePlan = (form) => {
    setPlans(ps => [...ps, { ...form, id: uid(), _type: 'plan' }])
  }

  const handleDeletePlan = (id) => {
    setPlans(ps => ps.filter(p => p.id !== id))
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
          <button className="btn btn-ghost" onClick={goToday} style={{fontSize:12}}>Today</button>
          <button className="btn-icon" onClick={prev} style={{padding:7}}><ChevronLeft size={14}/></button>
          <button className="btn-icon" onClick={next} style={{padding:7}}><ChevronRight size={14}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{padding:'0 32px 10px',display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <div style={{width:24,height:7,borderRadius:4,background:'var(--accent)',opacity:.85}}/>
          Assignment due
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <div style={{width:24,height:4,borderRadius:4,background:'var(--accent)',opacity:.22}}/>
          Start → due range
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)'}}>
          <div style={{width:8,height:8,borderRadius:2,background:'var(--amber)',opacity:.8}}/>
          Plan / study block
        </div>
      </div>

      {/* Grid */}
      <div style={{margin:'0 24px 24px',background:'var(--glass-bg)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
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

            const ds      = day.toISOString().slice(0,10)
            const isToday = ds === today
            const isPast  = ds < today
            const dues    = byDue[ds]    || []
            const starts  = byStart[ds]  || []
            const ranges  = inRangeFor(ds)
            const dayPlan = plansFor(ds)

            return (
              <div key={ds}
                style={{
                  minHeight: cellH,
                  borderRight:'1px solid var(--glass-border)',
                  borderBottom:'1px solid var(--glass-border)',
                  padding:'6px 5px 5px',
                  position:'relative',
                  background: isToday?'var(--accent-dim)':isPast?'rgba(0,0,0,0.07)':'transparent',
                  cursor:'default',
                  transition:'background .1s',
                }}
                onDoubleClick={() => setAddModal(ds)}
                onMouseEnter={e=>{ if(!isToday) e.currentTarget.style.background='var(--glass-bg-2)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background = isToday?'var(--accent-dim)':isPast?'rgba(0,0,0,0.07)':'transparent' }}
              >
                {/* Day number */}
                <div style={{
                  fontSize:12,fontWeight:isToday?800:500,lineHeight:1,marginBottom:4,
                  color:isToday?'var(--accent)':isPast?'var(--text-3)':'var(--text-2)',
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  {isToday && <div style={{width:5,height:5,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px var(--accent)'}}/>}
                  {day.getDate()}
                </div>

                {/* Range bars */}
                {ranges.map((a,ri) => (
                  <div key={`r-${a.id}-${ri}`} style={{height:3,borderRadius:2,marginBottom:2,background:a.courseColor,opacity:.2}}/>
                ))}

                {/* Start markers */}
                {starts.slice(0,1).map((a,si) => (
                  <button key={`s-${a.id}-${si}`} onClick={e=>handleDotClick(e,a)} style={{
                    display:'flex',alignItems:'center',gap:3,width:'100%',border:'none',cursor:'pointer',
                    padding:'1px 3px',background:`${a.courseColor}18`,borderRadius:3,marginBottom:2,
                    borderLeft:`2px solid ${a.courseColor}55`,
                  }}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:a.courseColor,opacity:.5,flexShrink:0}}/>
                    <span style={{fontSize:9,color:a.courseColor,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',opacity:.8}}>
                      ▶ {a.title}
                    </span>
                  </button>
                ))}

                {/* Due pills */}
                {dues.slice(0,2).map((a,di) => {
                  const badge  = PRIORITY_BADGE[a.priority||'none']
                  const isDone = a.status==='Done'
                  return (
                    <button key={`d-${a.id}-${di}`} onClick={e=>handleDotClick(e,a)} style={{
                      display:'flex',alignItems:'center',gap:3,width:'100%',border:'none',cursor:'pointer',
                      padding:'2px 5px',borderRadius:4,marginBottom:2,
                      background:isDone?`${a.courseColor}15`:`${a.courseColor}30`,
                      borderLeft:`3px solid ${isDone?a.courseColor+'44':a.courseColor}`,
                      opacity:isDone?.5:1,transition:'all .1s',
                    }}
                      onMouseEnter={e=>{if(!isDone)e.currentTarget.style.background=`${a.courseColor}50`}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isDone?`${a.courseColor}15`:`${a.courseColor}30`}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:a.courseColor,flexShrink:0,boxShadow:`0 0 4px ${a.courseColor}`}}/>
                      <span style={{fontSize:9,fontWeight:700,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                        {a.title}
                      </span>
                      {badge.color && !isDone && <div style={{width:4,height:4,borderRadius:'50%',background:badge.color,flexShrink:0}}/>}
                      {isDone && <span style={{fontSize:8,color:'var(--green)',flexShrink:0}}>✓</span>}
                    </button>
                  )
                })}

                {/* Plan pills */}
                {dayPlan.slice(0,1).map((p,pi) => (
                  <button key={`p-${p.id}-${pi}`} onClick={e=>handleDotClick(e,{...p,color:p.color,_type:'plan'})} style={{
                    display:'flex',alignItems:'center',gap:3,width:'100%',border:'none',cursor:'pointer',
                    padding:'2px 5px',borderRadius:4,marginBottom:2,
                    background:`${p.color}25`,borderLeft:`3px solid ${p.color}`,
                    transition:'all .1s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${p.color}40`}
                    onMouseLeave={e=>e.currentTarget.style.background=`${p.color}25`}>
                    <span style={{fontSize:9}}>📅</span>
                    <span style={{fontSize:9,fontWeight:700,color:p.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                      {p.title}
                    </span>
                  </button>
                ))}

                {/* Overflow */}
                {(dues.length + starts.length + dayPlan.length) > 3 && (
                  <div style={{fontSize:9,color:'var(--text-3)',paddingLeft:4}}>
                    +{dues.length + starts.length + dayPlan.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Popup */}
      {popup && (
        <Popup
          item={popup.item}
          anchor={{ x: popup.x, y: popup.y }}
          onClose={() => setPopup(null)}
          onJump={() => handleJump(popup.item)}
        />
      )}

      {/* Add modal */}
      {addModal && (
        <AddModal
          date={addModal}
          onClose={() => setAddModal(null)}
          onSaveAssignment={handleSaveAssignment}
          onSavePlan={handleSavePlan}
        />
      )}
    </>
  )
}
