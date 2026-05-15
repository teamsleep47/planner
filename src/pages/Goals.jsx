import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'

const HABITS = [
  { id: 1, label: 'Study on off-days',      emoji: '📚', desc: 'Tue, Thu, Fri, Sat, Sun' },
  { id: 2, label: 'Review notes same day',  emoji: '📝', desc: 'After every class' },
  { id: 3, label: 'Read ahead 1 chapter',   emoji: '⏩', desc: 'Stay one step ahead' },
  { id: 4, label: 'No cramming',            emoji: '🧠', desc: 'Spaced review only' },
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
  const [grid, setGrid] = useState(() => load('habit_grid', makeEmptyGrid()))

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
    HABITS.reduce((sum, h) => sum + weekRate(grid[h.id]), 0) / HABITS.length
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Habits</div>
          <div className="page-subtitle">4 habits that keep you ahead</div>
        </div>
        <div className="badge badge-green">{overallRate}% this week</div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Habit grid */}
        <div className="card">
          <div className="card-title">This week</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, minWidth: 200 }}>Habit</th>
                  {DAYS.map((d, i) => (
                    <th key={d} style={{ textAlign: 'center', padding: '0 0 14px', fontSize: 12, fontWeight: 600,
                      color: i === TODAY ? 'var(--accent-light)' : (i === 0 || i === 2) ? 'var(--teal)' : 'var(--text-muted)' }}>
                      {d}
                      {(i === 0 || i === 2) && <div style={{ fontSize: 9, marginTop: 1 }}>class</div>}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map(h => {
                  const row  = grid[h.id]
                  const rate = weekRate(row)
                  return (
                    <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{h.emoji}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{h.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.desc}</div>
                          </div>
                        </div>
                      </td>
                      {row.map((checked, di) => (
                        <td key={di} style={{ textAlign: 'center', padding: '12px 4px' }}>
                          <button onClick={() => toggle(h.id, di)} style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: checked ? 'var(--accent)' : di > TODAY ? 'transparent' : 'var(--bg-hover)',
                            cursor: di <= TODAY ? 'pointer' : 'default',
                            outline: di > TODAY ? '1px dashed var(--border)' : 'none',
                            transition: 'background .15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <span style={{ fontSize: 13, color: 'white' }}>✓</span>}
                          </button>
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700,
                        color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--coral)' }}>
                        {rate}%
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
          <div className="card-title">Summer goals</div>
          {[
            { label: 'Humanities — target A',           pct: 0,  color: 'var(--accent)' },
            { label: 'Written Communication — target A', pct: 0,  color: 'var(--teal)'  },
            { label: 'Study streak — 30 days',          pct: Math.min((load('streak', 0) / 30) * 100, 100), color: 'var(--amber)' },
          ].map(g => (
            <div key={g.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{g.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{Math.round(g.pct)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${g.pct}%`, background: g.color }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Grades will update as you log assignments in the Courses page.
          </p>
        </div>

      </div>
    </>
  )
}
