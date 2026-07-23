import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react'
import { loadTerms, saveTerms, uid, ASSIGNMENT_TYPES, getCourseColorMap } from '../utils/termData.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const openUrl = (raw) => {
  if (!raw) return
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const PRIORITY = [
  { key:'none',   label:'—',      color:'var(--text-3)',  bg:'var(--glass-bg-2)' },
  { key:'low',    label:'Low',    color:'var(--green)',   bg:'var(--green-dim)'  },
  { key:'medium', label:'Medium', color:'var(--amber)',   bg:'var(--amber-dim)'  },
  { key:'high',   label:'High',   color:'var(--coral)',   bg:'var(--coral-dim)'  },
  { key:'urgent', label:'Urgent', color:'#ef4444',        bg:'rgba(239,68,68,.15)'},
]
const STATUS = [
  { key:'To do',       color:'var(--text-3)',  bg:'var(--glass-bg-2)' },
  { key:'In progress', color:'var(--amber)',   bg:'var(--amber-dim)'  },
  { key:'Done',        color:'var(--green)',   bg:'var(--green-dim)'  },
]
const COURSE_COLORS = ['#6366f1','#14b8a6','#f59e0b','#f43f5e','#22c55e','#8b5cf6','#06b6d4','#ec4899']
const BLANK_COURSE  = { name:'', instructor:'', days:'', time:'', room:'', credits:3, gradeTarget:90, color:COURSE_COLORS[0], notes:'' }
const BLANK_ASSIGN  = { title:'', type:ASSIGNMENT_TYPES[0], due:'', dueTime:'', startDate:'', status:'To do', priority:'none', notes:'', score:'', maxScore:'100', submissionType:'Canvas', url:'' }

const ACCORDION_KEY = 'courses_accordion_state'

export default function Courses({ onDataChange }) {
  const [terms,        setTerms]        = useState(()=>loadTerms())
  const [activeTermId, setActiveTermId] = useState(()=>{ const t=loadTerms().find(t=>t.active); return t?.id||loadTerms()[0]?.id })
  // Accordion state: { courseId: bool } — persisted to localStorage
  const [expanded, setExpanded] = useState(()=>load(ACCORDION_KEY,{}))

  const [showAddTerm,    setShowAddTerm]    = useState(false)
  const [newTermName,    setNewTermName]    = useState('')
  const [editTermId,     setEditTermId]     = useState(null)
  const [editTermName,   setEditTermName]   = useState('')
  const [showAddCourse,  setShowAddCourse]  = useState(null)
  const [newCourse,      setNewCourse]      = useState(BLANK_COURSE)
  const [editCourseId,   setEditCourseId]   = useState(null)
  const [editCourseForm, setEditCourseForm] = useState(BLANK_COURSE)
  const [showAddAssign,  setShowAddAssign]  = useState(null)
  const [newAssign,      setNewAssign]      = useState(BLANK_ASSIGN)
  const [editAssignId,   setEditAssignId]   = useState(null)
  const [editAssign,     setEditAssign]     = useState({})
  const [jumpAssignId,   setJumpAssignId]   = useState(null)
  const [openNotes,      setOpenNotes]      = useState({})
  const [deleteTarget,   setDeleteTarget]   = useState(null)

  // Persist accordion state whenever it changes
  useEffect(()=>{ save(ACCORDION_KEY, expanded) },[expanded])
  useEffect(()=>{ saveTerms(terms); onDataChange?.(); window.dispatchEvent(new Event('assignments-updated')) },[terms])
  useEffect(() => {
    const h = () => {
      const t = loadTerms()
      setTerms(t)
      const active = t.find(x => x.active)
      setActiveTermId(active?.id || t[0]?.id)
    }
    window.addEventListener('drive-loaded', h)
    return () => window.removeEventListener('drive-loaded', h)
  }, [])

  // Calendar jump
  useEffect(()=>{
    try{
      const raw=sessionStorage.getItem('planner_cal_jump')
      if(!raw)return
      sessionStorage.removeItem('planner_cal_jump')
      const{courseId,assignId}=JSON.parse(raw)
      if(!courseId||!assignId)return
      setExpanded(e=>({...e,[courseId]:true}))
      setJumpAssignId(assignId)
      setTimeout(()=>{ const el=document.getElementById(`assign-${assignId}`); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}) },350)
    }catch(e){}
  },[])
  useEffect(()=>{ if(!jumpAssignId)return; const t=setTimeout(()=>setJumpAssignId(null),2500); return()=>clearTimeout(t) },[jumpAssignId])

  const toggleExpanded = (courseId) => setExpanded(e=>({...e,[courseId]:!e[courseId]}))
  const isExpanded     = (courseId) => expanded[courseId] !== false // default open

  const updateTerms = fn => setTerms(ts=>fn([...ts]))
  const activeTerm  = terms.find(t=>t.id===activeTermId)||terms[0]

  // Term ops
  const addTerm    = ()=>{ if(!newTermName.trim())return; updateTerms(ts=>[...ts,{id:uid(),name:newTermName.trim(),active:false,courses:[]}]); setNewTermName(''); setShowAddTerm(false) }
  const deleteTerm = id=>{ if(!confirm('Delete this term?'))return; updateTerms(ts=>ts.filter(t=>t.id!==id)); if(activeTermId===id) setActiveTermId(terms.find(t=>t.id!==id)?.id) }
  const setActiveTerm=id=>{ setActiveTermId(id); updateTerms(ts=>ts.map(t=>({...t,active:t.id===id}))) }
  const saveTermName=id=>{ updateTerms(ts=>ts.map(t=>t.id===id?{...t,name:editTermName}:t)); setEditTermId(null) }

  // Course ops
  const addCourse  =(termId)=>{ if(!newCourse.name.trim())return; const nid=uid(); updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:[...t.courses,{...newCourse,id:nid,assignments:[]}]})); setNewCourse(BLANK_COURSE); setShowAddCourse(null); setExpanded(e=>({...e,[nid]:true})) }
  const deleteCourse=(termId,courseId)=>{ if(!confirm('Delete this course?'))return; updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.filter(c=>c.id!==courseId)})) }
  const saveCourse =(termId,courseId)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,...editCourseForm})})); setEditCourseId(null) }

  // Assignment ops
  const addAssign=(termId,courseId)=>{ if(!newAssign.title.trim()||!newAssign.due)return; updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:[...c.assignments,{...newAssign,id:uid()}]})})); setNewAssign(BLANK_ASSIGN); setShowAddAssign(null) }
  const saveAssign=(termId,courseId,assignId)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:c.assignments.map(a=>a.id!==assignId?a:{...a,...editAssign})})})); setEditAssignId(null) }
  const deleteAssign=(termId,courseId,assignId)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:c.assignments.filter(a=>a.id!==assignId)})})) }
  const patchAssign=(termId,courseId,assignId,patch)=>{ updateTerms(ts=>ts.map(t=>t.id!==termId?t:{...t,courses:t.courses.map(c=>c.id!==courseId?c:{...c,assignments:c.assignments.map(a=>a.id!==assignId?a:{...a,...patch})})})) }

  const inp={padding:'8px 11px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-md)',color:'var(--text-1)',fontSize:13,fontFamily:'inherit',width:'100%'}
  const smallInput={...inp,padding:'6px 10px',fontSize:12}

  return(
    <>
      <div className="page-header">
        <div><div className="page-title">Assignments</div><div className="page-subtitle">Double-click any row to edit · accordion state saved</div></div>
        <button className="btn btn-primary" onClick={()=>setShowAddTerm(s=>!s)}><Plus size={14}/> Add term</button>
      </div>
      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        {showAddTerm&&(
          <div className="card" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input style={{...inp,flex:1}} placeholder="Term name (e.g. Fall 2026)" value={newTermName} onChange={e=>setNewTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTerm()} autoFocus/>
            <button className="btn btn-primary" onClick={addTerm}>Add</button>
            <button className="btn btn-ghost" onClick={()=>setShowAddTerm(false)}>Cancel</button>
          </div>
        )}

        {/* Term tabs */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {terms.map(term=>(
            <div key={term.id} style={{display:'flex',alignItems:'center',gap:4}}>
              {editTermId===term.id?(
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input style={{...smallInput,width:140}} value={editTermName} onChange={e=>setEditTermName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveTermName(term.id)} autoFocus/>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>saveTermName(term.id)}><Check size={11}/></button>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>setEditTermId(null)}><X size={11}/></button>
                </div>
              ):(
                <button onClick={()=>setActiveTerm(term.id)} style={{padding:'8px 16px',borderRadius:'var(--radius-md)',border:`1px solid ${activeTermId===term.id?'var(--accent)':'var(--glass-border)'}`,background:activeTermId===term.id?'var(--accent)':'var(--glass-bg-2)',color:activeTermId===term.id?'white':'var(--text-2)',fontWeight:600,fontSize:13,cursor:'pointer',transition:'all .15s',boxShadow:activeTermId===term.id?'0 0 12px var(--accent-glow)':'none'}}>
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
            {/* Stats */}
            {activeTerm.courses.length>0&&(
              <div className="grid-3">
                {STATUS.map(s=>(
                  <div key={s.key} className="stat-card">
                    <div className="stat-label">{s.key}</div>
                    <div className="stat-value" style={{color:s.color,fontSize:22}}>{activeTerm.courses.reduce((sum,c)=>sum+c.assignments.filter(a=>a.status===s.key).length,0)}</div>
                    <div className="stat-sub">across all courses</div>
                  </div>
                ))}
              </div>
            )}

            {/* Course accordions */}
            {activeTerm.courses.map(course=>{
              const open      = isExpanded(course.id)
              const doneCount = course.assignments.filter(a=>a.status==='Done').length
              const total     = course.assignments.length
              const sorted    = [...course.assignments].sort((a,b)=>{
                const ad=a.status==='Done',bd=b.status==='Done'
                if(ad&&!bd)return 1;if(!ad&&bd)return -1
                if(!a.due&&!b.due)return 0;if(!a.due)return 1;if(!b.due)return -1
                return new Date(a.due)-new Date(b.due)
              })

              return(
                <div key={course.id} className="card" style={{padding:0,overflow:'hidden',borderLeft:`4px solid ${course.color}`}}>
                  {/* Header */}
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer'}} onClick={()=>toggleExpanded(course.id)}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:course.color,flexShrink:0,boxShadow:`0 0 8px ${course.color}`}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:15}}>{course.name}</div>
                      <div style={{fontSize:11,color:'var(--text-3)',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                        {course.instructor&&<span>👤 {course.instructor}</span>}
                        {course.days&&<span>📅 {course.days}</span>}
                        {course.time&&<span>🕐 {course.time}</span>}
                        {course.room&&<span>📍 {course.room}</span>}
                        {course.gradeTarget&&<span>🎯 Target: {course.gradeTarget}%</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,color:'var(--text-3)'}}>{doneCount}/{total}</span>
                      <div style={{width:40,height:4,borderRadius:2,background:'var(--glass-border)',overflow:'hidden'}}>
                        <div style={{height:'100%',background:course.color,width:`${total>0?(doneCount/total)*100:0}%`,transition:'width .3s'}}/>
                      </div>
                      <div style={{display:'flex',gap:3}} onClick={e=>e.stopPropagation()}>
                        <Tooltip text="Edit course">
                          <button className="btn-icon" style={{padding:4}} onClick={()=>{setEditCourseId(course.id);setEditCourseForm({name:course.name,instructor:course.instructor||'',days:course.days||'',time:course.time||'',room:course.room||'',credits:course.credits||3,gradeTarget:course.gradeTarget||90,color:course.color,notes:course.notes||''})}}><Edit2 size={11}/></button>
                        </Tooltip>
                        <Tooltip text="Delete course">
                          <button className="btn-icon" style={{padding:4,color:'var(--coral)'}} onClick={()=>deleteCourse(activeTerm.id,course.id)}><Trash2 size={11}/></button>
                        </Tooltip>
                        <Tooltip text="Add assignment">
                          <button className="btn-icon" style={{padding:4,color:'var(--accent)'}} onClick={e=>{e.stopPropagation();setShowAddAssign(course.id);setExpanded(ex=>({...ex,[course.id]:true}))}}><Plus size={11}/></button>
                        </Tooltip>
                      </div>
                      {open?<ChevronUp size={14} style={{color:'var(--text-3)'}}/>:<ChevronDown size={14} style={{color:'var(--text-3)'}}/>}
                    </div>
                  </div>

                  {/* Edit course form */}
                  {editCourseId===course.id&&(
                    <div style={{padding:'12px 16px',borderTop:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <input style={{...inp,gridColumn:'1/-1'}} placeholder="Course name" value={editCourseForm.name} onChange={e=>setEditCourseForm(f=>({...f,name:e.target.value}))} autoFocus/>
                        <input style={inp} placeholder="Instructor" value={editCourseForm.instructor} onChange={e=>setEditCourseForm(f=>({...f,instructor:e.target.value}))}/>
                        <input style={inp} placeholder="Days" value={editCourseForm.days} onChange={e=>setEditCourseForm(f=>({...f,days:e.target.value}))}/>
                        <input style={inp} placeholder="Time" value={editCourseForm.time} onChange={e=>setEditCourseForm(f=>({...f,time:e.target.value}))}/>
                        <input style={inp} placeholder="Room" value={editCourseForm.room} onChange={e=>setEditCourseForm(f=>({...f,room:e.target.value}))}/>
                        <input type="number" style={inp} placeholder="Grade target %" value={editCourseForm.gradeTarget} onChange={e=>setEditCourseForm(f=>({...f,gradeTarget:Number(e.target.value)}))}/>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                        <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                        {COURSE_COLORS.map(c=><button key={c} onClick={()=>setEditCourseForm(f=>({...f,color:c}))} style={{width:22,height:22,borderRadius:'50%',background:c,border:`3px solid ${editCourseForm.color===c?'white':'transparent'}`,cursor:'pointer'}}/>)}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>saveCourse(activeTerm.id,course.id)}>Save</button>
                        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setEditCourseId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Add assignment inline */}
                  {open&&showAddAssign===course.id&&(
                    <div style={{padding:'12px 16px',borderTop:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--accent)'}}>New assignment</div>
                      <input style={inp} placeholder="Title *" value={newAssign.title} onChange={e=>setNewAssign(a=>({...a,title:e.target.value}))} autoFocus/>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                        <select style={inp} value={newAssign.type} onChange={e=>setNewAssign(a=>({...a,type:e.target.value}))}>{ASSIGNMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                        <input type="date" style={inp} value={newAssign.due} onChange={e=>setNewAssign(a=>({...a,due:e.target.value}))} placeholder="Due date *"/>
                        <select style={inp} value={newAssign.priority} onChange={e=>setNewAssign(a=>({...a,priority:e.target.value}))}>
                          {['none','low','medium','high','urgent'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                        </select>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>addAssign(activeTerm.id,course.id)} disabled={!newAssign.title.trim()||!newAssign.due}>Add</button>
                        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setShowAddAssign(null);setNewAssign(BLANK_ASSIGN)}}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Assignments list */}
                  {open&&(
                    <div style={{borderTop:'1px solid var(--glass-border)'}}>
                      {sorted.length===0&&showAddAssign!==course.id&&(
                        <div style={{padding:'20px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No assignments yet</div>
                      )}
                      {sorted.map(a=>{
                        const due     = formatRelativeDue(a.due,a.dueTime)
                        const isDone  = a.status==='Done'
                        const isJump  = a.id===jumpAssignId
                        const pri     = PRIORITY.find(p=>p.key===(a.priority||'none'))
                        const stCfg   = STATUS.find(s=>s.key===a.status)||STATUS[0]
                        const isEdit  = editAssignId===a.id
                        const noteOpen= openNotes[a.id]
                        const hasScore= a.score!==undefined&&a.score!==''&&a.maxScore
                        const scorePct= hasScore?Math.round((Number(a.score)/Number(a.maxScore))*100):null
                        const scoreColor=scorePct===null?'var(--text-3)':scorePct>=90?'var(--green)':scorePct>=70?'var(--amber)':'var(--coral)'

                        return(
                          <div key={a.id} id={`assign-${a.id}`} style={{borderBottom:'1px solid var(--glass-border)',background:isJump?`${course.color}18`:'transparent',outline:isJump?`2px solid ${course.color}`:'none',outlineOffset:'-2px',transition:'background .3s',cursor:'pointer'}}
                            onDoubleClick={()=>{setEditAssignId(a.id);setEditAssign({title:a.title,type:a.type||'Essay',due:a.due||'',dueTime:a.dueTime||'',startDate:a.startDate||'',status:a.status,priority:a.priority||'none',notes:a.notes||'',score:a.score||'',maxScore:a.maxScore||'100',submissionType:a.submissionType||'Canvas',url:a.url||''})}}>

                            {isEdit?(
                              <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
                                <input style={inp} value={editAssign.title} onChange={e=>setEditAssign(a=>({...a,title:e.target.value}))} autoFocus/>
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                                  <select style={inp} value={editAssign.type} onChange={e=>setEditAssign(a=>({...a,type:e.target.value}))}>{ASSIGNMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                                  <select style={inp} value={editAssign.submissionType||'Canvas'} onChange={e=>setEditAssign(a=>({...a,submissionType:e.target.value}))}>
                                    {['Canvas','In class','Both','Email','Other'].map(t=><option key={t}>{t}</option>)}
                                  </select>
                                  <input type="date" style={inp} placeholder="Start date" value={editAssign.startDate} onChange={e=>setEditAssign(a=>({...a,startDate:e.target.value}))}/>
                                  <input type="date" style={inp} placeholder="Due date" value={editAssign.due} onChange={e=>setEditAssign(a=>({...a,due:e.target.value}))}/>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                                  <select style={inp} value={editAssign.status} onChange={e=>setEditAssign(a=>({...a,status:e.target.value}))}>
                                    {['To do','In progress','Done'].map(s=><option key={s}>{s}</option>)}
                                  </select>
                                  <select style={inp} value={editAssign.priority} onChange={e=>setEditAssign(a=>({...a,priority:e.target.value}))}>
                                    {['none','low','medium','high','urgent'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                                  </select>
                                </div>
                                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                  <input type="number" style={{...inp,width:80,textAlign:'center'}} placeholder="Score" value={editAssign.score||''} onChange={e=>setEditAssign(a=>({...a,score:e.target.value}))}/>
                                  <span style={{color:'var(--text-3)'}}>/</span>
                                  <input type="number" style={{...inp,width:80,textAlign:'center'}} value={editAssign.maxScore||100} onChange={e=>setEditAssign(a=>({...a,maxScore:e.target.value}))}/>
                                  {editAssign.score&&editAssign.maxScore&&<span style={{fontSize:13,fontWeight:700,color:scoreColor}}>{Math.round((Number(editAssign.score)/Number(editAssign.maxScore))*100)}%</span>}
                                </div>
                                <textarea style={{...inp,minHeight:60,resize:'vertical',fontFamily:'var(--font-mono)',lineHeight:1.6}} placeholder="Notes…" value={editAssign.notes||''} onChange={e=>setEditAssign(a=>({...a,notes:e.target.value}))}/>
                                <input type="url" placeholder="Reference link (optional)" value={editAssign.url||''} onChange={e=>setEditAssign(a=>({...a,url:e.target.value}))} style={inp}/>
                                <div style={{display:'flex',gap:8}}>
                                  <button className="btn btn-primary" style={{flex:1,fontSize:12}} onClick={()=>saveAssign(activeTerm.id,course.id,a.id)}>Save</button>
                                  <button className="btn btn-ghost" style={{fontSize:12,color:'var(--coral)'}} onClick={()=>setDeleteTarget({termId:activeTerm.id,courseId:course.id,assignmentId:a.id,title:a.title})}><Trash2 size={12}/></button>
                                  <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setEditAssignId(null)}>Cancel</button>
                                </div>
                              </div>
                            ):(
                              <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',flexWrap:'wrap'}}>
                                {/* Checkbox */}
                                <button onClick={e=>{e.stopPropagation();patchAssign(activeTerm.id,course.id,a.id,{status:isDone?'To do':'Done'})}} style={{background:'none',border:'none',cursor:'pointer',padding:2,flexShrink:0,display:'flex',color:isDone?'var(--green)':'var(--glass-border)',transition:'color .15s'}}>
                                  {isDone
                                    ?<div style={{width:18,height:18,borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={11} color="white"/></div>
                                    :<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--glass-border)'}}/>}
                                </button>
                                {/* Title */}
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}>
                                    <span style={{fontWeight:600,fontSize:13,color:isDone?'var(--text-3)':'var(--text-1)',textDecoration:isDone?'line-through':'none'}}>{a.title}</span>
                                    {a.type&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'var(--glass-bg-2)',color:'var(--text-3)',border:'1px solid var(--glass-border)'}}>{a.type}</span>}
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                    {due&&<span style={{fontSize:11,fontWeight:700,color:isDone?'var(--text-3)':due.color}}>{due.label}</span>}
                                    {hasScore&&<span style={{fontSize:11,fontWeight:700,color:scoreColor}}>{a.score}/{a.maxScore} = {scorePct}%</span>}
                                  </div>
                                </div>
                                {/* Desktop pills */}
                                <div className="desktop-only" style={{display:'flex',gap:4,flexShrink:0,alignItems:'center'}}>
                                  {pri&&pri.key!=='none'&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:pri.bg,color:pri.color,fontWeight:700,border:`1px solid ${pri.color}44`}}>{pri.label}</span>}
                                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:stCfg.bg,color:stCfg.color,fontWeight:700}}>{a.status}</span>
                                  {a.url && (
                                    <button onClick={e=>{e.stopPropagation();openUrl(a.url)}} style={{display:'flex',alignItems:'center',color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',padding:2}}>
                                      <ExternalLink size={11}/>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes collapsed */}
                            {!isEdit&&a.notes&&(
                              <div style={{padding:'0 16px 10px 46px'}}>
                                <button onClick={e=>{e.stopPropagation();setOpenNotes(n=>({...n,[a.id]:!n[a.id]}))}} style={{background:'none',border:'none',cursor:'pointer',padding:'2px 0',fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4}}>
                                  {noteOpen?<ChevronUp size={10}/>:<ChevronDown size={10}/>}{noteOpen?'Hide notes':'Show notes'}
                                </button>
                                {noteOpen&&<div style={{marginTop:6,fontSize:12,color:'var(--text-2)',lineHeight:1.7,background:'var(--glass-bg)',borderRadius:6,padding:'9px 11px',fontFamily:'var(--font-mono)',whiteSpace:'pre-wrap'}}>{a.notes}</div>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div style={{padding:'10px 16px'}}>
                        <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',gap:6,fontSize:12}} onClick={e=>{e.stopPropagation();setShowAddAssign(course.id);setExpanded(ex=>({...ex,[course.id]:true}))}}>
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
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <input style={{...inp,gridColumn:'1/-1'}} placeholder="Course name *" value={newCourse.name} onChange={e=>setNewCourse(c=>({...c,name:e.target.value}))} autoFocus/>
                  <input style={inp} placeholder="Instructor" value={newCourse.instructor} onChange={e=>setNewCourse(c=>({...c,instructor:e.target.value}))}/>
                  <input style={inp} placeholder="Days (Mon/Wed)" value={newCourse.days} onChange={e=>setNewCourse(c=>({...c,days:e.target.value}))}/>
                  <input style={inp} placeholder="Time" value={newCourse.time} onChange={e=>setNewCourse(c=>({...c,time:e.target.value}))}/>
                  <input style={inp} placeholder="Room" value={newCourse.room} onChange={e=>setNewCourse(c=>({...c,room:e.target.value}))}/>
                  <input type="number" style={inp} placeholder="Grade target %" value={newCourse.gradeTarget} onChange={e=>setNewCourse(c=>({...c,gradeTarget:Number(e.target.value)}))}/>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--text-3)'}}>Color:</span>
                  {COURSE_COLORS.map(c=><button key={c} onClick={()=>setNewCourse(n=>({...n,color:c}))} style={{width:22,height:22,borderRadius:'50%',background:c,border:`3px solid ${newCourse.color===c?'white':'transparent'}`,cursor:'pointer'}}/>)}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary" onClick={()=>addCourse(activeTerm.id)} style={{flex:1}}>Add course</button>
                  <button className="btn btn-ghost" onClick={()=>{setShowAddCourse(null);setNewCourse(BLANK_COURSE)}}>Cancel</button>
                </div>
              </div>
            ):(
              <button className="btn btn-ghost" style={{alignSelf:'flex-start',gap:8}} onClick={()=>setShowAddCourse(activeTerm.id)}>
                <BookOpen size={14}/> Add course to {activeTerm?.name}
              </button>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div style={{position:'fixed',inset:0,background:'var(--overlay)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'var(--panel-bg)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-lg)',padding:'24px 28px',maxWidth:360,width:'90%',boxShadow:'var(--shadow)'}}>
            <p style={{color:'var(--text-1)',fontWeight:600,marginBottom:8}}>Delete assignment?</p>
            <p style={{color:'var(--text-2)',fontSize:13,marginBottom:20}}>"{deleteTarget.title}" will be permanently removed.</p>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setDeleteTarget(null)} style={{padding:'7px 16px',background:'var(--surface-chip)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',color:'var(--text-2)',cursor:'pointer',fontSize:13}}>Cancel</button>
              <button onClick={()=>{deleteAssign(deleteTarget.termId,deleteTarget.courseId,deleteTarget.assignmentId);setDeleteTarget(null)}} style={{padding:'7px 16px',background:'var(--danger-surface)',border:'1px solid var(--danger)',borderRadius:'var(--radius-sm)',color:'var(--danger)',cursor:'pointer',fontSize:13,fontWeight:600}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
