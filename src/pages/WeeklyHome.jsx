import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Plus, X, ArrowUp, ArrowDown, History, ChevronDown, ChevronUp } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import { getActiveTermCourses, getAllCourseNames } from '../utils/termData.js'
import Tooltip from '../components/Tooltip.jsx'

function buildCourseColorMap() {
  const courses = getActiveTermCourses()
  const map = { OTHER: 'var(--green)' }
  courses.forEach(c => { map[c.name] = c.color })
  return map
}
const URGENCY = {
  high:   { color:'#ef4444', label:'🔴 Urgent' },
  medium: { color:'#f59e0b', label:'🟡 Soon'   },
  low:    { color:'#22c55e', label:'🟢 Relaxed' },
  none:   { color:null,      label:'No priority' },
}
const DEFAULT_TASKS  = [
  { id:1, text:'Read ahead — Humanities Ch.1', course:'HUM', done:false, urgency:'low',  due:'' },
  { id:2, text:'Draft discussion post',         course:'WCOM',done:false, urgency:'medium',due:'' },
]
const DEFAULT_TIMERS = { focus:25, short:5, long:15 }
const WX_ICONS = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',80:'🌦',82:'⛈',95:'⛈'}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '🌅 Good morning'
  if (h < 17) return '☀️ Good afternoon'
  if (h < 21) return '🌆 Good evening'
  return '🌙 Good night'
}

const DAY_IDX    = new Date().getDay()
const IS_CLASS   = DAY_IDX===1||DAY_IDX===3
const DATE_STR   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysUntil(d, t) { return d ? formatRelativeDue(d, t||'') : null }

function getUpcoming(count=3) {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const active = terms.find(t=>t.active)||terms[0]
    if (!active) return []
    return active.courses
      .flatMap(c => c.assignments.map(a=>({...a, courseName:c.name})))
      .filter(a => a.status!=='Done' && a.due)
      .sort((a,b)=>{
        const pw={urgent:4,high:3,medium:2,low:1,none:0}
        const pd=(pw[b.priority||'none']||0)-(pw[a.priority||'none']||0)
        return pd!==0?pd:new Date(a.due)-new Date(b.due)
      })
      .slice(0,count)
  } catch(e) { return [] }
}

export default function WeeklyHome({ onDataChange }) {
  const [tasks,        setTasks]        = useState(()=>load('home_tasks',DEFAULT_TASKS))
  const [timerMins,    setTimerMins]    = useState(()=>load('timer_settings',DEFAULT_TIMERS))
  const [mode,         setMode]         = useState('focus')
  const [secs,         setSecs]         = useState(()=>load('timer_settings',DEFAULT_TIMERS).focus*60)
  const [running,      setRunning]      = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [newTask,      setNewTask]      = useState({text:'',course:'OTHER',urgency:'none',due:''})
  const [editId,       setEditId]       = useState(null)
  const [editForm,     setEditForm]     = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [draftTimers,  setDraftTimers]  = useState(timerMins)
  const [weather,      setWeather]      = useState(null)
  const [city,         setCity]         = useState(()=>load('weather_city','Bradenton'))
  const [cityDraft,    setCityDraft]    = useState(city)
  const [showCityEdit, setShowCityEdit] = useState(false)
  const [greeting,     setGreeting]     = useState(getGreeting())
  const [semDate,      setSemDate]      = useState(()=>load('sem_end_date','2026-07-31'))
  const [editSemDate,  setEditSemDate]  = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [upcoming,     setUpcoming]     = useState(()=>getUpcoming(3))
  // drag state
  const [dragId,       setDragId]       = useState(null)
  const [dragOverId,   setDragOverId]   = useState(null)
  const timerRef = useRef(null)

  useEffect(()=>{ const id=setInterval(()=>setGreeting(getGreeting()),60000); return()=>clearInterval(id) },[])
  useEffect(()=>{ save('home_tasks',tasks); onDataChange?.() },[tasks])
  useEffect(()=>{ save('timer_settings',timerMins) },[timerMins])
  useEffect(()=>{ save('sem_end_date',semDate) },[semDate])
  useEffect(()=>{ setUpcoming(getUpcoming(3)) },[tasks])

  useEffect(()=>{
    if(running){ timerRef.current=setInterval(()=>setSecs(s=>{ if(s<=1){clearInterval(timerRef.current);setRunning(false);return timerMins[mode]*60} return s-1 }),1000) }
    else clearInterval(timerRef.current)
    return()=>clearInterval(timerRef.current)
  },[running,mode,timerMins])

  const fetchWeather = async (c=city) => {
    try {
      const cached = sessionStorage.getItem('planner_weather_cache')
      if(cached){ const p=JSON.parse(cached); if(p.city===c){ setWeather(p); return } }
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1&language=en&format=json`)
      const gd  = await geo.json()
      if(!gd.results?.length) return
      const {latitude:lat,longitude:lon,name} = gd.results[0]
      const wx  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
      const wd  = await wx.json()
      const d   = {...wd,city:name}
      sessionStorage.setItem('planner_weather_cache',JSON.stringify(d))
      setWeather(d)
    } catch(e){}
  }
  useEffect(()=>{ fetchWeather() },[])

  const addTask    = () => { if(!newTask.text.trim()) return; setTasks(ts=>[...ts,{...newTask,id:Date.now(),done:false}]); setNewTask({text:'',course:'OTHER',urgency:'none',due:''}); setShowAdd(false) }
  const toggleTask = id => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t))
  const deleteTask = id => setTasks(ts=>ts.filter(t=>t.id!==id))
  const startEdit  = task => { setEditId(task.id); setEditForm({text:task.text,course:task.course,urgency:task.urgency||'none',due:task.due||''}) }
  const saveEdit   = () => { setTasks(ts=>ts.map(t=>t.id===editId?{...t,...editForm}:t)); setEditId(null) }
  const restoreTask = id => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:false}:t))

  // Drag handlers
  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed='move' }
  const handleDragOver  = (e, id) => { e.preventDefault(); setDragOverId(id) }
  const handleDrop      = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    setTasks(ts => {
      const active = ts.filter(t=>!t.done)
      const done   = ts.filter(t=>t.done)
      const fromIdx = active.findIndex(t=>t.id===dragId)
      const toIdx   = active.findIndex(t=>t.id===targetId)
      if (fromIdx===-1||toIdx===-1) return ts
      const reordered = [...active]
      const [moved] = reordered.splice(fromIdx,1)
      reordered.splice(toIdx,0,moved)
      return [...reordered, ...done]
    })
    setDragId(null); setDragOverId(null)
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  const streak    = load('streak',0)
  const semDays   = daysUntil(semDate)
  const mm = String(Math.floor(secs/60)).padStart(2,'0')
  const ss = String(secs%60).padStart(2,'0')
  const pct = ((timerMins[mode]*60-secs)/(timerMins[mode]*60))*100
  const inputSm = {padding:'7px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',color:'var(--text-1)',fontSize:12,fontFamily:'inherit'}

  const COURSE_COLORS = buildCourseColorMap()
  // Build course options: active term courses + OTHER
  const courseOptions = [...getActiveTermCourses().map(c=>c.name), 'OTHER']

  const activeTasks = tasks.filter(t=>!t.done)
  const doneTasks   = tasks.filter(t=>t.done)

  const TaskRow = ({task}) => {
    const urgColor = URGENCY[task.urgency||'none'].color
    // course label: show actual course name, fallback to OTHER
    const courseLabel = task.course || 'OTHER'
    const courseColor = COURSE_COLORS[courseLabel] || COURSE_COLORS['OTHER']

    return editId===task.id ? (
      <div style={{padding:'10px 0',borderBottom:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
        <input className="inline-input" value={editForm.text} onChange={e=>setEditForm(f=>({...f,text:e.target.value}))}
          onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') setEditId(null) }} autoFocus/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <select className="inline-input" value={editForm.course} onChange={e=>setEditForm(f=>({...f,course:e.target.value}))}>
            {courseOptions.map(c=><option key={c} value={c}>{c==='OTHER'?'Other':c}</option>)}
          </select>
          <select className="inline-input" value={editForm.urgency} onChange={e=>setEditForm(f=>({...f,urgency:e.target.value}))}>
            {Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" className="inline-input" value={editForm.due} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={saveEdit} style={{flex:1,fontSize:12}}>Save</button>
          <button className="btn btn-ghost" onClick={()=>setEditId(null)} style={{fontSize:12}}>Cancel</button>
        </div>
      </div>
    ) : (
      <div
        draggable
        onDragStart={e=>handleDragStart(e,task.id)}
        onDragOver={e=>handleDragOver(e,task.id)}
        onDrop={e=>handleDrop(e,task.id)}
        onDragEnd={handleDragEnd}
        onDoubleClick={()=>startEdit(task)}
        className="task-row-mobile"
        style={{
          display:'flex', alignItems:'flex-start', gap:8,
          padding:'8px 10px 8px 10px', marginBottom:3,
          borderRadius:10, position:'relative',
          background: dragOverId===task.id ? 'var(--accent-dim)' : 'var(--glass-bg)',
          border:'1px solid var(--glass-border)',
          transition:'all .15s',
          cursor:'grab',
          opacity: dragId===task.id ? 0.4 : 1,
          flexWrap:'wrap',
        }}
      >
        {/* Priority ring — tight to the checkbox */}
        {urgColor && (
          <div style={{
            position:'absolute', left:6, top:'50%', transform:'translateY(-50%)',
            width:28, height:28, borderRadius:'50%',
            border:`2px solid ${urgColor}`,
            boxShadow:`0 0 6px ${urgColor}55`,
            pointerEvents:'none',
          }}/>
        )}

        <button onClick={()=>toggleTask(task.id)} style={{
          background:'none', border:'none',
          color: task.done ? 'var(--green)' : 'var(--text-3)',
          flexShrink:0, display:'flex', padding:2, marginTop:1,
          position:'relative', zIndex:1,
        }}>
          {task.done ? <CheckCircle2 size={18}/> : <Circle size={18}/>}
        </button>

        <span style={{
          flex:1, fontSize:13, fontWeight:500,
          color: task.done ? 'var(--text-3)' : 'var(--text-1)',
          textDecoration: task.done ? 'line-through' : 'none',
          wordBreak:'break-word', paddingTop:2,
          userSelect:'none',
        }}>
          {task.text}
        </span>

        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,flexWrap:'wrap'}}>
          {/* Course badge */}
          <span style={{
            fontSize:10, padding:'2px 7px', borderRadius:20,
            background: courseColor+'22',
            color: courseColor,
            border:`1px solid ${courseColor}44`,
            fontWeight:700,
          }}>
            {courseLabel === 'OTHER' ? 'Other' : courseLabel}
          </span>

          {/* Due date */}
          {task.due && (()=>{
            const d = formatRelativeDue(task.due,'')
            return d ? <span style={{fontSize:10,fontWeight:700,color:d.color}}>{d.label}</span> : null
          })()}

          <button onClick={()=>deleteTask(task.id)} style={{
            background:'none',border:'none',color:'var(--text-3)',
            cursor:'pointer',display:'flex',padding:2,
          }}>
            <X size={13}/>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}, Jose</div>
          <div className="page-subtitle">{DATE_STR}{IS_CLASS?' · Class day':''}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div className="badge badge-accent">🔥 {streak}d streak</div>
        </div>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Stats */}
        <div className="grid-4">
          <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value" style={{color:'var(--accent)'}}>{activeTasks.length}</div><div className="stat-sub">{doneTasks.length} done · {tasks.length} total</div></div>

          <div className="stat-card">
            <div className="stat-label">Semester ends</div>
            <div className="stat-value" style={{color: semDays?.urgent ?'var(--coral)':semDays?.warn?'var(--amber)':'var(--accent)',fontSize:28}}>
              {semDays ? semDays.label : '—'}
            </div>
            {editSemDate
              ? <div style={{display:'flex',gap:4,marginTop:4}}>
                  <input type="date" style={{...inputSm,flex:1}} value={semDate} onChange={e=>setSemDate(e.target.value)}/>
                  <button className="btn-icon" style={{padding:4}} onClick={()=>setEditSemDate(false)}>✓</button>
                </div>
              : <div style={{fontSize:10,color:'var(--text-3)',marginTop:4,cursor:'pointer'}} onClick={()=>setEditSemDate(true)}>
                  {semDate} · tap to edit
                </div>
            }
          </div>

          <div className="stat-card">
            <div className="stat-label">Today</div>
            <div className="stat-value" style={{color:'var(--teal)',fontSize:22}}>{DAYS_SHORT[DAY_IDX]}</div>
            <div className="stat-sub">{IS_CLASS?'Class day':'No class'}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value" style={{color:'var(--amber)',fontSize:28}}>{upcoming.length}</div>
            <div className="stat-sub">assignments due soon</div>
          </div>
        </div>

        {/* Weather strip */}
        {weather && (
          <div className="card" style={{padding:'12px 16px'}}>
            <div className="weather-strip" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {weather.daily.time.slice(0,7).map((dateStr,i)=>{
                const d = new Date(dateStr+'T12:00:00')
                return (
                  <Tooltip key={i} text={`${i===0?'Today':d.toLocaleDateString('en-US',{weekday:'long'})}: High ${Math.round(weather.daily.temperature_2m_max[i])}°F / Low ${Math.round(weather.daily.temperature_2m_min[i])}°F`}>
                    <div style={{textAlign:'center',padding:'5px 7px',borderRadius:10,background:i===0?'var(--accent-dim)':'var(--glass-bg)',border:`1px solid ${i===0?'var(--accent)':'var(--glass-border)'}`,minWidth:40,cursor:'default'}}>
                      <div style={{fontSize:9,fontWeight:700,color:i===0?'var(--accent)':'var(--text-3)',marginBottom:1}}>{i===0?'Now':d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                      <div style={{fontSize:14}}>{WX_ICONS[weather.daily.weathercode[i]]||'🌡'}</div>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--text-1)'}}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                      <div style={{fontSize:9,color:'var(--text-3)'}}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                    </div>
                  </Tooltip>
                )
              })}
              <button onClick={()=>setShowCityEdit(s=>!s)} style={{background:'none',border:'none',fontSize:11,color:'var(--text-3)',cursor:'pointer',padding:'2px 4px'}}>📍{weather.city}</button>
              {showCityEdit&&(
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input style={{...inputSm,width:110}} value={cityDraft} onChange={e=>setCityDraft(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&(setCity(cityDraft),save('weather_city',cityDraft),setShowCityEdit(false),sessionStorage.removeItem('planner_weather_cache'),fetchWeather(cityDraft))} autoFocus/>
                  <button className="btn-icon" style={{padding:5}} onClick={()=>{setCity(cityDraft);save('weather_city',cityDraft);setShowCityEdit(false);sessionStorage.removeItem('planner_weather_cache');fetchWeather(cityDraft)}}>✓</button>
                  <button className="btn-icon" style={{padding:5}} onClick={()=>setShowCityEdit(false)}>✕</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="home-main-grid" style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:16,alignItems:'start'}}>

          {/* Tasks card */}
          <div className="card home-tasks-col">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span className="card-title" style={{margin:0}}>Today's focus</span>
              <div style={{display:'flex',gap:6}}>
                <Tooltip text="Show completed task history — click any to restore">
                  <button className="btn-icon" onClick={()=>setShowHistory(s=>!s)} style={{padding:5,color:showHistory?'var(--accent)':'var(--text-3)'}}>
                    <History size={13}/>
                  </button>
                </Tooltip>
                <Tooltip text="Add a new task">
                  <button className="btn-icon" onClick={()=>setShowAdd(s=>!s)} style={{padding:5}}>
                    {showAdd ? <X size={13}/> : <Plus size={13}/>}
                  </button>
                </Tooltip>
              </div>
            </div>

            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:8}}>Double-click any task to edit · drag to reorder</div>

            {showAdd && (
              <div style={{marginBottom:12,padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
                <input className="inline-input" placeholder="Task description…" value={newTask.text} onChange={e=>setNewTask(n=>({...n,text:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&addTask()} autoFocus/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <select className="inline-input" value={newTask.course} onChange={e=>setNewTask(n=>({...n,course:e.target.value}))}>
                    {courseOptions.map(c=><option key={c} value={c}>{c==='OTHER'?'Other':c}</option>)}
                  </select>
                  <select className="inline-input" value={newTask.urgency} onChange={e=>setNewTask(n=>({...n,urgency:e.target.value}))}>
                    {Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <input type="date" className="inline-input" value={newTask.due} onChange={e=>setNewTask(n=>({...n,due:e.target.value}))}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary" onClick={addTask} style={{flex:1}}>Add task</button>
                  <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            )}

            {activeTasks.length===0&&!showAdd&&<div style={{textAlign:'center',color:'var(--text-3)',fontSize:13,padding:'16px 0'}}>No active tasks — add one above</div>}
            {activeTasks.map(task=><TaskRow key={task.id} task={task}/>)}

            {showHistory && (
              <div style={{marginTop:12,borderTop:'1px solid var(--glass-border)',paddingTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>
                  Completed ({doneTasks.length}) — click to restore
                </div>
                {doneTasks.length===0&&<div style={{fontSize:12,color:'var(--text-3)'}}>No completed tasks yet</div>}
                {doneTasks.map(task=>(
                  <div key={task.id} onClick={()=>restoreTask(task.id)} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                    borderRadius:8,marginBottom:3,cursor:'pointer',
                    background:'var(--glass-bg)',border:'1px solid var(--glass-border)',opacity:.65,
                  }}>
                    <CheckCircle2 size={14} style={{color:'var(--green)',flexShrink:0}}/>
                    <span style={{fontSize:12,color:'var(--text-3)',textDecoration:'line-through',flex:1}}>{task.text}</span>
                    <button onClick={e=>{e.stopPropagation();deleteTask(task.id)}} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,display:'flex'}}>
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{display:'flex',flexDirection:'column',gap:16}} className="home-timer-col">

            {/* Upcoming assignments */}
            <div className="card">
              <div className="card-title">Upcoming assignments</div>
              {upcoming.length===0
                ? <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>Nothing due soon</div>
                : upcoming.map((a,i)=>{
                  const d   = formatRelativeDue(a.due,'')
                  const isFirst = i===0
                  const pri = a.priority && a.priority!=='none'
                  return (
                    <div key={a.id} style={{
                      padding: isFirst?'8px 10px':'5px 10px',
                      borderRadius:8,
                      background: isFirst?'var(--glass-bg-2)':'transparent',
                      border: isFirst?'1px solid var(--glass-border)':'none',
                      borderLeft: `3px solid ${isFirst?'var(--accent)':'var(--glass-border)'}`,
                      opacity: isFirst?1:0.75,
                      transition:'all .2s',
                      marginBottom:4,
                    }}>
                      <span style={{fontSize:isFirst?13:11,fontWeight:isFirst?700:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>{a.title}</span>
                      {pri&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'rgba(239,68,68,.15)',color:'#ef4444',fontWeight:700}}>{a.priority}</span>}
                      <span style={{fontSize:isFirst?12:10,fontWeight:700,color:d?.color||'var(--text-3)'}}>{d?.label||'—'}</span>
                    </div>
                  )
                })
              }
            </div>

            {/* Pomodoro timer */}
            <div className="card" style={{textAlign:'center'}}>
              <div className="card-title">Pomodoro timer</div>
              <div style={{display:'flex',gap:4,justifyContent:'center',marginBottom:14}}>
                {[['focus','🎯 Focus'],['short','☕ Short'],['long','🌿 Long']].map(([k,label])=>(
                  <button key={k} onClick={()=>{setMode(k);setSecs(timerMins[k]*60);setRunning(false)}}
                    style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${mode===k?'var(--accent)':'var(--glass-border)'}`,background:mode===k?'var(--accent-dim)':'transparent',color:mode===k?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Circular progress */}
              <div style={{position:'relative',width:110,height:110,margin:'0 auto 12px'}}>
                <svg width="110" height="110" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--glass-border)" strokeWidth="5"/>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--accent)" strokeWidth="5"
                    strokeDasharray={`${2*Math.PI*48}`}
                    strokeDashoffset={`${2*Math.PI*48*(1-pct/100)}`}
                    strokeLinecap="round" style={{transition:'stroke-dashoffset .5s'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:22,fontWeight:700,color:'var(--text-1)'}}>{mm}:{ss}</div>
                  <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{mode}</div>
                </div>
              </div>

              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-primary" onClick={()=>setRunning(r=>!r)} style={{minWidth:80}}>
                  {running?'Pause':'Start'}
                </button>
                <button className="btn btn-ghost" onClick={()=>{setRunning(false);setSecs(timerMins[mode]*60)}}>Reset</button>
                <button className="btn-icon" onClick={()=>setShowSettings(s=>!s)} style={{padding:7}}>⚙</button>
              </div>

              {showSettings && (
                <div style={{marginTop:12,padding:10,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',display:'flex',flexDirection:'column',gap:8}}>
                  {[['focus','Focus (min)'],['short','Short break'],['long','Long break']].map(([k,label])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,flex:1,color:'var(--text-2)',textAlign:'left'}}>{label}</span>
                      <input type="number" min="1" max="120" style={{...inputSm,width:56,textAlign:'center'}}
                        value={draftTimers[k]} onChange={e=>setDraftTimers(d=>({...d,[k]:Number(e.target.value)}))}/>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>{setTimerMins(draftTimers);setSecs(draftTimers[mode]*60);setRunning(false);setShowSettings(false)}}>Save</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
