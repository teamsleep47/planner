import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Plus, X } from 'lucide-react'
import { load, save } from '../utils/storage.js'

const TODAY    = new Date()
const DAY_NAME = TODAY.toLocaleDateString('en-US', { weekday: 'long' })
const DATE_STR = TODAY.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const DAY_IDX  = TODAY.getDay()
const IS_CLASS = DAY_IDX === 1 || DAY_IDX === 3

const COURSE_COLORS = { HUM: 'var(--accent)', WCOM: 'var(--teal)', ANP: 'var(--amber)', GOV: 'var(--coral)', OTHER: 'var(--green)' }
const DEFAULT_TASKS = [
  { id: 1, text: 'Read ahead — Humanities Ch.1',         course: 'HUM',  done: false },
  { id: 2, text: 'Draft discussion post — Written Comm',  course: 'WCOM', done: false },
  { id: 3, text: 'Review notes from last class',          course: 'HUM',  done: false },
]
const DEFAULT_TIMERS = { focus: 25, short: 5, long: 15 }
const WEATHER_KEY    = 'planner_weather'
const WEATHER_TTL    = 30 * 60 * 1000 // 30 min cache

export default function WeeklyHome({ onDataChange }) {
  const [tasks,       setTasks]       = useState(() => load('home_tasks', DEFAULT_TASKS))
  const [timerMins,   setTimerMins]   = useState(() => load('timer_settings', DEFAULT_TIMERS))
  const [mode,        setMode]        = useState('focus')
  const [secs,        setSecs]        = useState(timerMins.focus * 60)
  const [running,     setRunning]     = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newTask,     setNewTask]     = useState({ text: '', course: 'HUM' })
  const [showSettings,setShowSettings]= useState(false)
  const [draftTimers, setDraftTimers] = useState(timerMins)
  const [weather,     setWeather]     = useState(null)
  const [city,        setCity]        = useState(() => load('weather_city', 'Bradenton'))
  const [cityDraft,   setCityDraft]   = useState(city)
  const [showCityEdit,setShowCityEdit]= useState(false)
  const timerRef = useRef(null)
  const streak   = load('streak', 0)

  useEffect(() => { save('home_tasks', tasks); onDataChange?.() }, [tasks])
  useEffect(() => { save('timer_settings', timerMins) }, [timerMins])

  // Reset timer when mode or settings change
  useEffect(() => {
    setRunning(false)
    setSecs(timerMins[mode] * 60)
    clearInterval(timerRef.current)
  }, [mode, timerMins])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(timerRef.current); setRunning(false); const str = load('streak',0); save('streak', str+1); return timerMins[mode]*60 }
          return s - 1
        })
      }, 1000)
    } else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [running, mode, timerMins])

  // Weather fetch
  useEffect(() => {
    const cached = sessionStorage.getItem(WEATHER_KEY)
    if (cached) { try { setWeather(JSON.parse(cached)); return } catch(e) {} }
    fetchWeather(city)
  }, [city])

  const fetchWeather = async (cityName) => {
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`)
      const gd  = await geo.json()
      if (!gd.results?.length) return
      const { latitude, longitude } = gd.results[0]
      const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
      const wd = await wx.json()
      const result = { city: cityName, daily: wd.daily }
      setWeather(result)
      sessionStorage.setItem(WEATHER_KEY, JSON.stringify(result))
    } catch(e) { console.error('weather:', e) }
  }

  const WX_ICONS = { 0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️', 45:'🌫', 48:'🌫', 51:'🌦', 53:'🌦', 55:'🌧', 61:'🌧', 63:'🌧', 65:'🌧', 71:'🌨', 73:'🌨', 75:'❄️', 80:'🌦', 81:'🌧', 82:'⛈', 95:'⛈' }
  const wxIcon = code => WX_ICONS[code] || '🌡'

  const toggleTask = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const addTask    = () => { if (!newTask.text) return; setTasks(ts => [...ts, { id: Date.now(), ...newTask, done: false }]); setNewTask({ text: '', course: 'HUM' }); setShowAdd(false) }
  const removeTask = id => setTasks(ts => ts.filter(t => t.id !== id))

  const saveTimers = () => { setTimerMins(draftTimers); setShowSettings(false) }
  const saveCity   = () => { setCity(cityDraft); save('weather_city', cityDraft); setShowCityEdit(false); fetchWeather(cityDraft) }

  const doneCount = tasks.filter(t => t.done).length
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const pct = ((timerMins[mode] * 60 - secs) / (timerMins[mode] * 60)) * 100

  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{IS_CLASS ? '📚 Class day' : '☀️ Good morning'}</div>
          <div className="page-subtitle">{DAY_NAME}, {DATE_STR}</div>
        </div>
        <div className="badge badge-accent">🔥 {streak} day streak</div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stats */}
        <div className="grid-4">
          <div className="stat-card"><div className="stat-label">Tasks done</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{doneCount}/{tasks.length}</div><div className="stat-sub">today</div></div>
          <div className="stat-card"><div className="stat-label">Streak</div><div className="stat-value" style={{ color: 'var(--amber)' }}>{streak}d</div><div className="stat-sub">days studied</div></div>
          <div className="stat-card"><div className="stat-label">Semester</div><div className="stat-value" style={{ color: 'var(--teal)', fontSize: 18 }}>Summer</div><div className="stat-sub">2 courses</div></div>
          <div className="stat-card"><div className="stat-label">Class days</div><div className="stat-value" style={{ color: 'var(--green)' }}>M / W</div><div className="stat-sub">Mon & Wed</div></div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="card-title" style={{ margin: 0 }}>Today's focus</span>
              <button className="btn-icon" onClick={() => setShowAdd(s => !s)}><Plus size={14} /></button>
            </div>

            {showAdd && (
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <input className="inline-input" placeholder="Task description" value={newTask.text}
                  onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus />
                <select className="inline-input" value={newTask.course} onChange={e => setNewTask(n => ({ ...n, course: e.target.value }))}>
                  {Object.keys(COURSE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={addTask} style={{ flex: 1 }}>Add</button>
                  <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            )}

            {tasks.map(task => (
              <div key={task.id} className={`checkbox-row ${task.done ? 'done' : ''}`}>
                <button onClick={() => toggleTask(task.id)} style={{ background: 'none', border: 'none', color: task.done ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                  {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span style={{ flex: 1 }}>{task.text}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: 'var(--bg-hover)', color: COURSE_COLORS[task.course] || 'var(--text-muted)', flexShrink: 0 }}>{task.course}</span>
                <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0, opacity: .5 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Timer + Week strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Timer */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 3 }}>
                  {['focus','short','long'].map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? 'white' : 'var(--text-secondary)', transition: 'all .15s' }}>
                      {m === 'focus' ? `${timerMins.focus}m` : m === 'short' ? `${timerMins.short}m` : `${timerMins.long}m`}
                    </button>
                  ))}
                </div>
                <button className="btn-icon" onClick={() => { setShowSettings(s => !s); setDraftTimers(timerMins) }} style={{ fontSize: 11, padding: '4px 8px' }}>⚙</button>
              </div>

              {/* Timer settings inline */}
              {showSettings && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Timer settings (minutes)</div>
                  {[['focus','Focus'], ['short','Short break'], ['long','Long break']].map(([k, label]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                      <input type="number" min="1" max="120" value={draftTimers[k]}
                        onChange={e => setDraftTimers(d => ({ ...d, [k]: Number(e.target.value) }))}
                        className="inline-input" style={{ width: 64, textAlign: 'center' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={saveTimers} style={{ flex: 1, fontSize: 12 }}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setShowSettings(false)} style={{ fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 16px' }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="56" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="65" cy="65" r="56" fill="none" stroke={running ? 'var(--accent)' : 'var(--accent-light)'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2*Math.PI*56}`} strokeDashoffset={`${2*Math.PI*56*(1-pct/100)}`} style={{ transition: 'stroke-dashoffset .5s linear' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent-light)' : 'var(--text-primary)' }}>{mm}:{ss}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 80 }}>{running ? 'Pause' : 'Start'}</button>
                <button className="btn btn-ghost" onClick={() => { setRunning(false); setSecs(timerMins[mode]*60) }}>Reset</button>
              </div>
            </div>

            {/* Week strip */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="card-title" style={{ margin: 0 }}>This week</span>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {DAYS_SHORT.map((d, i) => (
                  <div key={d} style={{ flex: 1, textAlign: 'center', padding: '8px 2px', borderRadius: 'var(--radius-sm)', background: i === DAY_IDX ? 'var(--accent)' : (i===1||i===3) ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${i===DAY_IDX ? 'var(--accent)' : (i===1||i===3) ? 'var(--accent)' : 'var(--border)'}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: i===DAY_IDX ? 'white' : (i===1||i===3) ? 'var(--accent-light)' : 'var(--text-muted)' }}>{d}</div>
                    {(i===1||i===3) && <div style={{ fontSize: 8, color: i===DAY_IDX ? 'white' : 'var(--accent-light)', marginTop: 1 }}>class</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="card-title" style={{ margin: 0 }}>Weather — {weather?.city || city}</span>
                {showCityEdit ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className="inline-input" value={cityDraft} onChange={e => setCityDraft(e.target.value)} onKeyDown={e => e.key==='Enter' && saveCity()} style={{ width: 120, fontSize: 11 }} autoFocus />
                    <button className="btn-icon" onClick={saveCity} style={{ padding: 4 }}>✓</button>
                    <button className="btn-icon" onClick={() => setShowCityEdit(false)} style={{ padding: 4 }}>✕</button>
                  </div>
                ) : (
                  <button className="btn-icon" onClick={() => { setShowCityEdit(true); setCityDraft(city) }} style={{ fontSize: 11, padding: '3px 8px' }}>📍 Edit</button>
                )}
              </div>
              {weather?.daily ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  {weather.daily.time.map((date, i) => {
                    const d    = new Date(date + 'T12:00:00')
                    const isTo = i === 0
                    return (
                      <div key={date} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 'var(--radius-sm)', background: isTo ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${isTo ? 'var(--accent)' : 'var(--border)'}` }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: isTo ? 'var(--accent-light)' : 'var(--text-muted)', marginBottom: 3 }}>
                          {isTo ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div style={{ fontSize: 16 }}>{wxIcon(weather.daily.weathercode[i])}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>Loading weather…</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
