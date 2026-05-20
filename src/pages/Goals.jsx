import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

// ── Default habits ────────────────────────────────
const DEFAULT_HABITS = [
  { id:'h1', label:'Study on off-days',     emoji:'📚', desc:'Tue, Thu, Fri, Sat, Sun' },
  { id:'h2', label:'Review notes same day', emoji:'📝', desc:'After every class' },
  { id:'h3', label:'Read ahead 1 chapter',  emoji:'⏩', desc:'Stay one step ahead' },
  { id:'h4', label:'No cramming',           emoji:'🧠', desc:'Spaced review only' },
]

// ── Default recurring tasks ───────────────────────
const DEFAULT_RECURRING = [
  { id:'r1', label:'Review flashcards', emoji:'🃏', recurrence:'daily',   days:[], intervalDays:1,  daysOfWeek:[] },
  { id:'r2', label:'Check Canvas',      emoji:'📋', recurrence:'weekly',  days:[], intervalDays:1,  daysOfWeek:[1,3] },
]

// ── Default goals ─────────────────────────────────
const DEFAULT_GOALS = [
  { id:'g1', label:'Humanities — target A',            pct:0,  color:'var(--accent)', tip:'Track grades in Assignments' },
  { id:'g2', label:'Written Communication — target A', pct:0,  color:'var(--teal)',   tip:'Track grades in Assignments' },
  { id:'g3', label:'Study streak — 30 days',           pct:0,  color:'var(--amber)',  tip:'Complete a study session daily', streakBased:true, streakTarget:30 },
  { id:'g4', label:'Habit consistency — 80%/week',     pct:0,  color:'var(--green)',  tip:'Check off habits daily', habitBased:true },
]

const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TODAY = (new Date().getDay()+6)%7
const DAY_NAMES_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function makeEmptyGrid(habits) {
  return habits.reduce((a,h) => { a[h.id]=Array(7).fill(false); return a }, {})
}

function makeEmptyRecGrid(recurring) {
  return recurring.reduce((a,r) => { a[r.id]={}; return r }, {})
}

function buildHeatmap(grid, history, habits) {
  const days = []
  const now  = new Date()
  for (let i=29; i>=0; i--) {
    const d   = new Date(now); d.setDate(now.getDate()-i)
    const key = d.toISOString().slice(0,10)
    const dow = (d.getDay()+6)%7
    let done  = 0
    if (i < 7 && dow <= TODAY) {
      done = habits.filter(h=>(grid[h.id]||[])[dow]).length
    } else if (history[key] !== undefined) {
      done = history[key]
    }
    days.push({ date:d, key, done, total:habits.length })
  }
  return days
}

function buildRecHeatmap(recHistory, taskId) {
  const days = []
  const now  = new Date()
  for (let i=29; i>=0; i--) {
    const d   = new Date(now); d.setDate(now.getDate()-i)
    const key = d.toISOString().slice(0,10)
    days.push({ date:d, key, done: !!(recHistory[taskId]||{})[key] })
  }
  return days
}

// Color-pulse animation class
const PULSE_STYLE = (color) => ({
  animation: 'statPulse 2s ease-in-out infinite',
  boxShadow: `0 0 0 0 ${color}`,
})

export default function Goals({ onDataChange }) {
  const [habits,    setHabits]    = useState(() => load('habits_config',    DEFAULT_HABITS))
  const [recurring, setRecurring] = useState(() => load('recurring_tasks',  DEFAULT_RECURRING))
  const [goals,     setGoals]     = useState(() => load('goals_config',     DEFAULT_GOALS))
  const [grid,      setGrid]      = useState(() => { const s=load('habit_grid',null); const h=load('habits_config',DEFAULT_HABITS); return s?{...makeEmptyGrid(h),...s}:makeEmptyGrid(h) })
  const [history,   setHistory]   = useState(() => load('habit_history', {}))
  const [recHistory,setRecHistory]= useState(() => load('rec_history',   {}))
  const [activeStatId, setActiveStatId] = useState(null) // for pulse connection

  // Edit states
  const [editHabitId,  setEditHabitId]  = useState(null)
  const [editHabit,    setEditHabit]    = useState({})
  const [editGoalId,   setEditGoalId]   = useState(null)
  const [editGoalLabel,setEditGoalLabel]= useState('')
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [newHabit,     setNewHabit]     = useState({label:'',emoji:'📌',desc:''})
  const [showAddRec,   setShowAddRec]   = useState(false)
  const [newRec,       setNewRec]       = useState({label:'',emoji:'🔁',recurrence:'daily',intervalDays:1,daysOfWeek:[]})
  const [editRecId,    setEditRecId]    = useState(null)
  const [editRec,      setEditRec]      = useState({})

  useEffect(() => { save('habits_config',   habits);    onDataChange?.() }, [habits])
  useEffect(() => { save('recurring_tasks', recurring); onDataChange?.() }, [recurring])
  useEffect(() => { save('goals_config',    goals);     onDataChange?.() }, [goals])
  useEffect(() => { save('habit_grid',      grid);      onDataChange?.() }, [grid])
  useEffect(() => { save('habit_history',   history) }, [history])
  useEffect(() => { save('rec_history',     recHistory) }, [recHistory])

  // Save today to history
  useEffect(() => {
    const key  = new Date().toISOString().slice(0,10)
    const done = habits.filter(h=>(grid[h.id]||[])[TODAY]).length
    setHistory(h => ({...h,[key]:done}))
  }, [grid, habits])

  const toggle = (habitId, dayIdx) => {
    if (dayIdx > TODAY) return
    setGrid(g => ({...g,[habitId]:g[habitId].map((v,i)=>i===dayIdx?!v:v)}))
  }

  const toggleRec = (recId) => {
    const key = new Date().toISOString().slice(0,10)
    setRecHistory(h => ({...h,[recId]:{...(h[recId]||{}),[key]:!(h[recId]||{})[key]}}))
  }

  const weekRate = row => {
    const p=TODAY+1; const d=row.filter((v,i)=>i<=TODAY&&v).length
    return p>0?Math.round((d/p)*100):0
  }
  const overallRate = habits.length > 0
    ? Math.round(habits.reduce((s,h)=>s+weekRate(grid[h.id]||Array(7).fill(false)),0)/habits.length)
    : 0
  const streak = load('streak',0)

  // Compute live goal pcts
  const liveGoals = goals.map(g => {
    if (g.streakBased) return {...g, pct: Math.min((streak/(g.streakTarget||30))*100,100)}
    if (g.habitBased)  return {...g, pct: overallRate}
    return g
  })

  const heatmap    = buildHeatmap(grid, history, habits)
  const heatColor  = (done,total) => {
    if (!total) return 'var(--glass-border)'
    const pct = done/total
    if (pct===0)   return 'var(--glass-bg-2)'
    if (pct<=0.25) return 'rgba(99,102,241,0.2)'
    if (pct<=0.5)  return 'rgba(99,102,241,0.45)'
    if (pct<=0.75) return 'rgba(99,102,241,0.7)'
    return 'var(--accent)'
  }

  const inputStyle = { padding:'7px 10px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:12, fontFamily:'inherit', width:'100%' }

  const addHabit = () => {
    if (!newHabit.label.trim()) return
    const h = {...newHabit, id:'h'+Date.now()}
    setHabits(hs=>[...hs,h])
    setGrid(g=>({...g,[h.id]:Array(7).fill(false)}))
    setNewHabit({label:'',emoji:'📌',desc:''}); setShowAddHabit(false)
  }
  const deleteHabit = id => { setHabits(hs=>hs.filter(h=>h.id!==id)); setGrid(g=>{const n={...g}; delete n[id]; return n}) }
  const saveEditHabit = id => { setHabits(hs=>hs.map(h=>h.id===id?{...h,...editHabit}:h)); setEditHabitId(null) }

  const addRec = () => {
    if (!newRec.label.trim()) return
    setRecurring(rs=>[...rs,{...newRec,id:'r'+Date.now()}])
    setNewRec({label:'',emoji:'🔁',recurrence:'daily',intervalDays:1,daysOfWeek:[]}); setShowAddRec(false)
  }
  const deleteRec   = id => setRecurring(rs=>rs.filter(r=>r.id!==id))
  const saveEditRec = id => { setRecurring(rs=>rs.map(r=>r.id===id?{...r,...editRec}:r)); setEditRecId(null) }

  const saveGoalLabel = id => { setGoals(gs=>gs.map(g=>g.id===id?{...g,label:editGoalLabel}:g)); setEditGoalId(null) }

  const isRecDoneToday = id => !!(recHistory[id]||{})[new Date().toISOString().slice(0,10)]

  return (
    <>
      <style>{`
        @keyframes statPulse {
          0%,100% { box-shadow: 0 0 0 0 var(--accent-glow); }
          50%      { box-shadow: 0 0 0 6px transparent; }
        }
        .habit-row-highlight { background: var(--accent-dim) !important; transition: background .3s; }
      `}</style>

      <div className="page-header">
        <div><div className="page-title">Habits & Goals</div><div className="page-subtitle">Track consistency and recurring tasks</div></div>
        <Tooltip text="Overall habit completion this week">
          <div className="badge badge-green">{overallRate}% this week</div>
        </Tooltip>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* ── Weekly habit grid ── */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span className="card-title" style={{margin:0}}>Weekly habits — click to check off</span>
            <button className="btn-icon" onClick={()=>setShowAddHabit(s=>!s)} style={{padding:5}}><Plus size={13}/></button>
          </div>

          {showAddHabit && (
            <div style={{display:'grid',gridTemplateColumns:'50px 1fr 1fr',gap:8,marginBottom:14,padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)'}}>
              <input style={inputStyle} placeholder="🏷" value={newHabit.emoji} onChange={e=>setNewHabit(n=>({...n,emoji:e.target.value}))}/>
              <input style={inputStyle} placeholder="Habit name" value={newHabit.label} onChange={e=>setNewHabit(n=>({...n,label:e.target.value}))} autoFocus/>
              <input style={inputStyle} placeholder="Description" value={newHabit.desc} onChange={e=>setNewHabit(n=>({...n,desc:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addHabit()}/>
              <div style={{gridColumn:'1/-1',display:'flex',gap:6}}>
                <button className="btn btn-primary" onClick={addHabit} style={{flex:1,fontSize:12}}>Add habit</button>
                <button className="btn btn-ghost" onClick={()=>setShowAddHabit(false)} style={{fontSize:12}}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',paddingBottom:12,fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.06em',minWidth:220}}>Habit</th>
                  {DAYS.map((d,i)=>(
                    <th key={d} style={{textAlign:'center',paddingBottom:12,fontSize:11,fontWeight:700,width:44,minWidth:44,color:i===TODAY?'var(--accent)':(i===0||i===2)?'var(--teal)':'var(--text-3)'}}>
                      {d}{(i===0||i===2)&&<div style={{fontSize:8,marginTop:2}}>class</div>}
                    </th>
                  ))}
                  <th style={{textAlign:'right',paddingBottom:12,fontSize:11,fontWeight:700,color:'var(--text-3)',paddingLeft:16}}>Rate</th>
                  <th style={{width:48}}></th>
                </tr>
              </thead>
              <tbody>
                {habits.map(h => {
                  const row  = grid[h.id]||Array(7).fill(false)
                  const rate = weekRate(row)
                  const isHighlighted = activeStatId === h.id
                  return (
                    <tr key={h.id} style={{borderTop:'1px solid var(--glass-border)'}}>
                      <td style={{padding:'10px 0'}}>
                        {editHabitId===h.id ? (
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <input style={{...inputStyle,width:40}} value={editHabit.emoji} onChange={e=>setEditHabit(f=>({...f,emoji:e.target.value}))}/>
                            <input style={{...inputStyle,flex:1}} value={editHabit.label} onChange={e=>setEditHabit(f=>({...f,label:e.target.value}))} autoFocus/>
                            <button className="btn-icon" style={{padding:4}} onClick={()=>saveEditHabit(h.id)}><Check size={11}/></button>
                            <button className="btn-icon" style={{padding:4}} onClick={()=>setEditHabitId(null)}><X size={11}/></button>
                          </div>
                        ) : (
                          <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 6px',borderRadius:8,background:isHighlighted?'var(--accent-dim)':'transparent',transition:'background .3s'}}>
                            <span style={{fontSize:18}}>{h.emoji}</span>
                            <div>
                              <div style={{fontSize:13,fontWeight:600}}>{h.label}</div>
                              <div style={{fontSize:11,color:'var(--text-3)'}}>{h.desc}</div>
                            </div>
                          </div>
                        )}
                      </td>
                      {row.map((checked,di)=>{
                        const isFuture=di>TODAY, isToday=di===TODAY
                        return (
                          <td key={di} style={{textAlign:'center',padding:'10px 0',verticalAlign:'middle'}}>
                            <button onClick={()=>toggle(h.id,di)} disabled={isFuture} style={{
                              display:'inline-flex',alignItems:'center',justifyContent:'center',
                              width:28,height:28,borderRadius:7,
                              border:`2px solid ${checked?'var(--accent)':isToday?'var(--accent)':isFuture?'var(--glass-border)':'var(--text-3)'}`,
                              background:checked?'var(--accent)':isToday?'var(--accent-dim)':'transparent',
                              cursor:isFuture?'not-allowed':'pointer',opacity:isFuture?.3:1,
                              transition:'all .15s',boxShadow:checked?'0 0 8px var(--accent-glow)':'none',
                            }}>
                              {checked&&<span style={{fontSize:13,color:'white',lineHeight:1}}>✓</span>}
                            </button>
                          </td>
                        )
                      })}
                      <td style={{textAlign:'right',paddingLeft:16,verticalAlign:'middle'}}>
                        <span style={{fontSize:13,fontWeight:700,color:rate>=80?'var(--green)':rate>=50?'var(--amber)':'var(--coral)'}}>{rate}%</span>
                      </td>
                      <td style={{verticalAlign:'middle',paddingLeft:6}}>
                        <div style={{display:'flex',gap:3}}>
                          <button className="btn-icon" style={{padding:3}} onClick={()=>{setEditHabitId(h.id);setEditHabit({emoji:h.emoji,label:h.label,desc:h.desc})}}><Edit2 size={10}/></button>
                          <button className="btn-icon" style={{padding:3,color:'var(--coral)'}} onClick={()=>deleteHabit(h.id)}><Trash2 size={10}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 30-day heatmap ── */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span className="card-title" style={{margin:0}}>Last 30 days — habits</span>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-3)'}}>
              <span>Less</span>
              {[0,1,2,3,4].map(v=><div key={v} style={{width:12,height:12,borderRadius:3,background:heatColor(v,4),border:'1px solid var(--glass-border)'}}/>)}
              <span>More</span>
            </div>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {heatmap.map(day=>(
              <Tooltip key={day.key} text={`${day.date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}: ${day.done}/${day.total} habits`}>
                <div style={{width:22,height:22,borderRadius:4,background:heatColor(day.done,day.total),border:'1px solid var(--glass-border)',cursor:'default',transition:'transform .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
              </Tooltip>
            ))}
          </div>
          <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
            <div style={{fontSize:12,color:'var(--text-2)'}}><span style={{fontWeight:700,color:'var(--accent)'}}>{heatmap.filter(d=>d.done===d.total&&d.total>0).length}</span> perfect days</div>
            <div style={{fontSize:12,color:'var(--text-2)'}}><span style={{fontWeight:700,color:'var(--green)'}}>{heatmap.filter(d=>d.done>0).length}</span> active days</div>
            <div style={{fontSize:12,color:'var(--text-2)'}}><span style={{fontWeight:700,color:'var(--amber)'}}>{streak}</span> current streak</div>
          </div>
        </div>

        {/* ── Recurring tasks ── */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span className="card-title" style={{margin:0}}>Recurring tasks</span>
            <button className="btn-icon" onClick={()=>setShowAddRec(s=>!s)} style={{padding:5}}><Plus size={13}/></button>
          </div>

          {showAddRec && (
            <div style={{padding:12,background:'var(--glass-bg-2)',borderRadius:'var(--radius-md)',border:'1px solid var(--glass-border)',marginBottom:14}}>
              <div style={{display:'grid',gridTemplateColumns:'50px 1fr',gap:8,marginBottom:8}}>
                <input style={inputStyle} placeholder="🔁" value={newRec.emoji} onChange={e=>setNewRec(n=>({...n,emoji:e.target.value}))}/>
                <input style={inputStyle} placeholder="Task name" value={newRec.label} onChange={e=>setNewRec(n=>({...n,label:e.target.value}))} autoFocus/>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:'var(--text-3)',marginBottom:6,fontWeight:600}}>Recurrence</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['daily','every-n-days','weekly'].map(r=>(
                    <button key={r} onClick={()=>setNewRec(n=>({...n,recurrence:r}))} style={{padding:'4px 10px',borderRadius:20,border:`1.5px solid ${newRec.recurrence===r?'var(--accent)':'var(--glass-border)'}`,background:newRec.recurrence===r?'var(--accent-dim)':'transparent',color:newRec.recurrence===r?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                      {r==='daily'?'Daily':r==='every-n-days'?'Every N days':'Weekly'}
                    </button>
                  ))}
                </div>
              </div>
              {newRec.recurrence==='every-n-days' && (
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:12,color:'var(--text-2)'}}>Every</span>
                  <input type="number" min="2" max="30" style={{...inputStyle,width:60}} value={newRec.intervalDays} onChange={e=>setNewRec(n=>({...n,intervalDays:Number(e.target.value)}))}/>
                  <span style={{fontSize:12,color:'var(--text-2)'}}>days</span>
                </div>
              )}
              {newRec.recurrence==='weekly' && (
                <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
                  {DAYS.map((d,i)=>(
                    <button key={i} onClick={()=>setNewRec(n=>({...n,daysOfWeek:n.daysOfWeek.includes(i)?n.daysOfWeek.filter(x=>x!==i):[...n.daysOfWeek,i]}))} style={{padding:'4px 8px',borderRadius:20,border:`1.5px solid ${newRec.daysOfWeek.includes(i)?'var(--accent)':'var(--glass-border)'}`,background:newRec.daysOfWeek.includes(i)?'var(--accent-dim)':'transparent',color:newRec.daysOfWeek.includes(i)?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer'}}>{d}</button>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-primary" onClick={addRec} style={{flex:1,fontSize:12}}>Add</button>
                <button className="btn btn-ghost" onClick={()=>setShowAddRec(false)} style={{fontSize:12}}>Cancel</button>
              </div>
            </div>
          )}

          {recurring.length===0&&!showAddRec&&<div style={{fontSize:12,color:'var(--text-3)',padding:'8px 0'}}>No recurring tasks yet</div>}

          {recurring.map(r => {
            const doneToday = isRecDoneToday(r.id)
            const recHeat   = buildRecHeatmap(recHistory, r.id)
            const doneLast30 = recHeat.filter(d=>d.done).length
            return (
              <div key={r.id} style={{marginBottom:16,padding:'12px 14px',borderRadius:'var(--radius-md)',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)'}}>
                {editRecId===r.id ? (
                  <div style={{display:'grid',gridTemplateColumns:'50px 1fr',gap:8,marginBottom:8}}>
                    <input style={inputStyle} value={editRec.emoji} onChange={e=>setEditRec(f=>({...f,emoji:e.target.value}))}/>
                    <input style={inputStyle} value={editRec.label} onChange={e=>setEditRec(f=>({...f,label:e.target.value}))} autoFocus/>
                    <div style={{gridColumn:'1/-1',display:'flex',gap:6}}>
                      <button className="btn btn-primary" onClick={()=>saveEditRec(r.id)} style={{flex:1,fontSize:12}}>Save</button>
                      <button className="btn btn-ghost" onClick={()=>setEditRecId(null)} style={{fontSize:12}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <button onClick={()=>toggleRec(r.id)} style={{
                      width:28,height:28,borderRadius:7,flexShrink:0,
                      border:`2px solid ${doneToday?'var(--green)':'var(--text-3)'}`,
                      background:doneToday?'var(--green-dim)':'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      cursor:'pointer',transition:'all .15s',
                    }}>
                      {doneToday&&<span style={{fontSize:13,color:'var(--green)',lineHeight:1}}>✓</span>}
                    </button>
                    <span style={{fontSize:14}}>{r.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{r.label}</div>
                      <div style={{fontSize:11,color:'var(--text-3)'}}>
                        {r.recurrence==='daily'?'Daily':r.recurrence==='every-n-days'?`Every ${r.intervalDays} days`:`Weekly: ${(r.daysOfWeek||[]).map(i=>DAYS[i]).join(', ')}`}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn-icon" style={{padding:3}} onClick={()=>{setEditRecId(r.id);setEditRec({emoji:r.emoji,label:r.label})}}><Edit2 size={10}/></button>
                      <button className="btn-icon" style={{padding:3,color:'var(--coral)'}} onClick={()=>deleteRec(r.id)}><Trash2 size={10}/></button>
                    </div>
                  </div>
                )}
                {/* Rec heatmap */}
                <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:6}}>
                  {recHeat.map(day=>(
                    <Tooltip key={day.key} text={`${day.date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}: ${day.done?'Done':'Not done'}`}>
                      <div style={{width:16,height:16,borderRadius:3,background:day.done?'var(--green)':'var(--glass-bg)',border:'1px solid var(--glass-border)',cursor:'default'}}/>
                    </Tooltip>
                  ))}
                </div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>{doneLast30}/30 days completed</div>
              </div>
            )
          })}
        </div>

        {/* ── Semester goals ── */}
        <div className="card">
          <div className="card-title">Semester goals</div>
          {liveGoals.map(g=>(
            <div key={g.id} style={{marginBottom:18}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6,alignItems:'center'}}>
                {editGoalId===g.id ? (
                  <div style={{display:'flex',gap:6,flex:1,marginRight:8}}>
                    <input style={{...inputStyle,flex:1}} value={editGoalLabel} onChange={e=>setEditGoalLabel(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&saveGoalLabel(g.id)}/>
                    <button className="btn-icon" style={{padding:4}} onClick={()=>saveGoalLabel(g.id)}><Check size={11}/></button>
                    <button className="btn-icon" style={{padding:4}} onClick={()=>setEditGoalId(null)}><X size={11}/></button>
                  </div>
                ) : (
                  <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
                    <Tooltip text={g.tip}>
                      <span style={{fontWeight:500,cursor:'help'}}>{g.label}</span>
                    </Tooltip>
                    <button className="btn-icon" style={{padding:2,opacity:.5}} onClick={()=>{setEditGoalId(g.id);setEditGoalLabel(g.label)}}><Edit2 size={10}/></button>
                  </div>
                )}
                <span style={{color:'var(--text-3)',fontWeight:600,flexShrink:0}}>{Math.round(g.pct)}%</span>
              </div>
              <div className="progress-bar" style={{height:8}}>
                <div className="progress-fill" style={{width:`${g.pct}%`,background:g.color}}/>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
