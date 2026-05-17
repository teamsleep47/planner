import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Plus, X } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const COURSE_COLORS = {
  HUM: 'var(--accent)', WCOM: 'var(--teal)',
  ANP: 'var(--amber)',  GOV:  'var(--coral)', OTHER: 'var(--green)'
}
const DEFAULT_TASKS   = [
  { id: 1, text: 'Read ahead — Humanities Ch.1',        course: 'HUM',  done: false },
  { id: 2, text: 'Draft discussion post — Written Comm', course: 'WCOM', done: false },
  { id: 3, text: 'Review notes from last class',         course: 'HUM',  done: false },
]
const DEFAULT_TIMERS  = { focus: 25, short: 5, long: 15 }
const WEATHER_KEY     = 'planner_weather_cache'
const WX_ICONS        = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'🌨',73:'🌨',75:'❄️',80:'🌦',81:'🌧',82:'⛈',95:'⛈'}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '🌅 Good morning'
  if (h < 17) return '☀️ Good afternoon'
  if (h < 21) return '🌆 Good evening'
  return '🌙 Good night'
}

const DAY_IDX  = new Date().getDay()
const IS_CLASS = DAY_IDX === 1 || DAY_IDX === 3
const DATE_STR = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function WeeklyHome({ onDataChange }) {
  const [tasks,        setTasks]        = useState(() => load('home_tasks', DEFAULT_TASKS))
  const [timerMins,    setTimerMins]    = useState(() => load('timer_settings', DEFAULT_TIMERS))
  const [mode,         setMode]         = useState('focus')
  const [secs,         setSecs]         = useState((load('timer_settings', DEFAULT_TIMERS).focus) * 60)
  const [running,      setRunning]      = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [newTask,      setNewTask]      = useState({ text: '', course: 'HUM' })
  const [showSettings, setShowSettings] = useState(false)
  const [draftTimers,  setDraftTimers]  = useState(timerMins)
  const [weather,      setWeather]      = useState(null)
  const [city,         setCity]         = useState(() => load('weather_city', 'Bradenton'))
  const [cityDraft,    setCityDraft]    = useState(city)
  const [showCityEdit, setShowCityEdit] = useState(false)
  const [greeting,     setGreeting]     = useState(getGreeting())
  const timerRef = useRef(null)

  // Update greeting every minute
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { save('home_tasks', tasks); onDataChange?.() }, [tasks])
  useEffect(() => { save('timer_settings', timerMins) }, [timerMins])

  useEffect(() => {
    setRunning(false); setSecs(timerMins[mode] * 60)
    clearInterval(timerRef.current)
  }, [mode, timerMins])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(timerRef.current); setRunning(false)
            const str = load('streak', 0); save('streak', str + 1)
            return timerMins[mode] * 60
          }
          return s - 1
        })
      }, 1000)
    } else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [running, mode, timerMins])

  // Weather
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
      const wx  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
      const wd  = await wx.json()
      const result = { city: cityName, daily: wd.daily }
      setWeather(result)
      sessionStorage.setItem(WEATHER_KEY, JSON.stringify(result))
    } catch(e) { console.error('weather:', e) }
  }

  const wxIcon   = code => WX_ICONS[code] || '🌡'
  const toggleTask = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const addTask    = () => {
    if (!newTask.text) return
    setTasks(ts => [...ts, { id: Date.now(), ...newTask, done: false }])
    setNewTask({ text: '', course: 'HUM' }); setShowAdd(false)
  }
  const removeTask = id => setTasks(ts => ts.filter(t => t.id !== id))
  const saveTimers = () => { setTimerMins(draftTimers); setShowSettings(false) }
  const saveCity   = () => { setCity(cityDraft); save('weather_city', cityDraft); setShowCityEdit(false); sessionStorage.removeItem(WEATHER_KEY); fetchWeather(cityDraft) }

  const doneCount = tasks.filter(t => t.done).length
  const streak    = load('streak', 0)
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const pct = ((timerMins[mode] * 60 - secs) / (timerMins[mode] * 60)) * 100

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          {/* Greeting + weather side by side */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="page-title">
                {IS_CLASS ? '📚 Class day' : greeting}
              </div>
              <div className="page-subtitle">{DATE_STR}</div>
            </div>

            {/* Weather inline */}
            {weather?.daily && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {weather.daily.time.slice(0, 7).map((date, i) => {
                  const d    = new Date(date + 'T12:00:00')
                  const isTo = i === 0
                  return (
                    <Tooltip key={date} text={`${isTo ? 'Today' : d.toLocaleDateString('en-US',{weekday:'long'})}: ${wxIcon(weather.daily.weathercode[i])} High ${Math.round(weather.daily.temperature_2m_max[i])}°F / Low ${Math.round(weather.daily.temperature_2m_min[i])}°F`} position="bottom">
                      <div style={{
                        textAlign: 'center', padding: '6px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: isTo ? 'var(--accent-dim)' : 'var(--glass-bg)',
                        border: `1px solid ${isTo ? 'var(--accent)' : 'var(--glass-border)'}`,
                        cursor: 'default', minWidth: 44,
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: isTo ? 'var(--accent)' : 'var(--text-3)', marginBottom: 2 }}>
                          {isTo ? 'Now' : d.toLocaleDateString('en-US',{weekday:'short'})}
                        </div>
                        <div style={{ fontSize: 15 }}>{wxIcon(weather.daily.weathercode[i])}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-1)' }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                      </div>
                    </Tooltip>
                  )
                })}
                <Tooltip text={`Weather for ${weather.city} — click to change city`} position="bottom">
                  <button onClick={() => setShowCityEdit(s => !s)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text-3)', cursor: 'pointer', padding: '2px 4px' }}>
                    📍{weather.city}
                  </button>
                </Tooltip>
                {showCityEdit && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input className="inline-input" value={cityDraft} onChange={e => setCityDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCity()} style={{ width: 120, fontSize: 12 }} autoFocus />
                    <button className="btn-icon" onClick={saveCity} style={{ padding: 5 }}>✓</button>
                    <button className="btn-icon" onClick={() => setShowCityEdit(false)} style={{ padding: 5 }}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <Tooltip text={`${streak} consecutive days studied — keep it going!`}>
          <div className="badge badge-accent">🔥 {streak} day streak</div>
        </Tooltip>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats */}
        <div className="grid-4">
          <Tooltip text="Tasks completed today vs total tasks on your list">
            <div className="stat-card"><div className="stat-label">Tasks done</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{doneCount}/{tasks.length}</div><div className="stat-sub">today</div></div>
          </Tooltip>
          <Tooltip text="Consecutive days you've logged a study session">
            <div className="stat-card"><div className="stat-label">Study streak</div><div className="stat-value" style={{ color: 'var(--amber)' }}>{streak}d</div><div className="stat-sub">days in a row</div></div>
          </Tooltip>
          <Tooltip text="Your current active semester">
            <div className="stat-card"><div className="stat-label">Semester</div><div className="stat-value" style={{ color: 'var(--teal)', fontSize: 18 }}>Summer</div><div className="stat-sub">2 courses active</div></div>
          </Tooltip>
          <Tooltip text="Days when you have class — Mon & Wed. Use other days to get ahead.">
            <div className="stat-card"><div className="stat-label">Class days</div><div className="stat-value" style={{ color: 'var(--green)' }}>M / W</div><div className="stat-sub">Mon & Wed</div></div>
          </Tooltip>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="card-title" style={{ margin: 0 }}>Today's focus</span>
              <Tooltip text="Add a new task to today's list">
                <button className="btn-icon" onClick={() => setShowAdd(s => !s)}><Plus size={14} /></button>
              </Tooltip>
            </div>

            {showAdd && (
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <input className="inline-input" placeholder="Task description" value={newTask.text}
                  onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus />
                <select className="inline-input" value={newTask.course} onChange={e => setNewTask(n => ({ ...n, course: e.target.value }))}>
                  {Object.keys(COURSE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={addTask} style={{ flex: 1 }}>Add task</button>
                  <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '20px 0' }}>No tasks — add one above</div>
            )}

            {tasks.map(task => (
              <div key={task.id} className={`checkbox-row ${task.done ? 'done' : ''}`}>
                <Tooltip text={task.done ? 'Mark as incomplete' : 'Mark as complete'}>
                  <button onClick={() => toggleTask(task.id)} style={{ background: 'none', border: 'none', color: task.done ? 'var(--accent)' : 'var(--text-3)', display: 'flex', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                    {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                </Tooltip>
                <span style={{ flex: 1 }}>{task.text}</span>
                <Tooltip text={`Course: ${task.course}`}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--glass-bg-2)', color: COURSE_COLORS[task.course] || 'var(--text-3)', border: '1px solid var(--glass-border)', flexShrink: 0 }}>{task.course}</span>
                </Tooltip>
                <Tooltip text="Remove this task">
                  <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0, opacity: .5 }}>
                    <X size={12} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>

          {/* Timer + week strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-md)', padding: 3, border: '1px solid var(--glass-border)' }}>
                  {['focus','short','long'].map(m => (
                    <Tooltip key={m} text={m === 'focus' ? `${timerMins.focus}min focused work session` : m === 'short' ? `${timerMins.short}min short break` : `${timerMins.long}min long break`}>
                      <button onClick={() => setMode(m)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? 'white' : 'var(--text-2)', transition: 'all .15s' }}>
                        {m === 'focus' ? `${timerMins.focus}m` : m === 'short' ? `${timerMins.short}m` : `${timerMins.long}m`}
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <Tooltip text="Customize focus, short break, and long break durations">
                  <button className="btn-icon" onClick={() => { setShowSettings(s => !s); setDraftTimers(timerMins) }} style={{ fontSize: 13 }}>⚙</button>
                </Tooltip>
              </div>

              {showSettings && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Timer durations (minutes)</div>
                  {[['focus','Focus session'],['short','Short break'],['long','Long break']].map(([k, label]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>{label}</span>
                      <input type="number" min="1" max="120" value={draftTimers[k]} onChange={e => setDraftTimers(d => ({ ...d, [k]: Number(e.target.value) }))} className="inline-input" style={{ width: 64, textAlign: 'center' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-primary" onClick={saveTimers} style={{ flex: 1, fontSize: 12 }}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setShowSettings(false)} style={{ fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Circle timer */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 18px' }}>
                <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="70" cy="70" r="62" fill="none" stroke="var(--glass-border)" strokeWidth="6" />
                  <circle cx="70" cy="70" r="62" fill="none" stroke={running ? 'var(--accent)' : 'var(--accent-light, var(--accent))'} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 62}`}
                    strokeDashoffset={`${2 * Math.PI * 62 * (1 - pct / 100)}`}
                    style={{ transition: 'stroke-dashoffset .5s linear', filter: running ? 'drop-shadow(0 0 6px var(--accent))' : 'none' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent)' : 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 2 }}>{mode}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Tooltip text={running ? 'Pause the timer' : 'Start the focus timer'}>
                  <button className="btn btn-primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 90 }}>{running ? 'Pause' : 'Start'}</button>
                </Tooltip>
                <Tooltip text="Reset timer to beginning">
                  <button className="btn btn-ghost" onClick={() => { setRunning(false); setSecs(timerMins[mode] * 60) }}>Reset</button>
                </Tooltip>
              </div>
            </div>

            {/* Week strip */}
            <div className="card">
              <div className="card-title">This week</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {DAYS_SHORT.map((d, i) => (
                  <Tooltip key={d} text={`${d}${i === 1 || i === 3 ? ' — class day' : ''}${i === DAY_IDX ? ' — today' : ''}`} position="bottom">
                    <div style={{ flex: 1, textAlign: 'center', padding: '8px 2px', borderRadius: 'var(--radius-sm)', cursor: 'default',
                      background: i === DAY_IDX ? 'var(--accent)' : (i===1||i===3) ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${i===DAY_IDX ? 'var(--accent)' : (i===1||i===3) ? 'var(--accent)' : 'var(--glass-border)'}`,
                      boxShadow: i === DAY_IDX ? '0 0 12px var(--accent-glow)' : 'none',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: i===DAY_IDX ? 'white' : (i===1||i===3) ? 'var(--accent)' : 'var(--text-3)' }}>{d}</div>
                      {(i===1||i===3) && <div style={{ fontSize: 8, color: i===DAY_IDX ? 'white' : 'var(--accent)', marginTop: 1 }}>class</div>}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
