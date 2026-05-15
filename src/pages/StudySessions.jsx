import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Plus } from 'lucide-react'

const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

const INIT_SESSIONS = [
  { id: 1, subject: 'Data Structures', date: 'Today',     mins: 50, note: 'Reviewed trees & heaps' },
  { id: 2, subject: 'Linear Algebra',  date: 'Today',     mins: 25, note: 'Practice problems ch.3' },
  { id: 3, subject: 'Technical Writing', date: 'Yesterday', mins: 75, note: 'Outlined essay sections' },
  { id: 4, subject: 'Data Structures', date: 'Yesterday', mins: 50, note: 'Sorting algorithms' },
]

const SUBJECTS = ['Data Structures', 'Technical Writing', 'Linear Algebra', 'Other']

export default function StudySessions() {
  const [mode, setMode]       = useState('focus')
  const [secs, setSecs]       = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [sessions, setSessions] = useState(INIT_SESSIONS)
  const intervalRef = useRef(null)

  useEffect(() => {
    setSecs(DURATIONS[mode])
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [mode])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (mode === 'focus') {
              setSessions(prev => [{
                id: Date.now(),
                subject,
                date: 'Today',
                mins: 25,
                note: 'Completed pomodoro',
              }, ...prev])
            }
            return DURATIONS[mode]
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, subject])

  const reset = () => { setRunning(false); setSecs(DURATIONS[mode]) }

  const mm  = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss  = String(secs % 60).padStart(2, '0')
  const pct = ((DURATIONS[mode] - secs) / DURATIONS[mode]) * 100

  const totalMins = sessions.filter(s => s.date === 'Today').reduce((a, s) => a + s.mins, 0)

  const bySubject = SUBJECTS.map(s => ({
    subject: s,
    mins: sessions.filter(x => x.subject === s).reduce((a, x) => a + x.mins, 0)
  })).filter(x => x.mins > 0)

  const maxMins = Math.max(...bySubject.map(x => x.mins), 1)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Study sessions</div>
          <div className="page-subtitle">Focus timer and session log</div>
        </div>
        <div className="badge badge-teal">{totalMins}m studied today</div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>

          {/* Timer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                {Object.keys(DURATIONS).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
                      border: 'none', fontSize: 12, fontWeight: 600,
                      background: mode === m ? 'var(--accent)' : 'transparent',
                      color: mode === m ? 'white' : 'var(--text-secondary)',
                      transition: 'all .15s',
                    }}
                  >
                    {m === 'focus' ? 'Focus 25m' : m === 'short' ? 'Break 5m' : 'Long 15m'}
                  </button>
                ))}
              </div>

              {/* Subject */}
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ width: '100%', marginBottom: 20, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Clock face */}
              <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 20px' }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={running ? 'var(--accent)' : 'var(--accent-light)'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                    style={{ transition: 'stroke-dashoffset .5s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                    {mm}:{ss}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>{mode}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 90 }}>
                  {running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
                </button>
                <button className="btn btn-ghost" onClick={reset}><RotateCcw size={14} /></button>
              </div>
            </div>

            {/* Time by subject */}
            <div className="card">
              <div className="card-title">Time by subject — all time</div>
              {bySubject.map(({ subject: s, mins }) => (
                <div key={s} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{mins}m</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(mins / maxMins) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ margin: 0 }}>Session log</span>
            </div>
            {sessions.map((s, i) => (
              <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 40, textAlign: 'center', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', padding: '6px 4px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-light)' }}>{s.mins}m</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.note}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.date}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
