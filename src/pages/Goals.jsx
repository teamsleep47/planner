import { useState } from 'react'

const HABITS = [
  { id: 1, label: 'Study 2+ hours',   emoji: '📚' },
  { id: 2, label: 'Review notes',      emoji: '📝' },
  { id: 3, label: 'No phone in AM',    emoji: '📵' },
  { id: 4, label: 'Exercise',          emoji: '🏃' },
]

const DAYS = ['M','T','W','T','F','S','S']
const todayCol = (new Date().getDay() + 6) % 7

function makeGrid() {
  return HABITS.reduce((acc, h) => {
    acc[h.id] = DAYS.map((_, i) => i < todayCol ? Math.random() > 0.3 : false)
    return acc
  }, {})
}

const GOALS = [
  { id: 1, title: 'Finish semester with 3.5+ GPA', progress: 68, target: 100, color: 'var(--accent)' },
  { id: 2, title: 'Complete all readings on time',  progress: 55, target: 100, color: 'var(--teal)'   },
  { id: 3, title: '30-day study streak',            progress: 17, target: 30,  color: 'var(--amber)'  },
]

export default function Goals() {
  const [grid, setGrid] = useState(makeGrid)

  const toggle = (habitId, dayIdx) => {
    if (dayIdx > todayCol) return
    setGrid(g => ({ ...g, [habitId]: g[habitId].map((v, i) => i === dayIdx ? !v : v) }))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals & habits</div>
          <div className="page-subtitle">Semester goals and weekly habit tracker</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Semester goals */}
        <div className="card">
          <div className="card-title">Semester goals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {GOALS.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>{g.title}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{g.progress} / {g.target}</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${(g.progress / g.target) * 100}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Habit grid */}
        <div className="card">
          <div className="card-title">This week's habits</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 180 }}>Habit</th>
                  {DAYS.map((d, i) => (
                    <th key={i} style={{ textAlign: 'center', padding: '0 0 12px', fontSize: 12, color: i === todayCol ? 'var(--accent-light)' : 'var(--text-muted)', fontWeight: 600 }}>{d}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map(h => {
                  const row = grid[h.id]
                  const done = row.filter((v, i) => i <= todayCol && v).length
                  const rate = todayCol >= 0 ? Math.round((done / (todayCol + 1)) * 100) : 0
                  return (
                    <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{h.emoji}</span><span>{h.label}</span>
                      </td>
                      {row.map((checked, di) => (
                        <td key={di} style={{ textAlign: 'center', padding: '10px 4px' }}>
                          <button
                            onClick={() => toggle(h.id, di)}
                            style={{
                              width: 26, height: 26,
                              borderRadius: 6,
                              border: 'none',
                              background: checked ? 'var(--accent)' : di > todayCol ? 'var(--border)' : 'var(--bg-hover)',
                              cursor: di <= todayCol ? 'pointer' : 'default',
                              transition: 'background .15s',
                            }}
                            aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {checked && <span style={{ fontSize: 12 }}>✓</span>}
                          </button>
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontSize: 12, color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--coral)', fontWeight: 600 }}>
                        {rate}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
