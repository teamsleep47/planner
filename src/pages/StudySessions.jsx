import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Brain } from 'lucide-react'
import Tooltip from '../components/Tooltip.jsx'
import { load, save } from '../utils/storage.js'

const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }
const COURSES   = ['Humanities', 'Written Communication', 'Anatomy & Physiology', 'A&P Lab', 'American Government']

export default function StudySessions({ onDataChange }) {
  const [mode,     setMode]     = useState('focus')
  const [secs,     setSecs]     = useState(DURATIONS.focus)
  const [running,  setRunning]  = useState(false)
  const [course,   setCourse]   = useState(COURSES[0])
  const [sessions, setSessions] = useState(() => load('study_sessions', []))
  const [weekGoal,  setWeekGoal]  = useState(() => load('study_week_goal', 10))
  const [editGoal,  setEditGoal]  = useState(false)
  const [draftGoal, setDraftGoal] = useState(weekGoal)
  const [recall,   setRecall]   = useState(null)   // {sessionId, text, submitted}
  const [recallInput, setRecallInput] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => { save('study_sessions', sessions); onDataChange?.() }, [sessions])
  useEffect(() => { save('study_week_goal', weekGoal) }, [weekGoal])

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
            if (mode === 'focus') completeSession()
            return DURATIONS[mode]
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, course])

  const completeSession = () => {
    const id = Date.now()
    setSessions(prev => [{
      id,
      course,
      mins: Math.round(DURATIONS[mode] / 60),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      recall: '',
    }, ...prev])
    setRecall({ sessionId: id, submitted: false })
    setRecallInput('')
  }

  const submitRecall = () => {
    if (!recallInput.trim()) return
    setSessions(prev => prev.map(s => s.id === recall.sessionId ? { ...s, recall: recallInput } : s))
    setRecall({ ...recall, submitted: true })
    // Update streak
    const streak = load('streak', 0)
    save('streak', streak + 1)
  }

  const mm  = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss2 = String(secs % 60).padStart(2, '0')
  const pct = ((DURATIONS[mode] - secs) / DURATIONS[mode]) * 100

  const todayStr   = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekMins   = sessions.filter(s => { try { return new Date(s.date) >= weekStart } catch(e){ return false } }).reduce((a,s)=>a+s.mins,0)
  const weekGoalMins = weekGoal * 60
  const weekPct    = Math.min((weekMins / weekGoalMins) * 100, 100)
  const todayMins  = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + s.mins, 0)
  const totalSessions = sessions.length
  const withRecall    = sessions.filter(s => s.recall).length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Study sessions</div>
          <div className="page-subtitle">Focus timer with active recall</div>
        </div>
        <div className="badge badge-teal">{todayMins}m studied today</div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>

          {/* Timer side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Active recall prompt — shows after completed pomodoro */}
            {recall && !recall.submitted && (
              <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Brain size={16} style={{ color: 'var(--accent-light)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-light)' }}>Active recall</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Great session! Without looking — what's one thing you can explain from what you just studied?
                </p>
                <textarea
                  value={recallInput}
                  onChange={e => setRecallInput(e.target.value)}
                  placeholder="Type anything, even a rough answer..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={submitRecall}>Save recall</button>
                  <button className="btn btn-ghost" onClick={() => setRecall(null)}>Skip</button>
                </div>
              </div>
            )}

            {recall?.submitted && (
              <div className="card" style={{ borderColor: 'var(--green)', background: 'var(--green-dim)', textAlign: 'center', padding: '16px' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Recall saved — that's how you make it stick</span>
              </div>
            )}

            {/* Timer */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                {Object.keys(DURATIONS).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)', border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                    background: mode === m ? 'var(--accent)' : 'transparent',
                    color: mode === m ? 'white' : 'var(--text-secondary)',
                  }}>
                    {m === 'focus' ? 'Focus 25m' : m === 'short' ? 'Break 5m' : 'Long 15m'}
                  </button>
                ))}
              </div>

              <select value={course} onChange={e => setCourse(e.target.value)} style={{
                width: '100%', marginBottom: 20, padding: '8px 12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13,
              }}>
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Circle */}
              <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 20px' }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle cx="80" cy="80" r="70" fill="none"
                    stroke={running ? 'var(--accent)' : 'var(--accent-light)'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                    style={{ transition: 'stroke-dashoffset .5s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2, color: running ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                    {mm}:{ss2}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>{mode}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 90 }}>
                  {running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
                </button>
                <button className="btn btn-ghost" onClick={() => { setRunning(false); setSecs(DURATIONS[mode]) }}>
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ gap: 10 }}>
              <div className="stat-card">
                <div className="stat-label">Today</div>
                <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 20 }}>{todayMins}m</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Sessions</div>
                <div className="stat-value" style={{ color: 'var(--teal)', fontSize: 20 }}>{totalSessions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Recalls</div>
                <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{withRecall}</div>
              </div>
            </div>
          </div>

          {/* Weekly goal */}
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span className="card-title" style={{margin:0}}>Weekly study goal</span>
                <Tooltip text="Set your weekly study hour target — click to edit">
                  {editGoal ? (
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <input type="number" min="1" max="100" value={draftGoal} onChange={e=>setDraftGoal(Number(e.target.value))} className="inline-input" style={{width:56,textAlign:'center',fontSize:12}}/>
                      <span style={{fontSize:12,color:'var(--text-3)'}}>hrs</span>
                      <button className="btn-icon" onClick={()=>{setWeekGoal(draftGoal);setEditGoal(false)}} style={{padding:4}}>✓</button>
                    </div>
                  ) : (
                    <button onClick={()=>{setEditGoal(true);setDraftGoal(weekGoal)}} style={{background:'none',border:'none',fontSize:12,color:'var(--text-3)',cursor:'pointer'}}>
                      {weekGoal}h goal ✎
                    </button>
                  )}
                </Tooltip>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)',marginBottom:6}}>
                  <span>{Math.round(weekMins/60*10)/10}h studied this week</span>
                  <span style={{color:weekPct>=100?'var(--green)':weekPct>=50?'var(--amber)':'var(--text-3)',fontWeight:600}}>{Math.round(weekPct)}%</span>
                </div>
                <div className="progress-bar" style={{height:8}}>
                  <div className="progress-fill" style={{width:`${weekPct}%`,background:weekPct>=100?'var(--green)':weekPct>=50?'var(--amber)':'var(--accent)'}}/>
                </div>
              </div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>
                {weekPct>=100 ? '🎉 Goal reached this week!' : `${Math.round((weekGoalMins-weekMins)/60*10)/10}h remaining to hit your ${weekGoal}h goal`}
              </div>
            </div>

          {/* Session log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
              <span className="card-title" style={{ margin: 0 }}>Session log</span>
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No sessions yet — start a pomodoro!
              </div>
            ) : sessions.map((s, i) => (
              <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.course}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.date} · {s.mins}m</span>
                </div>
                {s.recall && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--accent-dim)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', marginTop: 4 }}>
                    <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Recall: </span>{s.recall}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
