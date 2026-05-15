import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Flame, ExternalLink, Clock, BookOpen } from 'lucide-react'
import { load, save } from '../utils/storage.js'

const TODAY      = new Date()
const DAY_NAME   = TODAY.toLocaleDateString('en-US', { weekday: 'long' })
const DATE_STR   = TODAY.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const DAY_IDX    = TODAY.getDay() // 0=Sun,1=Mon...
const IS_CLASS   = DAY_IDX === 1 || DAY_IDX === 3 // Mon or Wed
const POMODORO   = 25 * 60

const DEFAULT_TASKS = [
  { id: 1, text: 'Read ahead — Humanities Ch.1',        course: 'HUM',  done: false },
  { id: 2, text: 'Draft discussion post — Written Comm', course: 'WCOM', done: false },
  { id: 3, text: 'Review notes from last class',         course: 'HUM',  done: false },
]

const QUICK_LINKS = [
  { label: 'SCF Planner',      url: 'https://teamsleep47.github.io/scf-planner/', color: 'var(--accent)',  icon: '🎓' },
  { label: 'Canvas',           url: 'https://canvas.instructure.com',              color: 'var(--coral)',   icon: '📋' },
  { label: 'School Portal',    url: '#',                                            color: 'var(--teal)',    icon: '🏫' },
  { label: 'Gmail',            url: 'https://mail.google.com',                     color: 'var(--amber)',   icon: '✉️' },
]

const COURSE_COLORS = { HUM: 'var(--accent)', WCOM: 'var(--teal)', ANP: 'var(--amber)', GOV: 'var(--coral)' }

export default function WeeklyHome() {
  const [tasks,   setTasks]   = useState(() => load('home_tasks', DEFAULT_TASKS))
  const [secs,    setSecs]    = useState(POMODORO)
  const [running, setRunning] = useState(false)
  const [streak,  setStreak]  = useState(() => load('streak', 0))
  const timerRef = useRef(null)

  useEffect(() => { save('home_tasks', tasks) }, [tasks])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(timerRef.current); setRunning(false); return POMODORO }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  const toggleTask = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const doneCount  = tasks.filter(t => t.done).length
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const pct = ((POMODORO - secs) / POMODORO) * 100

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">
            {IS_CLASS ? '📚 Class day' : '☀️ Good morning'}
          </div>
          <div className="page-subtitle">{DAY_NAME}, {DATE_STR}</div>
        </div>
        {IS_CLASS && (
          <div className="badge badge-accent">Class today — stay sharp</div>
        )}
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat row */}
        <div className="grid-4">
          <div className="stat-card">
            <div className="stat-label">Today's tasks</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{doneCount}/{tasks.length}</div>
            <div className="stat-sub">completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Study streak</div>
            <div className="stat-value" style={{ color: 'var(--amber)' }}>{streak}d</div>
            <div className="stat-sub">keep it going</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Semester</div>
            <div className="stat-value" style={{ color: 'var(--teal)', fontSize: 18 }}>Summer</div>
            <div className="stat-sub">2 courses active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Class days</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>M / W</div>
            <div className="stat-sub">Mon & Wed</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* Today's tasks */}
          <div className="card">
            <div className="card-title">Today's focus</div>
            {tasks.map(task => (
              <div key={task.id} className={`checkbox-row ${task.done ? 'done' : ''}`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{ background: 'none', border: 'none', color: task.done ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', padding: 0, cursor: 'pointer' }}
                >
                  {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span style={{ flex: 1 }}>{task.text}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 20, background: 'var(--bg-hover)',
                  color: COURSE_COLORS[task.course] || 'var(--text-muted)'
                }}>{task.course}</span>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 12, fontSize: 12 }}
              onClick={() => {
                const text = prompt('New task:')
                const course = prompt('Course (HUM / WCOM / ANP / GOV):') || 'HUM'
                if (text) setTasks(ts => [...ts, { id: Date.now(), text, course: course.toUpperCase(), done: false }])
              }}
            >
              + Add task
            </button>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Pomodoro */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title">Focus timer</div>
              <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 16px' }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="56" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="65" cy="65" r="56" fill="none"
                    stroke={running ? 'var(--accent)' : 'var(--accent-light)'}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - pct / 100)}`}
                    style={{ transition: 'stroke-dashoffset .5s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                    {mm}:{ss}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 80 }}>
                  {running ? 'Pause' : 'Start'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setRunning(false); setSecs(POMODORO) }}>Reset</button>
              </div>
            </div>

            {/* Class day banner */}
            <div className="card" style={{ background: IS_CLASS ? 'var(--accent-dim)' : 'var(--bg-card)', borderColor: IS_CLASS ? 'var(--accent)' : 'var(--border)' }}>
              <div className="card-title">Week at a glance</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                  <div key={d} style={{
                    flex: 1, textAlign: 'center', padding: '8px 2px',
                    borderRadius: 'var(--radius-sm)',
                    background: i === DAY_IDX ? 'var(--accent)' : (i === 1 || i === 3) ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${i === DAY_IDX ? 'var(--accent)' : (i === 1 || i === 3) ? 'var(--accent)' : 'var(--border)'}`,
                    opacity: i === DAY_IDX ? 1 : 0.7,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: i === DAY_IDX ? 'white' : (i === 1 || i === 3) ? 'var(--accent-light)' : 'var(--text-muted)' }}>{d}</div>
                    {(i === 1 || i === 3) && <div style={{ fontSize: 9, color: i === DAY_IDX ? 'white' : 'var(--accent-light)', marginTop: 2 }}>class</div>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <div className="card-title">Quick links</div>
          <div className="grid-4">
            {QUICK_LINKS.map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  transition: 'border-color .15s', textDecoration: 'none',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = link.color}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: 20 }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{link.label}</div>
                </div>
                <ExternalLink size={12} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
