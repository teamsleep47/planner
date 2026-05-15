import { useState } from 'react'
import { Plus, GraduationCap } from 'lucide-react'

const INIT_COURSES = [
  { id: 1, name: 'Data Structures',    color: 'var(--accent)', grade: 88, target: 90 },
  { id: 2, name: 'Technical Writing',  color: 'var(--teal)',   grade: 92, target: 90 },
  { id: 3, name: 'Linear Algebra',     color: 'var(--amber)',  grade: 74, target: 80 },
]

const INIT_ASSIGNMENTS = [
  { id: 1, title: 'HW 4 — Linked lists',      courseId: 1, due: '2026-05-16', status: 'todo',       weight: 10 },
  { id: 2, title: 'Essay draft',               courseId: 2, due: '2026-05-17', status: 'todo',       weight: 20 },
  { id: 3, title: 'Problem set 5',             courseId: 3, due: '2026-05-20', status: 'inprogress', weight: 15 },
  { id: 4, title: 'Midterm study guide',       courseId: 1, due: '2026-05-22', status: 'inprogress', weight: 0  },
  { id: 5, title: 'Essay outline',             courseId: 2, due: '2026-05-10', status: 'done',       weight: 10 },
  { id: 6, title: 'Problem set 4',             courseId: 3, due: '2026-05-08', status: 'done',       weight: 15 },
]

const COLS = [
  { key: 'todo',       label: 'To do',      color: 'var(--text-muted)'  },
  { key: 'inprogress', label: 'In progress', color: 'var(--amber)'      },
  { key: 'done',       label: 'Done',        color: 'var(--green)'      },
]

export default function Courses() {
  const [courses]     = useState(INIT_COURSES)
  const [assignments, setAssignments] = useState(INIT_ASSIGNMENTS)

  const move = (id, status) =>
    setAssignments(as => as.map(a => a.id === id ? { ...a, status } : a))

  const courseOf = id => courses.find(c => c.id === id)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Courses</div>
          <div className="page-subtitle">Assignments, grades, and progress</div>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> Add assignment</button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Course cards */}
        <div className="grid-3">
          {courses.map(c => (
            <div key={c.id} className="card" style={{ borderTop: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <GraduationCap size={15} style={{ color: c.color }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>Grade</span>
                  <span style={{ color: c.grade >= c.target ? 'var(--green)' : 'var(--coral)' }}>
                    {c.grade}% / {c.target}% target
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${c.grade}%`, background: c.color }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {assignments.filter(a => a.courseId === c.id && a.status !== 'done').length} pending assignments
              </div>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
          {COLS.map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: col.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 11, background: 'var(--bg-hover)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 20 }}>
                  {assignments.filter(a => a.status === col.key).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {assignments.filter(a => a.status === col.key).map(a => {
                  const course = courseOf(a.courseId)
                  return (
                    <div key={a.id} className="card" style={{ padding: '12px 14px', borderLeft: `3px solid ${course.color}` }}>
                      <div style={{ fontWeight: 500, marginBottom: 6, fontSize: 13 }}>{a.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Due {new Date(a.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {a.weight > 0 && <span className="badge badge-accent">{a.weight}%</span>}
                      </div>
                      {/* Quick move buttons */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {COLS.filter(c => c.key !== col.key).map(c => (
                          <button
                            key={c.key}
                            className="btn btn-ghost"
                            onClick={() => move(a.id, c.key)}
                            style={{ fontSize: 10, padding: '3px 7px' }}
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
