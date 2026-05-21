import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Plus, X, Edit2, ArrowUp, ArrowDown, History, ChevronDown, ChevronUp } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { formatRelativeDue } from '../utils/timeFormat.js'
import { getActiveTermCourses, getAllCourseNames } from '../utils/termData.js'
import Tooltip from '../components/Tooltip.jsx'

// Course colors are now dynamic — built from active term courses
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
const PRIORITY_W = { urgent:4, high:3, medium:2, low:1, none:0 }
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

// Get upcoming assignments from termData structure
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
  const [newTask,      setNewTask]      = useState({text:'',course:'HUM',urgency:'none',due:''})
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
  const timerRef = useRef(null)

  useEffect(()=>{ const id=setInterval(()=>setGreeting(getGreeting()),60000); return()=>clearInterval(id) },[])
  useEffect(()=>{ save('home_tasks',tasks); onDataChange?.(); setUpcoming(getUpcoming(3)) },[tasks])
  useEffect(()=>{ save('timer_settings',timerMins) },[timerMins])
  useEffect(()=>{ save('sem_end_date',semDate) },[semDate])
  useEffect(()=>{ setRunning(false); setSecs(timerMins[mode]*60); clearInterval(timerRef.current) },[mode,timerMins])
  useEffect(()=>{ setUpcoming(getUpcoming(3)) },[])

  useEffect(()=>{
    if(running){ timerRef.current=setInterval(()=>setSecs(s=>{ if(s<=1){ clearInterval(timerRef.current); setRunning(false); save('streak',(load('streak',0)||0)+1); return timerMins[mode]*60 } return s-1 }),1000) }
    else clearInterval(timerRef.current)
    return()=>clearInterval(timerRef.current)
  },[running,mode,timerMins])

  useEffect(()=>{
    const cached=sessionStorage.getItem('planner_weather_cache')
    if(cached){ try{ setWeather(JSON.parse(cached)); return }catch(e){} }
    fetchWeather(city)
  },[city])

  const fetchWeather=async(c)=>{ try{ const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1`); const gd=await geo.json(); if(!gd.results?.length) return; const{latitude,longitude}=gd.results[0]; const wx=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`); const wd=await wx.json(); const res={city:c,daily:wd.daily}; setWeather(res); sessionStorage.setItem('planner_weather_cache',JSON.stringify(res)) }catch(e){} }

  const activeTasks   = tasks.filter(t=>!t.done)
  const doneTasks     = tasks.filter(t=>t.done)
  const toggleTask    = id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t))
  const removeTask    = id=>setTasks(ts=>ts.filter(t=>t.id!==id))
  const addTask       = ()=>{ if(!newTask.text) return; setTasks(ts=>[{id:Date.now(),...newTask,done:false},...ts]); setNewTask({text:'',course:'HUM',urgency:'none',due:''}); setShowAdd(false) }
  const moveUp        = id=>setTasks(ts=>{ const i=ts.findIndex(t=>t.id===id); if(i<=0) return ts; const n=[...ts]; [n[i-1],n[i]]=[n[i],n[i-1]]; return n })
  const moveDown      = id=>setTasks(ts=>{ const i=ts.findIndex(t=>t.id===id); if(i>=ts.length-1) return ts; const n=[...ts]; [n[i],n[i+1]]=[n[i+1],n[i]]; return n })
  const startEdit     = t=>{ setEditId(t.id); setEditForm({text:t.text,course:t.course,urgency:t.urgency||'none',due:t.due||''}) }
  const saveEdit      = ()=>{ setTasks(ts=>ts.map(t=>t.id===editId?{...t,...editForm}:t)); setEditId(null) }
  const restoreTask   = id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:false}:t))

  const streak    = load('streak',0)
  const semDays   = daysUntil(semDate)
  const mm = String(Math.floor(secs/60)).padStart(2,'0')
  const ss = String(secs%60).padStart(2,'0')
  const pct = ((timerMins[mode]*60-secs)/(timerMins[mode]*60))*100
  const inputSm = {padding:'7px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-sm)',color:'var(--text-1)',fontSize:12,fontFamily:'inherit'}

  const COURSE_COLORS = buildCourseColorMap()

  const TaskRow = ({task})=>{
    const urgColor = URGENCY[task.urgency||'none'].color

    return editId===task.id ? (
      <div style={{padding:'10px 0',borderBottom:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
        <input className="inline-input" value={editForm.text} onChange={e=>setEditForm(f=>({...f,text:e.target.value}))} autoFocus/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <select className="inline-input" value={editForm.course} onChange={e=>setEditForm(f=>({...f,course:e.target.value}))}>{Object.keys(COURSE_COLORS).map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className="inline-input" value={editForm.urgency} onChange={e=>setEditForm(f=>({...f,urgency:e.target.value}))}>{Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
          <input type="date" className="inline-input" value={editForm.due} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:8}}><button className="btn btn-primary" onClick={saveEdit} style={{flex:1,fontSize:12}}>Save</button><button className="btn btn-ghost" onClick={()=>setEditId(null)} style={{fontSize:12}}>Cancel</button></div>
      </div>
    ) : (
      <div className="task-row-mobile" style={{
        display:'flex', alignItems:'flex-start', gap:10,
        padding:'10px 10px 10px 14px', marginBottom:4,
        borderRadius:10, position:'relative',
        background:'var(--glass-bg)',
        border:'1px solid var(--glass-border)',
        outline: urgColor ? `2px solid ${urgColor}` : 'none',
        outlineOffset: 3,
        boxShadow: urgColor ? `0 0 12px ${urgColor}33` : 'none',
        transition:'all .2s',
        flexWrap:'wrap',
      }}>
        <button onClick={()=>toggleTask(task.id)} style={{background:'none',border:'none',color:task.done?'var(--accent)':'var(--text-3)',display:'flex',padding:0,cursor:'pointer',flexShrink:0}}>
          {task.done?<CheckCircle2 size={15}/>:<Circle size={15}/>}
        </button>
        <span style={{flex:'1 1 60%',fontSize:13,wordBreak:'break-word',minWidth:0}}>{task.text}</span>
        {task.due&&<span style={{fontSize:10,fontWeight:700,color:daysUntil(task.due)?.color||'var(--text-3)',flexShrink:0}}>{daysUntil(task.due)?.label||''}</span>}
        <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:20,background:'var(--glass-bg-2)',color:COURSE_COLORS[task.course]||'var(--text-3)',border:'1px solid var(--glass-border)',flexShrink:0}}>{task.course}</span>
        <div className="task-actions-mobile" style={{display:'flex',gap:2,flexShrink:0,marginLeft:'auto'}}>
          <button onClick={()=>startEdit(task)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><Edit2 size={11}/></button>
          <button onClick={()=>moveUp(task.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><ArrowUp size={11}/></button>
          <button onClick={()=>moveDown(task.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><ArrowDown size={11}/></button>
          <button onClick={()=>removeTask(task.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2,opacity:.5}}><X size={11}/></button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:20,flexWrap:'wrap'}}>
            <div>
              <div className="page-title">{IS_CLASS?'📚 Class day':greeting}</div>
              <div className="page-subtitle">{DATE_STR}</div>
            </div>
            {/* Weather strip */}
            {weather?.daily&&(
              <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,flexWrap:'wrap'}}>
                {weather.daily.time.slice(0,7).map((date,i)=>{
                  const d=new Date(date+'T12:00:00')
                  return(
                    <Tooltip key={date} text={`${i===0?'Today':d.toLocaleDateString('en-US',{weekday:'long'})}: High ${Math.round(weather.daily.temperature_2m_max[i])}°F / Low ${Math.round(weather.daily.temperature_2m_min[i])}°F`}>
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
                    <input style={{...inputSm,width:110}} value={cityDraft} onChange={e=>setCityDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setCity(cityDraft),save('weather_city',cityDraft),setShowCityEdit(false),sessionStorage.removeItem('planner_weather_cache'),fetchWeather(cityDraft))} autoFocus/>
                    <button className="btn-icon" style={{padding:5}} onClick={()=>{setCity(cityDraft);save('weather_city',cityDraft);setShowCityEdit(false);sessionStorage.removeItem('planner_weather_cache');fetchWeather(cityDraft)}}>✓</button>
                    <button className="btn-icon" style={{padding:5}} onClick={()=>setShowCityEdit(false)}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="badge badge-accent">🔥 {streak}d streak</div>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Stats */}
        <div className="grid-4">
          <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value" style={{color:'var(--accent)'}}>{activeTasks.length}</div><div className="stat-sub">{doneTasks.length} done · {tasks.length} total</div></div>

          {/* Semester countdown */}
          <div className="stat-card">
            <div className="stat-label">Semester ends</div>
            <div className="stat-value" style={{color: semDays?.urgent ? 'var(--coral)' : 'var(--teal)', fontSize:22}}>{semDays?.label||'—'}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
              {editSemDate?(
                <><input type="date" value={semDate} onChange={e=>setSemDate(e.target.value)} style={{...inputSm,fontSize:10,padding:'3px 6px'}}/><button className="btn-icon" style={{padding:3}} onClick={()=>setEditSemDate(false)}>✓</button></>
              ):(
                <button onClick={()=>setEditSemDate(true)} style={{background:'none',border:'none',fontSize:10,color:'var(--text-3)',cursor:'pointer',padding:0}}>📅 {semDate} ✎</button>
              )}
            </div>
          </div>

          {/* Next due — upcoming assignments magazine style */}
          <div className="stat-card" style={{gridColumn:'span 2'}}>
            <div className="stat-label">Upcoming assignments</div>
            {upcoming.length===0?(
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>No upcoming assignments</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:4}}>
                {upcoming.map((a,i)=>{
                  const d    = daysUntil(a.due)
                  const pri  = a.priority && a.priority!=='none'
                  const isFirst = i===0
                  return(
                    <div key={a.id} style={{
                      display:'flex',alignItems:'center',gap:8,
                      padding: isFirst?'8px 10px':'5px 10px',
                      borderRadius:8,
                      background: isFirst?'var(--glass-bg-2)':'transparent',
                      border: isFirst?'1px solid var(--glass-border)':'none',
                      borderLeft: `3px solid ${isFirst?'var(--accent)':'var(--glass-border)'}`,
                      opacity: isFirst?1:0.75,
                      transition:'all .2s',
                    }}>
                      <span style={{fontSize:isFirst?13:11,fontWeight:isFirst?700:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</span>
                      {pri&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:20,background:'rgba(239,68,68,.15)',color:'#ef4444',fontWeight:700,flexShrink:0}}>{a.priority}</span>}
                      <span style={{fontSize:isFirst?12:10,fontWeight:700,color:d?.color||'var(--text-3)',flexShrink:0}}>{d?.label||'—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main — wider tasks, stacks on mobile */}
        <div className="home-main-grid" style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:16,alignItems:'start'}}>

          {/* Tasks card */}
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span className="card-title" style={{margin:0}}>Today's focus</span>
              <div style={{display:'flex',gap:6}}>
                <Tooltip text="Show completed task history — click any to restore">
                  <button className="btn-icon" onClick={()=>setShowHistory(s=>!s)} style={{padding:5,color:showHistory?'var(--accent)':'var(--text-3)',position:'relative'}}>
                    <History size={13}/>
                    {doneTasks.length>0&&<span style={{position:'absolute',top:-4,right:-4,background:'var(--accent)',color:'white',fontSize:9,fontWeight:700,width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{doneTasks.length}</span>}
                  </button>
                </Tooltip>
                <Tooltip text="Add a new task">
                  <button className="btn-icon" onClick={()=>setShowAdd(s=>!s)} style={{padding:5}}><Plus size={13}/></button>
                </Tooltip>
              </div>
            </div>

            {/* Add form */}
            {showAdd&&(
              <div style={{marginBottom:12,padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)',display:'flex',flexDirection:'column',gap:8}}>
                <input className="inline-input" placeholder="Task description" value={newTask.text} onChange={e=>setNewTask(n=>({...n,text:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addTask()} autoFocus/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <select className="inline-input" value={newTask.course} onChange={e=>setNewTask(n=>({...n,course:e.target.value}))}>{Object.keys(COURSE_COLORS).map(c=><option key={c} value={c}>{c}</option>)}</select>
                  <select className="inline-input" value={newTask.urgency} onChange={e=>setNewTask(n=>({...n,urgency:e.target.value}))}>{Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
                  <input type="date" className="inline-input" value={newTask.due} onChange={e=>setNewTask(n=>({...n,due:e.target.value}))}/>
                </div>
                <div style={{display:'flex',gap:8}}><button className="btn btn-primary" onClick={addTask} style={{flex:1}}>Add task</button><button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button></div>
              </div>
            )}

            {/* Active tasks */}
            {activeTasks.length===0&&!showAdd&&<div style={{textAlign:'center',color:'var(--text-3)',fontSize:13,padding:'16px 0'}}>No active tasks — add one above</div>}
            {activeTasks.map(task=><TaskRow key={task.id} task={task}/>)}

            {/* History accordion */}
            {showHistory&&(
              <div style={{marginTop:12,borderTop:'1px solid var(--glass-border)',paddingTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>
                  Completed ({doneTasks.length}) — click to restore
                </div>
                {doneTasks.length===0&&<div style={{fontSize:12,color:'var(--text-3)'}}>No completed tasks yet</div>}
                {doneTasks.map(task=>(
                  <div key={task.id} onClick={()=>restoreTask(task.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,cursor:'pointer',opacity:.6,marginBottom:4,background:'var(--glass-bg)',border:'1px solid var(--glass-border)',transition:'opacity .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.opacity='0.9'} onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}>
                    <CheckCircle2 size={14} style={{color:'var(--accent)',flexShrink:0}}/>
                    <span style={{flex:1,fontSize:12,textDecoration:'line-through',color:'var(--text-3)'}}>{task.text}</span>
                    <span style={{fontSize:10,color:'var(--accent)',fontWeight:600}}>↩ restore</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timer — smaller */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{display:'flex',gap:3,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',padding:3,border:'1px solid var(--glass-border)'}}>
                  {['focus','short','long'].map(m=>(
                    <button key={m} onClick={()=>setMode(m)} style={{padding:'4px 8px',borderRadius:'var(--radius-sm)',border:'none',fontSize:10,fontWeight:600,cursor:'pointer',background:mode===m?'var(--accent)':'transparent',color:mode===m?'white':'var(--text-2)',transition:'all .15s'}}>
                      {m==='focus'?`${timerMins.focus}m`:m==='short'?`${timerMins.short}m`:`${timerMins.long}m`}
                    </button>
                  ))}
                </div>
                <button className="btn-icon" onClick={()=>{setShowSettings(s=>!s);setDraftTimers(timerMins)}} style={{fontSize:13,padding:5}}>⚙</button>
              </div>

              {showSettings&&(
                <div style={{marginBottom:12,padding:10,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)',textAlign:'left'}}>
                  {[['focus','Focus'],['short','Short'],['long','Long']].map(([k,label])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:11,color:'var(--text-2)',flex:1}}>{label} (min)</span>
                      <input type="number" min="1" max="120" value={draftTimers[k]} onChange={e=>setDraftTimers(d=>({...d,[k]:Number(e.target.value)}))} className="inline-input" style={{width:52,textAlign:'center',fontSize:12}}/>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn btn-primary" onClick={()=>{setTimerMins(draftTimers);setShowSettings(false)}} style={{flex:1,fontSize:11}}>Save</button>
                    <button className="btn btn-ghost" onClick={()=>setShowSettings(false)} style={{fontSize:11}}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{position:'relative',width:110,height:110,margin:'0 auto 14px'}}>
                <svg width="110" height="110" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--glass-border)" strokeWidth="5"/>
                  <circle cx="55" cy="55" r="48" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*48}`}
                    strokeDashoffset={`${2*Math.PI*48*(1-pct/100)}`}
                    style={{transition:'stroke-dashoffset .5s linear',filter:running?'drop-shadow(0 0 5px var(--accent))':'none'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:24,fontWeight:700,letterSpacing:2,color:running?'var(--accent)':'var(--text-1)',fontFamily:'var(--font-mono)'}}>{mm}:{ss}</span>
                  <span style={{fontSize:9,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:1}}>{mode}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                <button className="btn btn-primary" onClick={()=>setRunning(r=>!r)} style={{minWidth:72,fontSize:12}}>{running?'Pause':'Start'}</button>
                <button className="btn btn-ghost" onClick={()=>{setRunning(false);setSecs(timerMins[mode]*60)}} style={{fontSize:12}}>Reset</button>
              </div>
            </div>

            {/* Week strip */}
            <div className="card">
              <div className="card-title">This week</div>
              <div style={{display:'flex',gap:4}}>
                {DAYS_SHORT.map((d,i)=>(
                  <div key={d} style={{flex:1,textAlign:'center',padding:'7px 2px',borderRadius:'var(--radius-sm)',cursor:'default',background:i===DAY_IDX?'var(--accent)':(i===1||i===3)?'var(--accent-dim)':'transparent',border:`1px solid ${i===DAY_IDX?'var(--accent)':(i===1||i===3)?'var(--accent)':'var(--glass-border)'}`,boxShadow:i===DAY_IDX?'0 0 10px var(--accent-glow)':'none'}}>
                    <div style={{fontSize:9,fontWeight:700,color:i===DAY_IDX?'white':(i===1||i===3)?'var(--accent)':'var(--text-3)'}}>{d}</div>
                    {(i===1||i===3)&&<div style={{fontSize:8,color:i===DAY_IDX?'white':'var(--accent)',marginTop:1}}>class</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
