import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const HABITS = [
  { id: 1, label: 'Study on off-days',     emoji: '📚', desc: 'Tue, Thu, Fri, Sat, Sun — use your free days' },
  { id: 2, label: 'Review notes same day', emoji: '📝', desc: 'After every class — reinforces memory' },
  { id: 3, label: 'Read ahead 1 chapter',  emoji: '⏩', desc: 'Stay one step ahead of the syllabus' },
  { id: 4, label: 'No cramming',           emoji: '🧠', desc: 'Spaced review only — active recall beats cramming' },
]

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TODAY = (new Date().getDay() + 6) % 7

function makeEmptyGrid() {
  return HABITS.reduce((acc, h) => {
    acc[h.id] = Array(7).fill(false)
    return acc
  }, {})
}

export default function Goals({ onDataChange }) {
  const [grid, setGrid] = useState(() => {
    const stored = load('habit_grid', null)
    if (!stored) return makeEmptyGrid()
    // Ensure all habit IDs exist
    const base = makeEmptyGrid()
    return { ...base, ...stored }
  })

  useEffect(() => { save('habit_grid', grid); onDataChange?.() }, [grid])

  const toggle = (habitId, dayIdx) => {
    if (dayIdx > TODAY) return
    setGrid(g => ({ ...g, [habitId]: g[habitId].map((v, i) => i === dayIdx ? !v : v) }))
  }

  const weekRate = (row) => {
    const possible = TODAY + 1
    const done = row.filter((v, i) => i <= TODAY && v).length
    return possible > 0 ? Math.round((done / possible) * 100) : 0
  }

  const overallRate = Math.round(
    HABITS.reduce((sum, h) => sum + weekRate(grid[h.id] || Array(7).fill(false)), 0) / HABITS.length
  )

  const streak = load('streak', 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Habits</div>
          <div className="page-subtitle">4 habits that keep you ahead of the curve</div>
        </div>
        <Tooltip text="Your percentage of habits completed so far this week">
          <div className="badge badge-green">{overallRate}% this week</div>
        </Tooltip>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Habit grid */}
        <div className="card">
          <div className="card-title">Weekly habit tracker — click to check off</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 220 }}>
                    Habit
                  </th>
                  {DAYS.map((d, i) => (
                    <th key={d} style={{
                      textAlign: 'center',
                      paddingBottom: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      width: 44,
                      minWidth: 44,
                      color: i === TODAY ? 'var(--accent)' : (i === 0 || i === 2) ? 'var(--teal)' : 'var(--text-3)',
                      letterSpacing: '.04em',
                    }}>
                      {d}
                      {(i === 0 || i === 2) && (
                        <div style={{ fontSize: 8, color: i === TODAY ? 'var(--accent)' : 'var(--teal)', marginTop: 2, fontWeight: 600 }}>class</div>
                      )}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', paddingLeft: 16 }}>
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map((h, hi) => {
                  const row  = grid[h.id] || Array(7).fill(false)
                  const rate = weekRate(row)
                  return (
                    <tr key={h.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '11px 0' }}>
                        <Tooltip text={h.desc} position="right">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'help' }}>
                            <span style={{ fontSize: 20 }}>{h.emoji}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{h.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{h.desc}</div>
                            </div>
                          </div>
                        </Tooltip>
                      </td>
                      {row.map((checked, di) => {
                        const isPast   = di < TODAY
                        const isToday  = di === TODAY
                        const isFuture = di > TODAY
                        return (
                          <td key={di} style={{ textAlign: 'center', padding: '11px 0', verticalAlign: 'middle' }}>
                            <Tooltip
                              text={isFuture ? `${DAYS[di]} — not yet` : `${DAYS[di]}${isToday ? ' (today)' : ''} — click to ${checked ? 'uncheck' : 'check off'}`}
                              position="top"
                            >
                              <button
                                onClick={() => toggle(h.id, di)}
                                disabled={isFuture}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  border: `2px solid ${
                                    checked        ? 'var(--accent)' :
                                    isToday        ? 'var(--accent)' :
                                    isFuture       ? 'var(--glass-border)' :
                                                     'var(--text-3)'
                                  }`,
                                  background: checked
                                    ? 'var(--accent)'
                                    : isToday
                                    ? 'var(--accent-dim)'
                                    : 'transparent',
                                  cursor: isFuture ? 'not-allowed' : 'pointer',
                                  opacity: isFuture ? 0.3 : 1,
                                  transition: 'all .15s',
                                  boxShadow: checked ? '0 0 8px var(--accent-glow)' : 'none',
                                  flexShrink: 0,
                                }}
                                aria-label={`${h.label} ${DAYS[di]}`}
                              >
                                {checked && (
                                  <span style={{ fontSize: 14, color: 'white', lineHeight: 1 }}>✓</span>
                                )}
                              </button>
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'right', paddingLeft: 16, verticalAlign: 'middle' }}>
                        <Tooltip text={`${rate}% of days completed so far this week`}>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--coral)',
                            cursor: 'help',
                          }}>
                            {rate}%
                          </span>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Semester goals */}
        <div className="card">
          <div className="card-title">Summer 2026 goals</div>
          {[
            { label: 'Humanities — target A (90%+)',            pct: 0,  color: 'var(--accent)',  tip: 'Track your grade in the Assignments page' },
            { label: 'Written Communication — target A (90%+)', pct: 0,  color: 'var(--teal)',    tip: 'Track your grade in the Assignments page' },
            { label: `Study streak — 30 days (current: ${streak})`, pct: Math.min((streak / 30) * 100, 100), color: 'var(--amber)', tip: 'Complete a study session every day to build your streak' },
            { label: 'Habit consistency — 80%+ weekly',          pct: overallRate, color: 'var(--green)', tip: 'Check off habits daily to hit 80% consistency' },
          ].map(g => (
            <div key={g.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <Tooltip text={g.tip}>
                  <span style={{ fontWeight: 500, cursor: 'help' }}>{g.label}</span>
                </Tooltip>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{Math.round(g.pct)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${g.pct}%`, background: g.color }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
