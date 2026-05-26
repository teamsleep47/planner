import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react'
import { loadTerms, saveTerms, uid, ASSIGNMENT_TYPES } from '../utils/termData.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import Tooltip from '../components/Tooltip.jsx'

const PRIORITY = [
  { key:'none',   label:'None',   color:'var(--text-3)',  bg:'transparent'          },
  { key:'low',    label:'Low',    color:'var(--green)',   bg:'var(--green-dim)'     },
  { key:'medium', label:'Medium', color:'var(--amber)',   bg:'var(--amber-dim)'     },
  { key:'high',   label:'High',   color:'var(--coral)',   bg:'var(--coral-dim)'     },
  { key:'urgent', label:'Urgent', color:'#ef4444',        bg:'rgba(239,68,68,.15)'  },
]
const STATUS_CFG = [
  { key:'To do',       color:'var(--text-3)',  bg:'var(--glass-bg-2)', dot:'var(--text-3)' },
  { key:'In progress', color:'var(--amber)',   bg:'var(--amber-dim)',  dot:'var(--amber)'  },
  { key:'Done',        color:'var(--green)',   bg:'var(--green-dim)',  dot:'var(--green)'  },
]
const COURSE_COLORS = ['#6366f1','#14b8a6','#f59e0b','#f43f5e','#22c55e','#8b5cf6','#06b6d4','#ec4899']
const BLANK_COURSE  = { name:'', instructor:'', days:'', time:'', room:'', credits:3, gradeTarget:90, color:COURSE_COLORS[0], notes:'' }
const BLANK_ASSIGN  = { title:'', type:'Essay', due:'', dueTime:'', startDate:'', status:'To do', priority:'none', notes:'', score:'', maxScore:'100', submissionType:'Canvas' }

function daysFromNow(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr+'T23:59:00') - new Date()) / 86400000)
}
function dueThisWeek(assignments) {
  return assignments.filter(a => {
    if (a.status==='Done'||!a.due) return false
    const d = daysFromNow(a.due)
    return d!==null && d>=0 && d<=7
  }).length
}
function calcGrade(assignments) {
  const graded = assignments.filter(a=>a.score!==''&&a.score!==undefined&&a.maxScore)
  if (!graded.length) return null
  const earned = graded.reduce((s,a)=>s+Number(a.score),0)
  const total  = graded.reduce((s,a)=>s+Number(a.maxScore||100),0)
  return total>0 ? Math.round((earned/total)*100) : null
}

// ── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(()=>{
    const h = e=>{ if(e.key==='Escape') onClose() }
    document.addEventListener('keydown',h)
    return ()=>document.removeEventListener('keydown',h)
  },[])
  return (
    <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)'}}/>
      <div className="card" style={{position:'relative',zIndex:1,width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--glass-border)'}}>
          <span style={{fontWeight:700,fontSize:15}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={16}/></button>
        </div>
        <div style={{padding:'18px'}}>{children}</div>
      </div>
    </div>
  )
}

// ── Assignment form ──────────────────────────────────────────────
function AssignmentForm({ form, onChange, onSave, onCancel }) {
  const inp = { padding:'9px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const row = { display:'flex', flexDirection:'column', gap:5, marginBottom:14 }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em' }
  const scorePct = form.score && form.maxScore ? Math.round((Number(form.score)/Number(form.maxScore))*100) : null
  const scoreColor = scorePct===null?'var(--text-3)':scorePct>=90?'var(--green)':scorePct>=70?'var(--amber)':'var(--coral)'

  return (
    <div>
      <div style={row}>
        <label style={lbl}>Title *</label>
        <input style={inp} value={form.title} onChange={e=>onChange({...form,title:e.target.value})} placeholder="Assignment title" autoFocus/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div style={row}>
          <label style={lbl}>Type</label>
          <select style={inp} value={form.type} onChange={e=>onChange({...form,type:e.target.value})}>
            {ASSIGNMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>Submission</label>
          <select style={inp} value={form.submissionType||'Canvas'} onChange={e=>onChange({...form,submissionType:e.target.value})}>
            {['Canvas','In class','Both','Email','Other'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div style={row}>
          <label style={lbl}>Start date <span style={{fontWeight:400,fontSize:10}}>(calendar bar)</span></label>
          <input type="date" style={inp} value={form.startDate||''} onChange={e=>onChange({...form,startDate:e.target.value})}/>
        </div>
        <div style={row}>
          <label style={lbl}>Due date *</label>
          <input type="date" style={inp} value={form.due||''} onChange={e=>onChange({...form,due:e.target.value})}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div style={row}>
          <label style={lbl}>Due time</label>
          <input type="time" style={inp} value={form.dueTime||''} onChange={e=>onChange({...form,dueTime:e.target.value})}/>
        </div>
        <div style={row}>
          <label style={lbl}>Status</label>
          <select style={inp} value={form.status} onChange={e=>onChange({...form,status:e.target.value})}>
            {STATUS_CFG.map(s=><option key={s.key} value={s.key}>{s.key}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={lbl}>Priority</label>
        <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
          {PRIORITY.map(p=>(
            <button key={p.key} onClick={()=>onChange({...form,priority:p.key})} style={{
              padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
              border:`1.5px solid ${form.priority===p.key?p.color:'var(--glass-border)'}`,
              background:form.priority===p.key?p.bg:'transparent',
              color:form.priority===p.key?p.color:'var(--text-3)',transition:'all .15s',
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={lbl}>Grade <span style={{fontWeight:400,fontSize:10}}>(fill after graded)</span></label>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
          <input type="number" min="0" style={{...inp,width:80,textAlign:'center'}} placeholder="Score" value={form.score||''} onChange={e=>onChange({...form,score:e.target.value})}/>
          <span style={{color:'var(--text-3)',fontSize:14}}>/</span>
          <input type="number" min="1" style={{...inp,width:80,textAlign:'center'}} placeholder="Out of" value={form.maxScore||100} onChange={e=>onChange({...form,maxScore:e.target.value})}/>
          {scorePct!==null&&<span style={{fontSize:13,fontWeight:700,color:scoreColor}}>{scorePct}%</span>}
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <label style={lbl}>Notes</label>
        <textarea style={{...inp,marginTop:6,resize:'vertical',lineHeight:1.6,minHeight:90,fontFamily:'var(--font-mono)'}}
          value={form.notes||''} onChange={e=>onChange({...form,notes:e.target.value})} placeholder="Requirements, reminders, links…"/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={onSave} disabled={!form.title?.trim()||!form.due}>
          Save assignment
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function Courses({ onDataChange }) {
  const [terms,        setTerms]        = useState(()=>loadTerms())
  const [activeTermId, setActiveTermId] = useState(()=>{ const t=loadTerms().find(t=>t.active); return t?.id||loadTerms()[0]?.id })
  const [openCourseId, setOpenCourseId] = useState(null)
  const [jumpAssignId, setJumpAssignId] = useState(null)

  const [showAddTerm,    setShowAddTerm]    = useState(false)
  const [newTermName,    setNewTermName]    = useState('')
  const [editTermId,     setEditTermId]     = useState(null)
  const [editTermName,   setEditTermName]   = useState('')

  const [showAddCourse,  setShowAddCourse]  = useState(false)
  const [newCourse,      setNewCourse]      = useState(BLANK_COURSE)
  const [editCourseId,   setEditCourseId]   = useState(null)
  const [editCourseForm, setEditCourseForm] = useState(BLANK_COURSE)

  const [addModal,  setAddModal]  = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [addForm,   setAddForm]   = useState(BLANK_ASSIGN)
  const [editForm,  setEditForm]  = useState(BLANK_ASSIGN)

  const [openNotes, setOpenNotes] = useState({})

  useEffect(()=>{ saveTerms(terms); onDataChange?.() },[terms])

  // Calendar jump
  useEffect(()=>{
    try {
      const raw = sessionStorage.getItem('planner_cal_jump')
      if (!raw) return
      sessionStorage.removeItem('planner_cal_jump')
      const { courseId, assignId } = JSON.parse(raw)
      if (!courseId||!assignId) return
      setOpenCourseId(courseId)
      setJumpAssignId(assignId)
      setTimeout(()=>{ const el=document.getElementById(`assign-${assignId}`); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}) },320)
    } catch(e){}
  },[])
  useEffect(()=>{ if(!jumpAssignId) return; const t=setTimeout(()=>setJumpAssignId(null),2500); return()=>clearTimeout(t) },[jumpAssignId])

  const updateTerms = fn => setTerms(ts=>fn([...ts]))

  // Term ops
  const addTerm = ()=>{ if(!newTermName.trim()) return; updateTerms(ts=>[...ts,{id:uid(),name:newTermName.trim(),active:false,courses:[]}]); setNewTermName(''); setShowAddTerm(false) }
  const deleteTerm = id=>{ if(!confirm('Delete this term and all its data?')) return; updateTerms(ts=>ts.filter(t=>t.id!==id)); if(activeTermId===id) setActiveTermId(terms.find(t=>t.id!==id)?.id) }
  const setActiveTerm = id=>{ setActiveTermId(id); updateTerms(ts=>ts.map(t=>({...t,active:t.id===id}))) }

  // Course ops
  const addCourse = ()=>{
    if(!newCourse.name.trim()) return
    const newId=uid()
    updateTerms(ts=>ts.map(t=>t.id!==activeTermId?t:{...t,courses:[...t.courses,{...newCourse,id:newId,assignments:[]}]}))
    setNewCourse(BLANK_COURSE); setShowAddCourse(false); setOpenCourseId(newId)
  }
  const deleteCourse=(termId,courseId)=>{ if(!confirm('Delete this course?')) return; updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.filter(c=>c.id!==courseId)})); if(openCourseId===courseId) setOpenCourseId(null) }
  const saveCourse=(termId,courseId)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,...editCourseForm})})); setEditCourseId(null) }
  const moveCourse=(termId,courseId,dir)=>{ updateTerms(ts=>ts.map(t=>{ if(t.id!==termId) return t; const cs=[...t.courses],idx=cs.findIndex(c=>c.id===courseId),to=idx+dir; if(to<0||to>=cs.length) return t; [cs[idx],cs[to]]=[cs[to],cs[idx]]; return{...t,courses:cs} })) }

  // Quick inline status/priority toggle (no modal needed for these)
  const patchAssign=(termId,courseId,assignId,patch)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:c.assignments.map(a=>a.id!==assignId?a:{...a,...patch})})})) }

  // Assignment ops
  const saveAdd=(termId,courseId)=>{ if(!addForm.title.trim()||!addForm.due) return; updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:[...c.assignments,{...addForm,id:uid()}]})})); setAddForm(BLANK_ASSIGN); setAddModal(null) }
  const saveEdit=()=>{ if(!editModal) return; const{termId,courseId,assignId}=editModal; patchAssign(termId,courseId,assignId,editForm); setEditModal(null) }
  const deleteAssign=(termId,courseId,assignId)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:c.assignments.filter(a=>a.id!==assignId)})})) }

  const openEdit=(a,termId,courseId)=>{
    setEditModal({termId,courseId,assignId:a.id})
    setEditForm({title:a.title,type:a.type||'Essay',due:a.due||'',dueTime:a.dueTime||'',startDate:a.startDate||'',status:a.status,priority:a.priority||'none',notes:a.notes||'',score:a.score||'',maxScore:a.maxScore||'100',submissionType:a.submissionType||'Canvas'})
  }

  const activeTerm = terms.find(t=>t.id===activeTermId)||terms[0]
  const inp = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Assignments</div><div className="page-subtitle">Double-click any row to edit</div></div>
        <button className="btn btn-primary" onClick={()=>setShowAddTerm(s=>!s)}><Plus size={14}/> Add term</button>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        {showAddTerm&&(
          <div className="card" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input style={{...inp,flex:1}} placeholder="Term name" value={newTermName} onChange={e=>setNewTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTerm()} autoFocus/>
            <button className="btn btn-primary" onClick={addTerm}>Add</button>
            <button className="btn btn-ghost" onClick={()=>setShowAddTerm(false)}>Cancel</button>
          </div>
        )}

        {/* Term tabs */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {terms.map(term=>(
            <div key={term.id} style={{display:'flex',alignItems:'center',gap:3}}>
              {editTermId===term.id?(
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input style={{...inp,width:160}} value={editTermName} onChange={e=>setEditTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(updateTerms(ts=>ts.map(t=>t.id===term.id?{...t,name:editTermName}:t)),setEditTermId(null))} autoFocus/>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>{updateTerms(ts=>ts.map(t=>t.id===term.id?{...t,name:editTermName}:t));setEditTermId(null)}}><Check size={11}/></button>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>setEditTermId(null)}><X size={11}/></button>
                </div>
              ):(
                <button onClick={()=>setActiveTerm(term.id)} style={{
                  padding:'7px 16px',borderRadius:'var(--radius-md)',
                  border:`1.5px solid ${activeTermId===term.id?'var(--accent)':'var(--glass-border)'}`,
                  background:activeTermId===term.id?'var(--accent)':'var(--glass-bg-2)',
                  color:activeTermId===term.id?'white':'var(--text-2)',
                  fontWeight:600,fontSize:13,cursor:'pointer',transition:'all .15s',
                  boxShadow:activeTermId===term.id?'0 0 12px var(--accent-glow)':'none',
                }}>
                  {term.name}{term.active&&<span style={{fontSize:9,marginLeft:5,opacity:.7}}>●</span>}
                </button>
              )}
              {activeTermId===term.id&&editTermId!==term.id&&(
                <div style={{display:'flex',gap:2}}>
                  <button className="btn-icon" style={{padding:3}} onClick={()=>{setEditTermId(term.id);setEditTermName(term.name)}}><Edit2 size={10}/></button>
                  <button className="btn-icon" style={{padding:3,color:'var(--coral)'}} onClick={()=>deleteTerm(term.id)}><Trash2 size={10}/></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {activeTerm&&(
          <>
            {/* Summary stats */}
            {activeTerm.courses.length>0&&(()=>{
              const allA=activeTerm.courses.flatMap(c=>c.assignments)
              const todo=allA.filter(a=>a.status==='To do').length
              const prog=allA.filter(a=>a.status==='In progress').length
              const done=allA.filter(a=>a.status==='Done').length
              const week=activeTerm.courses.reduce((s,c)=>s+dueThisWeek(c.assignments),0)
              return(
                <div className="grid-4">
                  <div className="stat-card"><div className="stat-label">To do</div><div className="stat-value" style={{color:'var(--text-2)',fontSize:24}}>{todo}</div></div>
                  <div className="stat-card"><div className="stat-label">In progress</div><div className="stat-value" style={{color:'var(--amber)',fontSize:24}}>{prog}</div></div>
                  <div className="stat-card"><div className="stat-label">Done</div><div className="stat-value" style={{color:'var(--green)',fontSize:24}}>{done}</div></div>
                  <div className="stat-card"><div className="stat-label">Due this week</div><div className="stat-value" style={{color:week>0?'var(--coral)':'var(--text-2)',fontSize:24}}>{week}</div></div>
                </div>
              )
            })()}

            {activeTerm.courses.map((course,courseIdx)=>{
              const isOpen    = openCourseId===course.id
              const doneCount = course.assignments.filter(a=>a.status==='Done').length
              const total     = course.assignments.length
              const weekCount = dueThisWeek(course.assignments)
              const grade     = calcGrade(course.assignments)
              const gradeColor= grade===null?'var(--text-3)':grade>=90?'var(--green)':grade>=70?'var(--amber)':'var(--coral)'

              const sorted = [...course.assignments].sort((a,b)=>{
                const aDone=a.status==='Done', bDone=b.status==='Done'
                if(aDone&&!bDone) return 1
                if(!aDone&&bDone) return -1
                if(!a.due&&!b.due) return 0
                if(!a.due) return 1
                if(!b.due) return -1
                return new Date(a.due)-new Date(b.due)
              })

              return (
                <div key={course.id} className="card" style={{padding:0,overflow:'hidden',borderLeft:`4px solid ${course.color}`}}>

                  {/* Course header */}
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',cursor:'pointer'}} onClick={()=>setOpenCourseId(isOpen?null:course.id)}>
                    <div style={{display:'flex',flexDirection:'column',gap:1,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button className="btn-icon" style={{padding:2,opacity:courseIdx===0?.3:1}} onClick={()=>moveCourse(activeTerm.id,course.id,-1)} disabled={courseIdx===0}><ArrowUp size={10}/></button>
                      <button className="btn-icon" style={{padding:2,opacity:courseIdx===activeTerm.courses.length-1?.3:1}} onClick={()=>moveCourse(activeTerm.id,course.id,1)} disabled={courseIdx===activeTerm.courses.length-1}><ArrowDown size={10}/></button>
                    </div>
                    <div style={{width:10,height:10,borderRadius:'50%',background:course.color,boxShadow:`0 0 6px ${course.color}`,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontWeight:700,fontSize:15}}>{course.name}</span>
                        {weekCount>0&&<span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:'var(--coral-dim)',color:'var(--coral)',fontWeight:700,border:'1px solid var(--coral)'}}>{weekCount} due this week</span>}
                        {grade!==null&&<span style={{fontSize:11,fontWeight:700,color:gradeColor}}>{grade}% earned</span>}
                      </div>
                      <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>
                        {[course.instructor,course.days,course.time,course.room].filter(Boolean).join(' · ')||'No details'}
                        {total>0&&<span style={{marginLeft:8}}>{doneCount}/{total} done</span>}
                      </div>
                    </div>
                    {grade!==null&&(
                      <div style={{width:60,flexShrink:0}}>
                        <div style={{height:4,background:'var(--glass-border)',borderRadius:2,marginBottom:2}}>
                          <div style={{height:'100%',width:`${Math.min(grade,100)}%`,background:gradeColor,borderRadius:2,transition:'width .4s'}}/>
                        </div>
                        <div style={{fontSize:9,color:'var(--text-3)',textAlign:'right'}}>target {course.gradeTarget}%</div>
                      </div>
                    )}
                    <div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <Tooltip text="Edit course"><button className="btn-icon" style={{padding:4}} onClick={()=>{setEditCourseId(course.id);setEditCourseForm({name:course.name,instructor:course.instructor||'',days:course.days||'',time:course.time||'',room:course.room||'',credits:course.credits||3,gradeTarget:course.gradeTarget||90,color:course.color,notes:course.notes||''})}}><Edit2 size={12}/></button></Tooltip>
                      <Tooltip text="Delete course"><button className="btn-icon" style={{padding:4,color:'var(--coral)'}} onClick={()=>deleteCourse(activeTerm.id,course.id)}><Trash2 size={12}/></button></Tooltip>
                      <Tooltip text="Add assignment"><button className="btn-icon" style={{padding:4,color:'var(--accent)'}} onClick={()=>{setAddForm(BLANK_ASSIGN);setAddModal(course.id)}}><Plus size={12}/></button></Tooltip>
                    </div>
                    {isOpen?<ChevronUp size={14} style={{color:'var(--text-3)',flexShrink:0}}/>:<ChevronDown size={14} style={{color:'var(--text-3)',flexShrink:0}}/>}
                  </div>

                  {total>0&&<div style={{height:2,background:'var(--glass-border)',margin:'0 16px'}}><div style={{height:'100%',background:course.color,width:`${(doneCount/total)*100}%`,borderRadius:2,transition:'width .4s'}}/></div>}

                  {/* Edit course form */}
                  {editCourseId===course.id&&(
                    <div style={{padding:'14px 16px',borderTop:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <input style={{...inp,gridColumn:'1/-1'}} placeholder="Course name" value={editCourseForm.name} onChange={e=>setEditCourseForm(f=>({...f,name:e.target.value}))}/>
                        <input style={inp} placeholder="Instructor" value={editCourseForm.instructor} onChange={e=>setEditCourseForm(f=>({...f,instructor:e.target.value}))}/>
                        <input style={inp} placeholder="Days" value={editCourseForm.days} onChange={e=>setEditCourseForm(f=>({...f,days:e.target.value}))}/>
                        <input style={inp} placeholder="Time" value={editCourseForm.time} onChange={e=>setEditCourseForm(f=>({...f,time:e.target.value}))}/>
                        <input style={inp} placeholder="Room" value={editCourseForm.room} onChange={e=>setEditCourseForm(f=>({...f,room:e.target.value}))}/>
                        <input style={inp} type="number" placeholder="Grade target %" value={editCourseForm.gradeTarget} onChange={e=>setEditCourseForm(f=>({...f,gradeTarget:Number(e.target.value)}))}/>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                        <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                        {COURSE_COLORS.map(c=><button key={c} onClick={()=>setEditCourseForm(f=>({...f,color:c}))} style={{width:20,height:20,borderRadius:'50%',background:c,border:`2px solid ${editCourseForm.color===c?'white':'transparent'}`,cursor:'pointer'}}/>)}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>saveCourse(activeTerm.id,course.id)}>Save</button>
                        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setEditCourseId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Assignments */}
                  {isOpen&&(
                    <div style={{borderTop:'1px solid var(--glass-border)'}}>
                      {sorted.length===0&&<div style={{padding:'24px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No assignments yet</div>}

                      {sorted.map(a=>{
                        const due     = formatRelativeDue(a.due,a.dueTime)
                        const isDone  = a.status==='Done'
                        const isJump  = a.id===jumpAssignId
                        const pri     = PRIORITY.find(p=>p.key===(a.priority||'none'))
                        const stCfg   = STATUS_CFG.find(s=>s.key===a.status)||STATUS_CFG[0]
                        const hasScore= a.score!==undefined&&a.score!==''&&a.maxScore
                        const scorePct= hasScore?Math.round((Number(a.score)/Number(a.maxScore))*100):null
                        const scoreColor=scorePct===null?'var(--text-3)':scorePct>=90?'var(--green)':scorePct>=70?'var(--amber)':'var(--coral)'
                        const startDays=a.startDate?daysFromNow(a.startDate):null
                        const showStartBadge=startDays!==null&&startDays>=0&&startDays<=3&&!isDone
                        const noteOpen=openNotes[a.id]

                        return (
                          <div key={a.id} id={`assign-${a.id}`} style={{
                            borderBottom:'1px solid var(--glass-border)',
                            background:isJump?`${course.color}18`:'transparent',
                            outline:isJump?`2px solid ${course.color}`:'none',
                            outlineOffset:'-2px',
                            transition:'background .3s',
                            cursor:'pointer',
                          }}
                            onDoubleClick={()=>openEdit(a,activeTerm.id,course.id)}
                          >
                            <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',flexWrap:'wrap'}}>

                              {/* Checkbox */}
                              <button onClick={e=>{e.stopPropagation();patchAssign(activeTerm.id,course.id,a.id,{status:isDone?'To do':'Done'})}} style={{
                                background:'none',border:'none',cursor:'pointer',padding:2,flexShrink:0,display:'flex',
                                color:isDone?'var(--green)':'var(--glass-border)',transition:'color .15s',
                              }}>
                                {isDone
                                  ?<div style={{width:18,height:18,borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={11} color="white"/></div>
                                  :<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--glass-border)'}}/>
                                }
                              </button>

                              {/* Title + meta */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                                  <span style={{fontWeight:600,fontSize:13,color:isDone?'var(--text-3)':'var(--text-1)',textDecoration:isDone?'line-through':'none'}}>
                                    {a.title}
                                  </span>
                                  {a.type&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'var(--glass-bg-2)',color:'var(--text-3)',border:'1px solid var(--glass-border)'}}>{a.type}</span>}
                                  {showStartBadge&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'var(--amber-dim)',color:'var(--amber)',fontWeight:700}}>▶ Start {startDays===0?'today':`in ${startDays}d`}</span>}
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                  {due&&<span style={{fontSize:11,fontWeight:700,color:isDone?'var(--text-3)':due.color}}>{due.label}</span>}
                                  {a.startDate&&!isDone&&<span style={{fontSize:10,color:'var(--text-3)'}}>Start {new Date(a.startDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}
                                  {hasScore&&<span style={{fontSize:11,fontWeight:700,color:scoreColor}}>{a.score}/{a.maxScore} = {scorePct}%</span>}
                                </div>
                              </div>

                              {/* Desktop pills — priority + status inline */}
                              <div className="desktop-only" style={{display:'flex',gap:4,flexShrink:0,flexWrap:'wrap'}}>
                                {pri&&pri.key!=='none'&&(
                                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:pri.bg,color:pri.color,fontWeight:700,border:`1px solid ${pri.color}55`}}>
                                    {pri.label}
                                  </span>
                                )}
                                <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:stCfg.bg,color:stCfg.color,fontWeight:700,border:`1px solid ${stCfg.dot}55`}}>
                                  {a.status}
                                </span>
                              </div>

                              {/* Delete */}
                              <Tooltip text="Delete">
                                <button className="btn-icon" style={{padding:5,color:'var(--coral)',flexShrink:0}} onClick={e=>{e.stopPropagation();deleteAssign(activeTerm.id,course.id,a.id)}}><Trash2 size={12}/></button>
                              </Tooltip>
                            </div>

                            {/* Notes collapsed */}
                            {a.notes&&(
                              <div style={{padding:'0 14px 10px 42px'}}>
                                <button onClick={e=>{e.stopPropagation();setOpenNotes(n=>({...n,[a.id]:!n[a.id]}))}} style={{background:'none',border:'none',cursor:'pointer',padding:'3px 0',fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4}}>
                                  {noteOpen?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                                  {noteOpen?'Hide notes':'Show notes'}
                                </button>
                                {noteOpen&&(
                                  <div style={{marginTop:6,fontSize:12,color:'var(--text-2)',lineHeight:1.7,background:'var(--glass-bg)',borderRadius:6,padding:'9px 11px',fontFamily:'var(--font-mono)',whiteSpace:'pre-wrap'}}>
                                    {a.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <div style={{padding:'12px 14px'}}>
                        <button className="btn btn-ghost" style={{gap:6,width:'100%',justifyContent:'center',fontSize:12}} onClick={()=>{setAddForm(BLANK_ASSIGN);setAddModal(course.id)}}>
                          <Plus size={12}/> Add assignment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add course */}
            {showAddCourse?(
              <div className="card">
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>New course</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <input style={{...inp,gridColumn:'1/-1'}} placeholder="Course name *" value={newCourse.name} onChange={e=>setNewCourse(f=>({...f,name:e.target.value}))} autoFocus/>
                  <input style={inp} placeholder="Instructor" value={newCourse.instructor} onChange={e=>setNewCourse(f=>({...f,instructor:e.target.value}))}/>
                  <input style={inp} placeholder="Days" value={newCourse.days} onChange={e=>setNewCourse(f=>({...f,days:e.target.value}))}/>
                  <input style={inp} placeholder="Time" value={newCourse.time} onChange={e=>setNewCourse(f=>({...f,time:e.target.value}))}/>
                  <input style={inp} placeholder="Room" value={newCourse.room} onChange={e=>setNewCourse(f=>({...f,room:e.target.value}))}/>
                  <input style={inp} type="number" placeholder="Grade target %" value={newCourse.gradeTarget} onChange={e=>setNewCourse(f=>({...f,gradeTarget:Number(e.target.value)}))}/>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                  {COURSE_COLORS.map(c=><button key={c} onClick={()=>setNewCourse(f=>({...f,color:c}))} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${newCourse.color===c?'white':'transparent'}`,cursor:'pointer'}}/>)}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary" onClick={addCourse} style={{flex:1}}>Add course</button>
                  <button className="btn btn-ghost" onClick={()=>setShowAddCourse(false)}>Cancel</button>
                </div>
              </div>
            ):(
              <button className="btn btn-ghost" style={{gap:8,alignSelf:'flex-start'}} onClick={()=>setShowAddCourse(true)}>
                <Plus size={14}/> Add course
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {addModal&&(
        <Modal title="New assignment" onClose={()=>setAddModal(null)}>
          <AssignmentForm form={addForm} onChange={setAddForm} onSave={()=>saveAdd(activeTerm.id,addModal)} onCancel={()=>setAddModal(null)}/>
        </Modal>
      )}
      {editModal&&(
        <Modal title="Edit assignment" onClose={()=>setEditModal(null)}>
          <AssignmentForm form={editForm} onChange={setEditForm} onSave={saveEdit} onCancel={()=>setEditModal(null)}/>
        </Modal>
      )}
    </>
  )
}
