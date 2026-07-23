import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Circle, Plus, X, History, Calendar, ChevronRight } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import { getActiveTermCourses, getCourseColorMap } from '../utils/termData.js'
import Tooltip from '../components/Tooltip.jsx'
import { useNavigate } from 'react-router-dom'

const URGENCY = {
  urgent: { color:'#ef4444', label:'🔴 Urgent' },
  high:   { color:'#f97316', label:'🟠 High'   },
  medium: { color:'#f59e0b', label:'🟡 Soon'   },
  low:    { color:'#22c55e', label:'🟢 Relaxed' },
  none:   { color:null,      label:'No priority' },
}
const WX_ICONS = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',80:'🌦',82:'⛈',95:'⛈'}

function getSemCountdown(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const end = new Date(dateStr + 'T23:59:00')
  const ms  = end - now
  if (ms <= 0) return { past: true, label: 'Ended' }
  const totalDays = Math.ceil(ms / 86400000)
  const weeks = Math.floor(totalDays / 7)
  const days  = totalDays % 7
  const parts = []
  if (weeks) parts.push(`${weeks}w`)
  if (days)  parts.push(`${days}d`)
  return { past: false, label: parts.join(' ') || '0d', weeks, days, totalDays }
}

function getAllUpcomingAssignments() {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1') || '[]')
    const active = terms.find(t => t.active) || terms[0]
    if (!active) return []
    return active.courses
      .flatMap(c => c.assignments.map(a => ({ ...a, courseName: c.name, courseColor: c.color })))
      .filter(a => a.status !== 'Done' && a.due)
      .sort((a, b) => {
        const dd = new Date(a.due) - new Date(b.due)
        if (dd !== 0) return dd
        const pw = { urgent:4, high:3, medium:2, low:1, none:0 }
        return (pw[b.priority||'none']||0) - (pw[a.priority||'none']||0)
      })
  } catch(e) { return [] }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '🌅 Good morning'
  if (h < 17) return '☀️ Good afternoon'
  if (h < 21) return '🌆 Good evening'
  return '🌙 Good night'
}

// Local date string — avoids UTC offset bug where toISOString() returns yesterday
// before midnight UTC (e.g. 8pm EDT = midnight UTC = next day in ISO)
function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DATE_STR   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
const DAY_IDX    = new Date().getDay()
const IS_CLASS   = DAY_IDX===1||DAY_IDX===3
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getUpcomingAssignments(count=3) {
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const active = terms.find(t=>t.active)||terms[0]
    if (!active) return []
    return active.courses
      .flatMap(c=>c.assignments.map(a=>({...a,courseName:c.name,courseColor:c.color,_type:'assignment'})))
      .filter(a=>a.status!=='Done'&&a.due)
      .sort((a,b)=>{
        const dd=new Date(a.due)-new Date(b.due)
        if(dd!==0)return dd
        const pw={urgent:4,high:3,medium:2,low:1,none:0}
        return(pw[b.priority||'none']||0)-(pw[a.priority||'none']||0)
      })
      .slice(0,count)
  } catch(e) { return [] }
}

function getUpcomingPlans(count=2) {
  try {
    const today=localDateStr()
    return load('calendar_plans',[])
      .filter(p=>p.date>=today)
      .sort((a,b)=>a.date.localeCompare(b.date))
      .slice(0,count)
      .map(p=>({...p,_type:'plan'}))
  } catch(e) { return [] }
}

// Countdown cards — Essays/Exams/Quizzes only
function CountdownCards() {
  const now=new Date()
  try {
    const terms=JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const active=terms.find(t=>t.active)||terms[0]
    if(!active) return null
    const items=active.courses
      .flatMap(c=>c.assignments.map(a=>({...a,courseName:c.name,courseColor:c.color})))
      .filter(a=>a.status!=='Done'&&a.due&&['Essay','Exam','Quiz'].includes(a.type))
      .sort((a,b)=>new Date(a.due)-new Date(b.due))
      .slice(0,3)
    if(!items.length) return null
    return (
      <div className="card">
        <div className="card-title" style={{marginBottom:10}}>⏳ Countdown</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {items.map(a=>{
            const days=Math.ceil((new Date(a.due+'T23:59:00')-now)/86400000)
            const urgent=days<=3,warn=days<=7
            return(
              <div key={a.id} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,
                background:urgent?'rgba(239,68,68,.08)':warn?'rgba(251,191,36,.07)':'var(--glass-bg)',
                border:`1px solid ${urgent?'rgba(239,68,68,.3)':warn?'rgba(251,191,36,.25)':'var(--glass-border)'}`,
                borderLeft:`3px solid ${a.courseColor}`,
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                  <div style={{fontSize:10,color:'var(--text-3)'}}>{a.type} · {a.courseName}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:800,fontFamily:'var(--font-mono)',color:urgent?'#ef4444':warn?'var(--amber)':'var(--text-2)',lineHeight:1}}>{days}d</div>
                  <div style={{fontSize:9,color:'var(--text-3)'}}>{new Date(a.due+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  } catch(e) { return null }
}

// TaskRow — defined OUTSIDE component to prevent remount-on-keystroke
function TaskRow({task,courseColors,courseOptions,editId,editText,editCourse,editUrgency,editDue,editIsPlan,onEditText,onEditCourse,onEditUrgency,onEditDue,onToggleIsPlan,onSaveEdit,onCancelEdit,onStartEdit,onToggle,onDelete,dragOverId,dragId,onDragStart,onDragOver,onDrop,onDragEnd,expandedTaskId,onToggleExpand}) {
  const urgColor=URGENCY[task.urgency||'none'].color
  const courseColor=courseColors[task.course]||courseColors['OTHER']||'#4ade80'
  const courseLabel=task.course==='OTHER'?'Other':(task.course||'Other')
  const due=task.due?formatRelativeDue(task.due,''):null
  const isEditing=editId===task.id

  if(isEditing) return(
    <div style={{padding:'10px 12px',marginBottom:4,borderRadius:10,background:'var(--glass-bg-2)',border:'1px solid var(--accent)',display:'flex',flexDirection:'column',gap:8}}>
      <input className="inline-input" value={editText} onChange={e=>onEditText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSaveEdit();if(e.key==='Escape')onCancelEdit()}} autoFocus/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        <select className="inline-input" value={editCourse} onChange={e=>onEditCourse(e.target.value)}>{courseOptions.map(c=><option key={c} value={c}>{c==='OTHER'?'Other':c}</option>)}</select>
        <select className="inline-input" value={editUrgency} onChange={e=>onEditUrgency(e.target.value)}>{Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <input type="date" className="inline-input" value={editDue} onChange={e=>onEditDue(e.target.value)}/>
      </div>
      {editDue&&(
        <div onClick={onToggleIsPlan}
          style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:'var(--radius-md)',cursor:'pointer',transition:'all .2s',
            background:editIsPlan?'var(--accent-dim)':'var(--glass-bg)',
            border:`2px solid ${editIsPlan?'var(--accent)':'var(--glass-border)'}`,
          }}>
          <div style={{width:18,height:18,borderRadius:5,background:editIsPlan?'var(--accent)':'transparent',border:`2px solid ${editIsPlan?'var(--accent)':'var(--glass-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
            {editIsPlan&&<span style={{color:'white',fontSize:11,lineHeight:1}}>✓</span>}
          </div>
          <span style={{fontSize:12,fontWeight:600,color:editIsPlan?'var(--accent)':'var(--text-2)'}}>
            {editIsPlan?'Will show on calendar':'Add to calendar?'}
          </span>
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-primary" onClick={onSaveEdit} style={{flex:1,fontSize:12}}>Save</button>
        <button className="btn btn-ghost" onClick={onCancelEdit} style={{fontSize:12}}>Cancel</button>
      </div>
    </div>
  )

  const isExpanded = expandedTaskId === task.id
  const URGENCY_LABELS = {urgent:'🔴 Urgent',high:'🟠 High',medium:'🟡 Soon',low:'🟢 Relaxed',none:null}
  const urgLabel = URGENCY_LABELS[task.urgency||'none']

  return(
    <div style={{marginBottom:3}}>
      <div
        draggable
        onDragStart={e=>onDragStart(e,task.id)} onDragOver={e=>onDragOver(e,task.id)}
        onDrop={e=>onDrop(e,task.id)} onDragEnd={onDragEnd}
        onDoubleClick={()=>onStartEdit(task)}
        onClick={()=>onToggleExpand(task.id)}
        className="task-row-mobile"
        style={{display:'flex',alignItems:'center',gap:8,padding:'10px 10px',borderRadius:isExpanded?'10px 10px 0 0':'10px',position:'relative',background:dragOverId===task.id?'var(--accent-dim)':'var(--glass-bg)',border:dragOverId===task.id?'1px solid var(--accent)':`1px solid ${isExpanded?'var(--accent)':'var(--glass-border)'}`,outline:urgColor?`2px solid ${urgColor}44`:'none',outlineOffset:2,cursor:'pointer',opacity:dragId===task.id?.35:1,userSelect:'none',transition:'border-radius .2s, border-color .2s'}}
      >
        {urgColor&&<div style={{position:'absolute',left:3,top:'20%',width:3,height:'60%',borderRadius:2,background:urgColor,boxShadow:`0 0 6px ${urgColor}`,pointerEvents:'none'}}/>}
        <button onClick={e=>{e.stopPropagation();onToggle(task.id)}} style={{background:'none',border:'none',padding:2,flexShrink:0,display:'flex',color:task.done?'var(--green)':'var(--text-3)',cursor:'pointer'}}>
          {task.done?<CheckCircle2 size={17}/>:<Circle size={17}/>}
        </button>
        {/* Title — full width, no truncation on mobile */}
        <span style={{flex:1,fontSize:13,fontWeight:500,color:task.done?'var(--text-3)':'var(--text-1)',textDecoration:task.done?'line-through':'none',wordBreak:'break-word',lineHeight:1.3}}>
          {task.isPlan&&<span style={{fontSize:10,marginRight:4}}>📅</span>}{task.text}
        </span>
        <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
          {due&&<span style={{fontSize:10,fontWeight:700,color:task.done?'var(--text-3)':due.color}}>{due.label}</span>}
          <button onClick={e=>{e.stopPropagation();onDelete(task.id)}} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={12}/></button>
        </div>
      </div>

      {/* Expanded attributes — animated */}
      {isExpanded&&(
        <div className="task-expand-attrs" style={{
          padding:'8px 12px 10px',
          background:'var(--glass-bg-2)',
          border:'1px solid var(--accent)',
          borderTop:'none',
          borderRadius:'0 0 10px 10px',
        }}>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
            {/* Course */}
            <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:`${courseColor}22`,color:courseColor,border:`1px solid ${courseColor}44`,fontWeight:700}}>{courseLabel}</span>
            {/* Priority */}
            {urgLabel&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:urgColor?`${urgColor}22`:'var(--glass-bg)',color:urgColor||'var(--text-3)',fontWeight:700}}>{urgLabel}</span>}
            {/* Due */}
            {task.due&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'var(--glass-bg)',color:'var(--text-2)',border:'1px solid var(--glass-border)'}}>📅 {task.due}</span>}
            {/* Edit button */}
            <button onClick={e=>{e.stopPropagation();onStartEdit(task)}} style={{fontSize:11,padding:'2px 10px',borderRadius:20,background:'var(--accent-dim)',color:'var(--accent)',border:'1px solid var(--accent)',fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>Edit</button>
          </div>
        </div>
      )}
    </div>
  )
}


export default function WeeklyHome({ onDataChange }) {
  const navigate = useNavigate()
  const [tasks,       setTasks]      = useState(()=>load('home_tasks',[]))
  const [showAdd,     setShowAdd]    = useState(false)
  const [newTask,     setNewTask]    = useState({text:'',course:'OTHER',urgency:'none',due:'',isPlan:false})
  const addInputRef = useRef(null)
  const [editId,      setEditId]     = useState(null)
  const [editText,    setEditText]   = useState('')
  const [editCourse,  setEditCourse] = useState('')
  const [editUrgency, setEditUrgency]= useState('none')
  const [editDue,     setEditDue]    = useState('')
  const [editIsPlan,  setEditIsPlan] = useState(false)
  const [weather,     setWeather]    = useState(null)
  const [weatherError,setWeatherError]=useState(false)
  const [city,        setCity]       = useState(()=>load('weather_city','Bradenton'))
  const [cityDraft,   setCityDraft]  = useState(city)
  const [showCityEdit,setShowCityEdit]=useState(false)
  const [greeting,    setGreeting]   = useState(getGreeting())
  const [semDate,     setSemDate]    = useState(()=>load('sem_end_date','2026-08-05'))
  const [editSemDate, setEditSemDate]=useState(false)
  const [showHistory, setShowHistory]=useState(false)
  const [upcoming,    setUpcoming]   = useState([])
  const [showUpcomingModal, setShowUpcomingModal] = useState(false)
  const [dragId,      setDragId]     = useState(null)
  const [dragOverId,  setDragOverId] = useState(null)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [confirmModal,   setConfirmModal]   = useState(null) // { type, taskId, planId, message }
  const COURSE_COLORS = getCourseColorMap()
  const courseOptions = [...getActiveTermCourses().map(c=>c.name),'OTHER']

  useEffect(()=>{ const id=setInterval(()=>setGreeting(getGreeting()),60000); return()=>clearInterval(id) },[])
  useEffect(()=>{
    save('home_tasks',tasks)
    onDataChange?.()
  },[tasks])
  useEffect(()=>{ save('sem_end_date',semDate); onDataChange?.() },[semDate])

  // Re-read tasks from localStorage when Drive syncs (replaces driveKey remount)
  useEffect(() => {
    const h = () => setTasks(load('home_tasks', []))
    window.addEventListener('drive-loaded', h)
    return () => window.removeEventListener('drive-loaded', h)
  }, [])

  const refreshUpcoming=useCallback(()=>{
    const a=getUpcomingAssignments(3),p=getUpcomingPlans(2)
    setUpcoming([...a,...p].slice(0,4))
  },[])
  useEffect(()=>{ refreshUpcoming(); window.addEventListener('drive-loaded',refreshUpcoming); return()=>window.removeEventListener('drive-loaded',refreshUpcoming) },[])
  useEffect(()=>{ refreshUpcoming() },[tasks])

  const fetchWeather=async(c=city)=>{
    try{
      const cached=sessionStorage.getItem('planner_weather_cache')
      if(cached){const p=JSON.parse(cached);if(p.city===c){setWeather(p);setWeatherError(false);return}}
      let lat=27.4989, lng=-82.5748
      try{
        const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1`)
        const gd=await geo.json()
        if(gd.results?.length){lat=gd.results[0].latitude;lng=gd.results[0].longitude}
      }catch(e){ /* use fallback coords */ }
      const wx=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
      const wd=await wx.json()
      const res={city:c,daily:wd.daily}
      setWeather(res);setWeatherError(false)
      sessionStorage.setItem('planner_weather_cache',JSON.stringify(res))
    }catch(e){setWeatherError(true)}
  }
  useEffect(()=>{ fetchWeather() },[])

  const addTask=useCallback(()=>{
    if(!newTask.text.trim())return
    const taskId = Date.now()
    const planId = newTask.isPlan && newTask.due ? 'task_plan_'+taskId : null
    // 📅 emoji prepended when task is also a calendar plan
    const taskText = newTask.isPlan ? '📅 '+newTask.text : newTask.text
    setTasks(ts=>[{...newTask,text:taskText,id:taskId,done:false,...(planId?{calendarPlanId:planId}:{})},...ts])
    if(newTask.isPlan&&newTask.due){
      const existing=load('calendar_plans',[])
      save('calendar_plans',[...existing,{
        id:planId,title:newTask.text,
        date:newTask.due,notes:'',color:'#6366f1',_type:'plan',taskId,
      }])
    }
    setNewTask(n=>({...n,text:''}))
    setTimeout(()=>addInputRef.current?.focus(),0)
  },[newTask])

  const toggleTask =useCallback(id=>{
    const task = load('home_tasks',[]).find(t=>t.id===id)||tasks.find(t=>t.id===id)
    if(task&&!task.done&&task.calendarPlanId){
      // Completing a task linked to a calendar plan — ask to remove plan too
      setConfirmModal({
        type:'complete_task',taskId:id,planId:task.calendarPlanId,
        message:`Mark "${task.text.replace(/^📅 /,'')}" as done and remove the linked calendar plan?`,
      })
    } else {
      setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t))
    }
  },[tasks])

  const deleteTask =useCallback(id=>{
    const task = tasks.find(t=>t.id===id)
    if(task?.calendarPlanId){
      setConfirmModal({
        type:'delete_task',taskId:id,planId:task.calendarPlanId,
        message:`Delete "${task.text.replace(/^📅 /,'')}"? Also remove the linked calendar plan?`,
      })
    } else {
      setTasks(ts=>ts.filter(t=>t.id!==id))
    }
  },[tasks])
  const restoreTask=id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:false}:t))
  const startEdit  =useCallback(task=>{setEditId(task.id);setEditText(task.text);setEditCourse(task.course||'OTHER');setEditUrgency(task.urgency||'none');setEditDue(task.due||'');setEditIsPlan(!!task.isPlan)},[])
  const saveEdit   =useCallback(()=>{
    setTasks(ts=>ts.map(t=>{
      if(t.id!==editId) return t
      const updated={...t,text:editText,course:editCourse,urgency:editUrgency,due:editDue,isPlan:editIsPlan}
      // If user just toggled isPlan on and there's a date, add to calendar_plans
      if(editIsPlan && !t.isPlan && editDue){
        const existing=load('calendar_plans',[])
        const alreadyExists=existing.some(p=>p.id==='task_'+t.id)
        if(!alreadyExists){
          save('calendar_plans',[...existing,{id:'task_'+t.id,title:editText,date:editDue,notes:'',color:'#6366f1',_type:'plan'}])
        }
      }
      // Sync task text change to linked calendar plan title
      if(t.calendarPlanId) {
        const cleanText = editText.replace(/^📅 /,'')
        const plans = load('calendar_plans',[])
        const plan = plans.find(p=>p.id===t.calendarPlanId)
        if(plan && cleanText !== plan.title) {
          save('calendar_plans', plans.map(p=>p.id===t.calendarPlanId ? {...p,title:cleanText} : p))
        }
      }
      return updated
    }))
    setEditId(null)
  },[editId,editText,editCourse,editUrgency,editDue,editIsPlan])
  const cancelEdit =useCallback(()=>setEditId(null),[])

  const handleConfirm=useCallback((alsoCalendar)=>{
    if(!confirmModal) return
    const {type,taskId,planId}=confirmModal
    if(type==='complete_task'){
      setTasks(ts=>ts.map(t=>t.id===taskId?{...t,done:true}:t))
      if(alsoCalendar){
        const plans=load('calendar_plans',[])
        save('calendar_plans',plans.filter(p=>p.id!==planId))
      }
    } else if(type==='delete_task'){
      setTasks(ts=>ts.filter(t=>t.id!==taskId))
      if(alsoCalendar){
        const plans=load('calendar_plans',[])
        save('calendar_plans',plans.filter(p=>p.id!==planId))
      }
    }
    setConfirmModal(null)
  },[confirmModal])
  const handleDragStart=useCallback((e,id)=>{setDragId(id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(id))},[])
  const handleDragOver =useCallback((e,id)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOverId(id)},[])
  const handleDrop     =useCallback((e,tid)=>{
    e.preventDefault();if(!dragId||dragId===tid){setDragId(null);setDragOverId(null);return}
    setTasks(ts=>{const a=[...ts.filter(t=>!t.done)],d=ts.filter(t=>t.done),fi=a.findIndex(t=>t.id===dragId),ti=a.findIndex(t=>t.id===tid);if(fi===-1||ti===-1)return ts;const[m]=a.splice(fi,1);a.splice(ti,0,m);return[...a,...d]})
    setDragId(null);setDragOverId(null)
  },[dragId])
  const handleDragEnd=useCallback(()=>{setDragId(null);setDragOverId(null)},[])

  const activeTasks=tasks.filter(t=>!t.done),doneTasks=tasks.filter(t=>t.done)
  const streak=load('streak',0)
  const semCountdown = getSemCountdown(semDate)
  const inputSm={padding:'7px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',color:'var(--text-1)',fontSize:12,fontFamily:'inherit'}

  return(
    <>
      <div className="page-header">
        <div><div className="page-title">{greeting}, Jose</div><div className="page-subtitle">{DATE_STR}{IS_CLASS?' · Class day':''}</div></div>
        <div className="badge badge-accent">🔥 {streak}d streak</div>
      </div>
      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="grid-4">
          <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value" style={{color:'var(--accent-primary)'}}>{activeTasks.length}</div><div className="stat-sub">{doneTasks.length} done</div></div>
          <div className="stat-card">
            <div className="stat-label">Semester ends</div>
            <div className="stat-value" style={{color:semCountdown?.past?'var(--text-3)':'var(--accent-primary)',fontSize:20,cursor:'pointer'}} onClick={()=>setEditSemDate(true)}>
              {semCountdown ? semCountdown.label : '—'}
            </div>
            {editSemDate
              ? <div style={{display:'flex',gap:4,marginTop:4}}>
                  <input type="date" style={{...inputSm,flex:1}} value={semDate} onChange={e=>setSemDate(e.target.value)} autoFocus/>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>setEditSemDate(false)}>✓</button>
                </div>
              : <div style={{fontSize:10,color:'var(--text-3)',marginTop:4,cursor:'pointer',lineHeight:1.4}} onClick={()=>setEditSemDate(true)}>
                  {semDate ? `until ${semDate}` : 'tap to set date'}
                </div>
            }
          </div>
          <div className="stat-card"><div className="stat-label">Today</div><div className="stat-value" style={{color:'var(--teal)',fontSize:22}}>{DAYS_SHORT[DAY_IDX]}</div><div className="stat-sub">{IS_CLASS?'Class day':'No class'}</div></div>
          <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setShowUpcomingModal(true)}>
            <div className="stat-label">Upcoming</div>
            <div className="stat-value" style={{color:'var(--amber)',fontSize:22}}>{upcoming.length}</div>
            <div className="stat-sub" style={{color:'var(--accent-primary)',fontWeight:600}}>view all →</div>
          </div>
        </div>

        {/* Weather card */}
        <div className="card" style={{padding:'16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span className="card-title" style={{margin:0}}>
              {weather ? `🌤 ${weather.city}` : '🌤 Weather'}
            </span>
            {!showCityEdit&&<button className="btn-icon" onClick={()=>{setShowCityEdit(true);setCityDraft(city)}} style={{padding:4,fontSize:11,color:'var(--text-3)'}}>edit city</button>}
          </div>
          {showCityEdit&&(
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <input value={cityDraft} onChange={e=>setCityDraft(e.target.value)} style={{flex:1,padding:'6px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--accent)',color:'var(--text-1)',fontSize:13}} placeholder="City name" onKeyDown={e=>{if(e.key==='Enter'){setCity(cityDraft);save('weather_city',cityDraft);setShowCityEdit(false);setWeather(null);setWeatherError(false);sessionStorage.removeItem('planner_weather_cache');fetchWeather(cityDraft)}if(e.key==='Escape')setShowCityEdit(false)}} autoFocus/>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>{setCity(cityDraft);save('weather_city',cityDraft);setShowCityEdit(false);setWeather(null);setWeatherError(false);sessionStorage.removeItem('planner_weather_cache');fetchWeather(cityDraft)}}>Go</button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setShowCityEdit(false)}>Cancel</button>
            </div>
          )}
          {weatherError ? (
            <div style={{fontSize:12,color:'var(--coral)',display:'flex',alignItems:'center',gap:8}}>
              Weather unavailable — check city name
              <button className="btn-icon" style={{fontSize:11,color:'var(--coral)'}} onClick={()=>{setShowCityEdit(true);setCityDraft(city)}}>edit</button>
            </div>
          ) : weather ? (
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
              {(weather.daily?.time||[]).map((date,i)=>{
                const code=weather.daily?.weathercode?.[i]??0
                const hi=Math.round(weather.daily?.temperature_2m_max?.[i]??0)
                const lo=Math.round(weather.daily?.temperature_2m_min?.[i]??0)
                const icon=WX_ICONS[code]||'🌤'
                const d=new Date(date+'T12:00:00')
                const label=i===0?'Today':DAYS_SHORT[d.getDay()]
                return(
                  <div key={date} style={{flexShrink:0,textAlign:'center',padding:'8px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',minWidth:62}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--text-3)',marginBottom:4}}>{label}</div>
                    <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text-1)'}}>{hi}°</div>
                    <div style={{fontSize:10,color:'var(--text-3)'}}>{lo}°</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{display:'flex',gap:6,overflowX:'auto'}}>
              {[0,1,2,3,4,5,6].map(i=>(
                <div key={i} style={{flexShrink:0,width:62,height:84,background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',animation:'pulse 1.5s ease-in-out infinite',animationDelay:`${i*0.1}s'`}}/>
              ))}
            </div>
          )}
        </div>

        <div className="home-main-grid">
          <div className="card home-tasks-col">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span className="card-title" style={{margin:0}}>Today's focus</span>
              <div style={{display:'flex',gap:6}}>
                <Tooltip text="View completed">
                  <button className="btn-icon" onClick={()=>setShowHistory(s=>!s)} style={{padding:5,position:'relative',color:showHistory?'var(--accent-primary)':'var(--text-1)'}}>
                    <History size={13}/>
                    {doneTasks.length>0&&<span style={{position:'absolute',top:-3,right:-3,background:'var(--surface-chip)',color:'var(--text-1)',fontSize:8,fontWeight:700,width:13,height:13,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{doneTasks.length}</span>}
                  </button>
                </Tooltip>
                <Tooltip text="Add task — press Enter to keep adding">
                  <button className="btn-icon" onClick={()=>{setShowAdd(s=>!s);setTimeout(()=>addInputRef.current?.focus(),50)}} style={{padding:5}}>
                    {showAdd?<X size={13}/>:<Plus size={13}/>}
                  </button>
                </Tooltip>
              </div>
            </div>
            {!showAdd&&<div style={{fontSize:11,color:'var(--text-3)',marginBottom:8}}>Double-click to edit · drag to reorder</div>}
            {showAdd&&(
              <div style={{marginBottom:12,padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--accent)',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>Press Enter to add · Esc to close</div>
                <input ref={addInputRef} className="inline-input" placeholder="Task description…"
                  value={newTask.text} onChange={e=>setNewTask(n=>({...n,text:e.target.value}))}
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTask()}if(e.key==='Escape')setShowAdd(false)}}
                  autoFocus/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <select className="inline-input" value={newTask.course} onChange={e=>setNewTask(n=>({...n,course:e.target.value}))}>
                    {courseOptions.map(c=><option key={c} value={c}>{c==='OTHER'?'Other':c}</option>)}
                  </select>
                  <select className="inline-input" value={newTask.urgency} onChange={e=>setNewTask(n=>({...n,urgency:e.target.value}))}>
                    {Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <input type="date" className="inline-input" value={newTask.due} onChange={e=>setNewTask(n=>({...n,due:e.target.value}))}/>
                </div>
                {newTask.due&&(
                  <div onClick={()=>setNewTask(n=>({...n,isPlan:!n.isPlan}))}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:'var(--radius-md)',cursor:'pointer',transition:'all .2s',
                      background:newTask.isPlan?'var(--accent-dim)':'var(--glass-bg)',
                      border:`2px solid ${newTask.isPlan?'var(--accent)':'var(--glass-border)'}`,
                    }}>
                    <div style={{width:20,height:20,borderRadius:6,background:newTask.isPlan?'var(--accent)':'transparent',border:`2px solid ${newTask.isPlan?'var(--accent)':'var(--glass-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                      {newTask.isPlan&&<span style={{color:'white',fontSize:12,lineHeight:1}}>✓</span>}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:newTask.isPlan?'var(--accent)':'var(--text-1)'}}>
                        <Calendar size={13} style={{display:'inline',marginRight:6,verticalAlign:'middle'}}/>
                        {newTask.isPlan?'Will appear on calendar':'Add to calendar?'}
                      </div>
                      <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>
                        {newTask.isPlan?'A plan pill will show on the selected date':'Tap to also create a calendar plan'}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={()=>{ if(newTask.text.trim()) addTask(); setShowAdd(false) }} style={{fontSize:12}}>Done</button>
                </div>
              </div>
            )}
            {activeTasks.length===0&&!showAdd&&<div style={{textAlign:'center',color:'var(--text-3)',fontSize:13,padding:'16px 0'}}>No active tasks — click + to add one</div>}
            {activeTasks.map(task=>(
              <TaskRow key={task.id} task={task} courseColors={COURSE_COLORS} courseOptions={courseOptions}
                editId={editId} editText={editText} editCourse={editCourse} editUrgency={editUrgency} editDue={editDue} editIsPlan={editIsPlan}
                onEditText={setEditText} onEditCourse={setEditCourse} onEditUrgency={setEditUrgency} onEditDue={setEditDue} onToggleIsPlan={()=>setEditIsPlan(v=>!v)}
                onSaveEdit={saveEdit} onCancelEdit={cancelEdit} onStartEdit={startEdit}
                onToggle={toggleTask} onDelete={deleteTask}
                dragId={dragId} dragOverId={dragOverId}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
                expandedTaskId={expandedTaskId} onToggleExpand={(id)=>setExpandedTaskId(v=>v===id?null:id)}
              />
            ))}
            {showHistory&&(
              <div style={{marginTop:12,borderTop:'1px solid var(--glass-border)',paddingTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Completed ({doneTasks.length}) — click to restore</div>
                {doneTasks.length===0&&<div style={{fontSize:12,color:'var(--text-3)'}}>Nothing completed yet</div>}
                {doneTasks.map(task=>(
                  <div key={task.id} onClick={()=>restoreTask(task.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,marginBottom:3,cursor:'pointer',background:'var(--glass-bg)',border:'1px solid var(--glass-border)',opacity:.6}}>
                    <CheckCircle2 size={14} style={{color:'var(--green)',flexShrink:0}}/>
                    <span style={{fontSize:12,color:'var(--text-3)',textDecoration:'line-through',flex:1}}>{task.text}</span>
                    <button onClick={e=>{e.stopPropagation();deleteTask(task.id)}} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,display:'flex'}}><X size={12}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:16}} className="home-timer-col">
            <div className="card" style={{cursor:'pointer'}} onClick={()=>setShowUpcomingModal(true)}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div className="card-title" style={{margin:0}}>Upcoming</div>
                <ChevronRight size={14} style={{color:'var(--text-3)'}}/>
              </div>
              {upcoming.length===0?<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>Nothing upcoming</div>
                :upcoming.map((item,i)=>{
                  const due=item._type==='assignment'?formatRelativeDue(item.due,''):null
                  const planDate=item._type==='plan'?new Date(item.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):null
                  const color=item.courseColor||item.color||'var(--accent-primary)',isFirst=i===0
                  return(<div key={item.id||i} style={{padding:isFirst?'8px 10px':'5px 10px',borderRadius:8,background:isFirst?'var(--glass-bg-2)':'transparent',border:isFirst?'1px solid var(--glass-border)':'none',borderLeft:`3px solid ${isFirst?color:'var(--glass-border)'}`,opacity:isFirst?1:.75,marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                      {item._type==='plan'&&<span style={{fontSize:9}}>📅</span>}
                      <span style={{fontSize:isFirst?13:11,fontWeight:isFirst?700:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{item.title}</span>
                    </div>
                    <div style={{fontSize:isFirst?12:10,fontWeight:700,color:due?.color||color}}>
                      {due?.label||planDate||'—'}{item._type==='assignment'&&item.courseName&&<span style={{fontSize:9,color:'var(--text-3)',fontWeight:400,marginLeft:6}}>{item.courseName}</span>}
                    </div>
                  </div>)
                })}
            </div>

            <CountdownCards/>

          </div>
        </div>
      </div>

      {/* Upcoming assignments modal */}
      {showUpcomingModal && (() => {
        const all = getAllUpcomingAssignments()
        return (
          <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'var(--overlay)',backdropFilter:'blur(4px)'}} onClick={()=>setShowUpcomingModal(false)}>
            <div className="card" style={{maxWidth:480,width:'100%',padding:0,overflow:'hidden',maxHeight:'80vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:'18px 20px 14px',borderBottom:'1px solid var(--glass-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--glass-bg-2)'}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text-1)'}}>All Upcoming</div>
                  <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{all.length} assignment{all.length!==1?'s':''} remaining</div>
                </div>
                <button onClick={()=>setShowUpcomingModal(false)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:4,display:'flex'}}><X size={16}/></button>
              </div>
              <div style={{overflow:'auto',flex:1,padding:'10px 12px'}}>
                {all.length===0 && <div style={{textAlign:'center',color:'var(--text-3)',fontSize:13,padding:'20px 0'}}>Nothing upcoming — all clear!</div>}
                {all.map(a => {
                  const due = formatRelativeDue(a.due, a.dueTime)
                  return (
                    <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 10px',borderRadius:6,marginBottom:6,background:'var(--surface-row)',border:`1px solid var(--glass-border)`,borderLeft:`3px solid ${a.courseColor}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:'var(--text-1)',marginBottom:2}}>{a.title}</div>
                        <div style={{fontSize:11,color:'var(--text-3)'}}>{a.courseName} · {a.type}</div>
                        <div style={{fontSize:12,fontWeight:700,color:due.color,marginTop:3}}>{due.label}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
                        <button className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>{setShowUpcomingModal(false);navigate('/courses',{state:{highlightId:a.id}})}}>
                          Assignments
                        </button>
                        <button className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>{setShowUpcomingModal(false);navigate('/calendar',{state:{date:a.due}})}}>
                          Calendar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* In-app confirm modal for linked task/plan deletion */}
      {confirmModal && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)'}}>
          <div className="card" style={{maxWidth:360,width:'100%',padding:24,textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:12}}>🔗</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8,color:'var(--text-1)'}}>Linked calendar plan</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginBottom:20,lineHeight:1.6}}>{confirmModal.message}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="btn btn-primary" style={{justifyContent:'center'}} onClick={()=>handleConfirm(true)}>
                Yes, remove both
              </button>
              <button className="btn btn-ghost" style={{justifyContent:'center'}} onClick={()=>handleConfirm(false)}>
                {confirmModal.type==='complete_task'?'Mark done, keep plan':'Delete task only'}
              </button>
              <button className="btn btn-ghost" style={{justifyContent:'center',color:'var(--text-3)'}} onClick={()=>setConfirmModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
