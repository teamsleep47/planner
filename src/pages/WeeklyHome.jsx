import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Circle, Plus, X, History, Calendar } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import { getActiveTermCourses, getCourseColorMap } from '../utils/termData.js'
import Tooltip from '../components/Tooltip.jsx'

const URGENCY = {
  urgent: { color:'#ef4444', label:'🔴 Urgent' },
  high:   { color:'#f97316', label:'🟠 High'   },
  medium: { color:'#f59e0b', label:'🟡 Soon'   },
  low:    { color:'#22c55e', label:'🟢 Relaxed' },
  none:   { color:null,      label:'No priority' },
}
const DEFAULT_TIMERS = { focus:25, short:5, long:15 }
const WX_ICONS = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',80:'🌦',82:'⛈',95:'⛈'}

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
function TaskRow({task,courseColors,courseOptions,editId,editText,editCourse,editUrgency,editDue,editIsPlan,onEditText,onEditCourse,onEditUrgency,onEditDue,onToggleIsPlan,onSaveEdit,onCancelEdit,onStartEdit,onToggle,onDelete,dragOverId,dragId,onDragStart,onDragOver,onDrop,onDragEnd}) {
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

  return(
    <div
      draggable
      onDragStart={e=>onDragStart(e,task.id)} onDragOver={e=>onDragOver(e,task.id)}
      onDrop={e=>onDrop(e,task.id)} onDragEnd={onDragEnd}
      onDoubleClick={()=>onStartEdit(task)}
      className="task-row-mobile"
      style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',marginBottom:3,borderRadius:10,position:'relative',background:dragOverId===task.id?'var(--accent-dim)':'var(--glass-bg)',border:dragOverId===task.id?'1px solid var(--accent)':'1px solid var(--glass-border)',outline:urgColor?`2px solid ${urgColor}44`:'none',outlineOffset:2,cursor:'grab',opacity:dragId===task.id?.35:1,userSelect:'none'}}
    >
      {urgColor&&<div style={{position:'absolute',left:3,top:'20%',width:3,height:'60%',borderRadius:2,background:urgColor,boxShadow:`0 0 6px ${urgColor}`,pointerEvents:'none'}}/>}
      <button onClick={()=>onToggle(task.id)} style={{background:'none',border:'none',padding:2,flexShrink:0,display:'flex',color:task.done?'var(--green)':'var(--text-3)',cursor:'pointer'}}>
        {task.done?<CheckCircle2 size={17}/>:<Circle size={17}/>}
      </button>
      <span style={{flex:1,fontSize:13,fontWeight:500,color:task.done?'var(--text-3)':'var(--text-1)',textDecoration:task.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {task.isPlan&&<span style={{fontSize:10,marginRight:4}}>📅</span>}{task.text}
      </span>
      <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
        <span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:`${courseColor}22`,color:courseColor,border:`1px solid ${courseColor}44`,fontWeight:700}}>{courseLabel}</span>
        {due&&<span style={{fontSize:10,fontWeight:700,color:due.color}}>{due.label}</span>}
        <button onClick={()=>onDelete(task.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={12}/></button>
      </div>
    </div>
  )
}

export default function WeeklyHome({ onDataChange }) {
  const [tasks,       setTasks]      = useState(()=>load('home_tasks',[]))
  const [timerMins,   setTimerMins]  = useState(()=>load('timer_settings',DEFAULT_TIMERS))
  const [mode,        setMode]       = useState('focus')
  const [secs,        setSecs]       = useState(()=>load('timer_settings',DEFAULT_TIMERS).focus*60)
  const [running,     setRunning]    = useState(false)
  const [showAdd,     setShowAdd]    = useState(false)
  const [newTask,     setNewTask]    = useState({text:'',course:'OTHER',urgency:'none',due:'',isPlan:false})
  const addInputRef = useRef(null)
  const [editId,      setEditId]     = useState(null)
  const [editText,    setEditText]   = useState('')
  const [editCourse,  setEditCourse] = useState('')
  const [editUrgency, setEditUrgency]= useState('none')
  const [editDue,     setEditDue]    = useState('')
  const [editIsPlan,  setEditIsPlan] = useState(false)
  const [showSettings,setShowSettings]=useState(false)
  const [draftTimers, setDraftTimers]=useState(timerMins)
  const [weather,     setWeather]    = useState(null)
  const [city,        setCity]       = useState(()=>load('weather_city','Bradenton'))
  const [cityDraft,   setCityDraft]  = useState(city)
  const [showCityEdit,setShowCityEdit]=useState(false)
  const [greeting,    setGreeting]   = useState(getGreeting())
  const [semDate,     setSemDate]    = useState(()=>load('sem_end_date','2026-08-05'))
  const [editSemDate, setEditSemDate]=useState(false)
  const [showHistory, setShowHistory]=useState(false)
  const [upcoming,    setUpcoming]   = useState([])
  const [dragId,      setDragId]     = useState(null)
  const [dragOverId,  setDragOverId] = useState(null)
  const timerRef = useRef(null)

  const COURSE_COLORS = getCourseColorMap()
  const courseOptions = [...getActiveTermCourses().map(c=>c.name),'OTHER']

  useEffect(()=>{ const id=setInterval(()=>setGreeting(getGreeting()),60000); return()=>clearInterval(id) },[])
  useEffect(()=>{ save('home_tasks',tasks); onDataChange?.() },[tasks])
  useEffect(()=>{ save('timer_settings',timerMins) },[timerMins])
  useEffect(()=>{ save('sem_end_date',semDate) },[semDate])

  const refreshUpcoming=useCallback(()=>{
    const a=getUpcomingAssignments(3),p=getUpcomingPlans(2)
    setUpcoming([...a,...p].slice(0,4))
  },[])
  useEffect(()=>{ refreshUpcoming(); window.addEventListener('drive-loaded',refreshUpcoming); return()=>window.removeEventListener('drive-loaded',refreshUpcoming) },[])
  useEffect(()=>{ refreshUpcoming() },[tasks])

  useEffect(()=>{
    if(running){timerRef.current=setInterval(()=>setSecs(s=>{if(s<=1){clearInterval(timerRef.current);setRunning(false);return timerMins[mode]*60}return s-1}),1000)}
    else clearInterval(timerRef.current)
    return()=>clearInterval(timerRef.current)
  },[running,mode,timerMins])

  const fetchWeather=async(c=city)=>{
    try{
      const cached=sessionStorage.getItem('planner_weather_cache')
      if(cached){const p=JSON.parse(cached);if(p.city===c){setWeather(p);return}}
      const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1`)
      const gd=await geo.json();if(!gd.results?.length)return
      const{latitude,longitude,name}=gd.results[0]
      const wx=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
      const wd=await wx.json();const d={...wd,city:name}
      sessionStorage.setItem('planner_weather_cache',JSON.stringify(d));setWeather(d)
    }catch(e){}
  }
  useEffect(()=>{ fetchWeather() },[])

  // FIX: append to calendar_plans using load/save helpers (not raw localStorage)
  // so multiple tasks on the same date don't overwrite each other
  const addTask=useCallback(()=>{
    if(!newTask.text.trim())return
    setTasks(ts=>[{...newTask,id:Date.now(),done:false},...ts])
    if(newTask.isPlan&&newTask.due){
      const existing=load('calendar_plans',[])
      save('calendar_plans',[...existing,{
        id:'task_'+Date.now(),title:newTask.text,
        date:newTask.due,notes:'',color:'#6366f1',_type:'plan',
      }])
    }
    setNewTask(n=>({...n,text:''})) // keep date/course/urgency for rapid entry
    setTimeout(()=>addInputRef.current?.focus(),0)
  },[newTask])

  const toggleTask =useCallback(id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t)),[])
  const deleteTask =useCallback(id=>setTasks(ts=>ts.filter(t=>t.id!==id)),[])
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
      return updated
    }))
    setEditId(null)
  },[editId,editText,editCourse,editUrgency,editDue,editIsPlan])
  const cancelEdit =useCallback(()=>setEditId(null),[])
  const handleDragStart=useCallback((e,id)=>{setDragId(id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(id))},[])
  const handleDragOver =useCallback((e,id)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOverId(id)},[])
  const handleDrop     =useCallback((e,tid)=>{
    e.preventDefault();if(!dragId||dragId===tid){setDragId(null);setDragOverId(null);return}
    setTasks(ts=>{const a=[...ts.filter(t=>!t.done)],d=ts.filter(t=>t.done),fi=a.findIndex(t=>t.id===dragId),ti=a.findIndex(t=>t.id===tid);if(fi===-1||ti===-1)return ts;const[m]=a.splice(fi,1);a.splice(ti,0,m);return[...a,...d]})
    setDragId(null);setDragOverId(null)
  },[dragId])
  const handleDragEnd=useCallback(()=>{setDragId(null);setDragOverId(null)},[])

  const activeTasks=tasks.filter(t=>!t.done),doneTasks=tasks.filter(t=>t.done)
  const streak=load('streak',0),semDays=semDate?formatRelativeDue(semDate,''):null
  const mm=String(Math.floor(secs/60)).padStart(2,'0'),ss2=String(secs%60).padStart(2,'0')
  const pct=((timerMins[mode]*60-secs)/(timerMins[mode]*60))*100
  const inputSm={padding:'7px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',color:'var(--text-1)',fontSize:12,fontFamily:'inherit'}

  return(
    <>
      <div className="page-header">
        <div><div className="page-title">{greeting}, Jose</div><div className="page-subtitle">{DATE_STR}{IS_CLASS?' · Class day':''}</div></div>
        <div className="badge badge-accent">🔥 {streak}d streak</div>
      </div>
      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="grid-4">
          <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value" style={{color:'var(--accent)'}}>{activeTasks.length}</div><div className="stat-sub">{doneTasks.length} done</div></div>
          <div className="stat-card">
            <div className="stat-label">Semester ends</div>
            <div className="stat-value" style={{color:semDays?.urgent?'var(--coral)':semDays?.warn?'var(--amber)':'var(--accent)',fontSize:22}}>{semDays?semDays.label:'—'}</div>
            {editSemDate?<div style={{display:'flex',gap:4,marginTop:4}}><input type="date" style={{...inputSm,flex:1}} value={semDate} onChange={e=>setSemDate(e.target.value)}/><button className="btn-icon" style={{padding:4}} onClick={()=>setEditSemDate(false)}>✓</button></div>
              :<div style={{fontSize:10,color:'var(--text-3)',marginTop:4,cursor:'pointer'}} onClick={()=>setEditSemDate(true)}>{semDate} · tap to edit</div>}
          </div>
          <div className="stat-card"><div className="stat-label">Today</div><div className="stat-value" style={{color:'var(--teal)',fontSize:22}}>{DAYS_SHORT[DAY_IDX]}</div><div className="stat-sub">{IS_CLASS?'Class day':'No class'}</div></div>
          <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-value" style={{color:'var(--amber)',fontSize:22}}>{upcoming.length}</div><div className="stat-sub">due soon</div></div>
        </div>

        {weather&&(
          <div className="card" style={{padding:'12px 16px'}}>
            <div className="weather-strip" style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              {weather.daily.time.slice(0,7).map((ds,i)=>{const d=new Date(ds+'T12:00:00');return(
                <Tooltip key={i} text={`${i===0?'Today':d.toLocaleDateString('en-US',{weekday:'long'})}: ${Math.round(weather.daily.temperature_2m_max[i])}°/${Math.round(weather.daily.temperature_2m_min[i])}°F`}>
                  <div style={{textAlign:'center',padding:'5px 7px',borderRadius:10,background:i===0?'var(--accent-dim)':'var(--glass-bg)',border:`1px solid ${i===0?'var(--accent)':'var(--glass-border)'}`,minWidth:40,cursor:'default'}}>
                    <div style={{fontSize:9,fontWeight:700,color:i===0?'var(--accent)':'var(--text-3)',marginBottom:1}}>{i===0?'Now':d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                    <div style={{fontSize:13}}>{WX_ICONS[weather.daily.weathercode[i]]||'🌡'}</div>
                    <div style={{fontSize:10,fontWeight:700}}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                  </div>
                </Tooltip>
              )})}
              <button onClick={()=>setShowCityEdit(s=>!s)} style={{background:'none',border:'none',fontSize:11,color:'var(--text-3)',cursor:'pointer',padding:'2px 4px'}}>📍{weather.city}</button>
              {showCityEdit&&(<div style={{display:'flex',gap:4}}>
                <input style={{...inputSm,width:110}} value={cityDraft} onChange={e=>setCityDraft(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&(setCity(cityDraft),save('weather_city',cityDraft),setShowCityEdit(false),sessionStorage.removeItem('planner_weather_cache'),fetchWeather(cityDraft))} autoFocus/>
                <button className="btn-icon" style={{padding:5}} onClick={()=>{setCity(cityDraft);save('weather_city',cityDraft);setShowCityEdit(false);sessionStorage.removeItem('planner_weather_cache');fetchWeather(cityDraft)}}>✓</button>
              </div>)}
            </div>
          </div>
        )}

        <div className="home-main-grid">
          <div className="card home-tasks-col">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span className="card-title" style={{margin:0}}>Today's focus</span>
              <div style={{display:'flex',gap:6}}>
                <Tooltip text="View completed">
                  <button className="btn-icon" onClick={()=>setShowHistory(s=>!s)} style={{padding:5,position:'relative',color:showHistory?'var(--accent)':'var(--text-3)'}}>
                    <History size={13}/>
                    {doneTasks.length>0&&<span style={{position:'absolute',top:-3,right:-3,background:'var(--accent)',color:'white',fontSize:8,fontWeight:700,width:13,height:13,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{doneTasks.length}</span>}
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
                  <button className="btn btn-ghost" onClick={()=>{ if(newTask.text.trim()) addTask(); setShowAdd(false) }} style={{fontSize:12}}>Done</button>
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
            <div className="card">
              <div className="card-title">Upcoming</div>
              {upcoming.length===0?<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>Nothing upcoming</div>
                :upcoming.map((item,i)=>{
                  const due=item._type==='assignment'?formatRelativeDue(item.due,''):null
                  const planDate=item._type==='plan'?new Date(item.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):null
                  const color=item.courseColor||item.color||'var(--accent)',isFirst=i===0
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

            <div className="card" style={{textAlign:'center'}}>
              <div className="card-title">Pomodoro timer</div>
              <div style={{display:'flex',gap:4,justifyContent:'center',marginBottom:14}}>
                {[['focus','🎯 Focus'],['short','☕ Short'],['long','🌿 Long']].map(([k,label])=>(
                  <button key={k} onClick={()=>{setMode(k);setSecs(timerMins[k]*60);setRunning(false)}} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${mode===k?'var(--accent)':'var(--glass-border)'}`,background:mode===k?'var(--accent-dim)':'transparent',color:mode===k?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>{label}</button>
                ))}
              </div>
              <div style={{position:'relative',width:110,height:110,margin:'0 auto 12px'}}>
                <svg width="110" height="110" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--glass-border)" strokeWidth="5"/>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray={`${2*Math.PI*48}`} strokeDashoffset={`${2*Math.PI*48*(1-pct/100)}`} strokeLinecap="round" style={{transition:'stroke-dashoffset .5s'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:22,fontWeight:700}}>{mm}:{ss2}</div>
                  <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{mode}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-primary" onClick={()=>setRunning(r=>!r)} style={{minWidth:80}}>{running?'Pause':'Start'}</button>
                <button className="btn btn-ghost" onClick={()=>{setRunning(false);setSecs(timerMins[mode]*60)}}>Reset</button>
                <button className="btn-icon" onClick={()=>setShowSettings(s=>!s)} style={{padding:7}}>⚙</button>
              </div>
              {showSettings&&(<div style={{marginTop:12,padding:10,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',display:'flex',flexDirection:'column',gap:8}}>
                {[['focus','Focus (min)'],['short','Short break'],['long','Long break']].map(([k,label])=>(
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,flex:1,color:'var(--text-2)',textAlign:'left'}}>{label}</span>
                    <input type="number" min="1" max="120" style={{...inputSm,width:56,textAlign:'center'}} value={draftTimers[k]} onChange={e=>setDraftTimers(d=>({...d,[k]:Number(e.target.value)}))}/>
                  </div>
                ))}
                <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>{setTimerMins(draftTimers);setSecs(draftTimers[mode]*60);setRunning(false);setShowSettings(false)}}>Save</button>
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
