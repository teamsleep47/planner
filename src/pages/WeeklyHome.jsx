import { useState } from 'react'
import { CheckCircle2, Circle, Flame, BookOpen, Clock, Target } from 'lucide-react'

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric'
})

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayIdx  = (new Date().getDay() + 6) % 7

const SAMPLE_TASKS = [
  { id: 1, text: 'Review Chapter 4 notes',         due: 'Today',     done: false, color: 'accent' },
  { id: 2, text: 'Submit assignment 2 draft',       due: 'Today',     done: false, color: 'coral'  },
  { id: 3, text: 'Read Smith et al. paper',         due: 'Tomorrow',  done: false, color: 'teal'   },
  { id: 4, text: 'Watch recorded lecture — week 6', due: 'Thu',       done: true,  color: 'amber'  },
]

const SAMPLE_PRIORITIES = [
  'Finish assignment 2 draft by midnight',
  'Study for Thursday quiz — Ch. 3 & 4',
  'Email professor about office hours',
]

export default function WeeklyHome() {
  const [tasks, setTasks]         = useState(SAMPLE_TASKS)
  const [priorities]              = useState(SAMPLE_PRIORITIES)
  const [focusMinutes, setFocus]  = useState(0)
  const [timerRunning, setTimer]  = useState(false)

  const toggleTask = id =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const doneCount = tasks.filter(t => t.done).length
  const streak    = 5 // placeholder — will come from Drive data

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Good morning</div>
          <div className="page-subtitle">{TODAY}</div>
        </div>
        <div className="badge badge-accent">
          <Flame size={12} /> {streak} day streak
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat row */}
        <div className="grid-4">
          <StatCard label="Tasks done"   value={`${doneCount}/${tasks.length}`} sub="today"          color="var(--accent)" />
          <StatCard label="Study time"   value="2h 15m"   sub="this week"       color="var(--teal)"  />
          <StatCard label="Assignments"  value="3"         sub="due this week"   color="var(--amber)" />
          <StatCard label="Goal streak"  value={`${streak}d`} sub="habits on track" color="var(--green)" />
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* Today's tasks */}
          <div className="card">
            <div className="card-title">Today's tasks</div>
            {tasks.map(task => (
              <div key={task.id} className={`checkbox-row ${task.done ? 'done' : ''}`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{ background: 'none', border: 'none', color: task.done ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', padding: 0 }}
                  aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span style={{ flex: 1 }}>{task.text}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.due}</span>
              </div>
            ))}
          </div>

          {/* Top priorities + quick focus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-title">Top 3 priorities</div>
              {priorities.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>

            <FocusTimer />
          </div>
        </div>

        {/* Week overview strip */}
        <div className="card">
          <div className="card-title">This week</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {WEEK_DAYS.map((day, i) => (
              <div
                key={day}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 4px',
                  borderRadius: 'var(--radius-md)',
                  background: i === todayIdx ? 'var(--accent-dim)' : 'transparent',
                  border: i === todayIdx ? '1px solid var(--accent)' : '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <div style={{ color: i === todayIdx ? 'var(--accent-light)' : 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{day}</div>
                <div style={{ color: i <= todayIdx ? 'var(--green)' : 'var(--border-hover)', fontSize: 10 }}>
                  {i < todayIdx ? '✓' : i === todayIdx ? '●' : '○'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

function FocusTimer() {
  const POMODORO = 25 * 60
  const [secs, setSecs]     = useState(POMODORO)
  const [running, setRun]   = useState(false)
  const [iRef, setIRef]     = useState(null)

  const toggle = () => {
    if (running) {
      clearInterval(iRef)
      setRun(false)
    } else {
      const id = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(id); setRun(false); return POMODORO }
          return s - 1
        })
      }, 1000)
      setIRef(id)
      setRun(true)
    }
  }

  const reset = () => { clearInterval(iRef); setRun(false); setSecs(POMODORO) }

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const pct = ((POMODORO - secs) / POMODORO) * 100

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-title">Focus timer</div>
      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent-light)' : 'var(--text-primary)', margin: '8px 0' }}>
        {mm}:{ss}
      </div>
      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={toggle} style={{ minWidth: 72 }}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="btn btn-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}
