import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const HABITS = [
  { id:1, label:'Study on off-days',     emoji:'📚', desc:'Tue, Thu, Fri, Sat, Sun — use your free days' },
  { id:2, label:'Review notes same day', emoji:'📝', desc:'After every class — reinforces memory' },
  { id:3, label:'Read ahead 1 chapter',  emoji:'⏩', desc:'Stay one step ahead of the syllabus' },
  { id:4, label:'No cramming',           emoji:'🧠', desc:'Spaced review only — active recall beats cramming' },
]
const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TODAY = (new Date().getDay()+6)%7

function makeEmptyGrid() { return HABITS.reduce((a,h) => { a[h.id]=Array(7).fill(false); return a }, {}) }

// Generate last 30 days of habit data (from stored history + current week)
function buildHeatmap(grid, history) {
  const days = []
  const now  = new Date()
  for (let i = 29; i >= 0; i--) {
    const d    = new Date(now); d.setDate(now.getDate()-i)
    const key  = d.toISOString().slice(0,10)
    const dow  = (d.getDay()+6)%7
    // Use current week grid for recent days, history for older
    let done = 0
    if (i < 7 && dow <= TODAY) {
      done = HABITS.filter(h => (grid[h.id]||[])[dow]).length
    } else if (history[key] !== undefined) {
      done = history[key]
    }
    days.push({ date:d, key, done, total:HABITS.length })
  }
  return days
}

export default function Goals({ onDataChange }) {
  const [grid,    setGrid]    = useState(() => { const s=load('habit_grid',null); return s ? {...makeEmptyGrid(),...s} : makeEmptyGrid() })
  const [history, setHistory] = useState(() => load('habit_history', {}))

  useEffect(() => { save('habit_grid', grid); onDataChange?.() }, [grid])
  useEffect(() => { save('habit_history', history) }, [history])

  // Save today's count to history whenever grid changes
  useEffect(() => {
    const key  = new Date().toISOString().slice(0,10)
    const done = HABITS.filter(h => (grid[h.id]||[])[TODAY]).length
    setHistory(h => ({...h, [key]: done}))
  }, [grid])

  const toggle = (habitId, dayIdx) => {
    if (dayIdx > TODAY) return
    setGrid(g => ({...g, [habitId]: g[habitId].map((v,i) => i===dayIdx ? !v : v)}))
  }

  const weekRate = row => {
    const p = TODAY+1; const d = row.filter((v,i)=>i<=TODAY&&v).length
    return p>0 ? Math.round((d/p)*100) : 0
  }
  const overallRate = Math.round(HABITS.reduce((s,h)=>s+weekRate(grid[h.id]||Array(7).fill(false)),0)/HABITS.length)
  const streak = load('streak',0)
  const heatmap = buildHeatmap(grid, history)

  // Heatmap color
  const heatColor = (done, total) => {
    if (total === 0) return 'var(--glass-border)'
    const pct = done/total
    if (pct === 0)    return 'var(--glass-bg-2)'
    if (pct <= 0.25)  return 'rgba(99,102,241,0.2)'
    if (pct <= 0.5)   return 'rgba(99,102,241,0.45)'
    if (pct <= 0.75)  return 'rgba(99,102,241,0.7)'
    return 'var(--accent)'
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Habits</div>
          <div className="page-subtitle">4 habits that keep you ahead of the curve</div>
        </div>
        <Tooltip text="Percentage of habits completed so far this week">
          <div className="badge badge-green">{overallRate}% this week</div>
        </Tooltip>
      </div>

      <div className="page-body" style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Weekly habit grid */}
        <div className="card">
          <div className="card-title">This week — click to check off</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', paddingBottom:12, fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', minWidth:220 }}>Habit</th>
                  {DAYS.map((d,i)=>(
                    <th key={d} style={{ textAlign:'center', paddingBottom:12, fontSize:11, fontWeight:700, width:44, minWidth:44, color:i===TODAY?'var(--accent)':(i===0||i===2)?'var(--teal)':'var(--text-3)' }}>
                      {d}
                      {(i===0||i===2)&&<div style={{fontSize:8,color:i===TODAY?'var(--accent)':'var(--teal)',marginTop:2}}>class</div>}
                    </th>
                  ))}
                  <th style={{ textAlign:'right', paddingBottom:12, fontSize:11, fontWeight:700, color:'var(--text-3)', paddingLeft:16 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map(h => {
                  const row  = grid[h.id]||Array(7).fill(false)
                  const rate = weekRate(row)
                  return (
                    <tr key={h.id} style={{ borderTop:'1px solid var(--glass-border)' }}>
                      <td style={{ padding:'11px 0' }}>
                        <Tooltip text={h.desc} position="right">
                          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'help' }}>
                            <span style={{fontSize:20}}>{h.emoji}</span>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)'}}>{h.label}</div>
                              <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{h.desc}</div>
                            </div>
                          </div>
                        </Tooltip>
                      </td>
                      {row.map((checked,di)=>{
                        const isFuture = di>TODAY, isToday=di===TODAY
                        return (
                          <td key={di} style={{ textAlign:'center', padding:'11px 0', verticalAlign:'middle' }}>
                            <Tooltip text={isFuture?`${DAYS[di]} — not yet`:`${DAYS[di]}${isToday?' (today)':''} — ${checked?'uncheck':'check off'}`}>
                              <button onClick={()=>toggle(h.id,di)} disabled={isFuture} style={{
                                display:'inline-flex', alignItems:'center', justifyContent:'center',
                                width:30, height:30, borderRadius:8,
                                border:`2px solid ${checked?'var(--accent)':isToday?'var(--accent)':isFuture?'var(--glass-border)':'var(--text-3)'}`,
                                background:checked?'var(--accent)':isToday?'var(--accent-dim)':'transparent',
                                cursor:isFuture?'not-allowed':'pointer',
                                opacity:isFuture?0.3:1, transition:'all .15s',
                                boxShadow:checked?'0 0 8px var(--accent-glow)':'none',
                              }}>
                                {checked&&<span style={{fontSize:14,color:'white',lineHeight:1}}>✓</span>}
                              </button>
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td style={{ textAlign:'right', paddingLeft:16, verticalAlign:'middle' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:rate>=80?'var(--green)':rate>=50?'var(--amber)':'var(--coral)' }}>{rate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 30-day heatmap */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span className="card-title" style={{margin:0}}>Last 30 days</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-3)' }}>
              <span>Less</span>
              {[0,1,2,3,4].map(v=>(
                <div key={v} style={{ width:12, height:12, borderRadius:3, background:heatColor(v,4), border:'1px solid var(--glass-border)' }}/>
              ))}
              <span>More</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {heatmap.map((day,i)=>(
              <Tooltip key={day.key} text={`${day.date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}: ${day.done}/${day.total} habits completed`}>
                <div style={{
                  width:22, height:22, borderRadius:4,
                  background:heatColor(day.done, day.total),
                  border:'1px solid var(--glass-border)',
                  cursor:'default',
                  boxShadow:day.done===day.total&&day.total>0?'0 0 6px var(--accent-glow)':'none',
                  transition:'transform .1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                />
              </Tooltip>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
            <div style={{fontSize:12,color:'var(--text-2)'}}>
              <span style={{fontWeight:700,color:'var(--accent)'}}>
                {heatmap.filter(d=>d.done===d.total&&d.total>0).length}
              </span> perfect days
            </div>
            <div style={{fontSize:12,color:'var(--text-2)'}}>
              <span style={{fontWeight:700,color:'var(--green)'}}>
                {heatmap.filter(d=>d.done>0).length}
              </span> active days
            </div>
            <div style={{fontSize:12,color:'var(--text-2)'}}>
              <span style={{fontWeight:700,color:'var(--amber)'}}>
                {streak}
              </span> current streak
            </div>
          </div>
        </div>

        {/* Semester goals */}
        <div className="card">
          <div className="card-title">Summer 2026 goals</div>
          {[
            { label:'Humanities — target A',             pct:0,  color:'var(--accent)',  tip:'Track grades in the Assignments page' },
            { label:'Written Communication — target A',   pct:0,  color:'var(--teal)',    tip:'Track grades in the Assignments page' },
            { label:`Study streak — 30 days (${streak} now)`, pct:Math.min((streak/30)*100,100), color:'var(--amber)', tip:'Complete a study session every day' },
            { label:`Habit consistency — 80%+ (${overallRate}% this week)`, pct:overallRate, color:'var(--green)', tip:'Check off habits daily to hit 80%' },
          ].map(g=>(
            <div key={g.label} style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                <Tooltip text={g.tip}><span style={{fontWeight:500,cursor:'help'}}>{g.label}</span></Tooltip>
                <span style={{color:'var(--text-3)',fontWeight:600}}>{Math.round(g.pct)}%</span>
              </div>
              <div className="progress-bar" style={{height:7}}>
                <div className="progress-fill" style={{width:`${g.pct}%`,background:g.color}}/>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
