import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { load, save } from '../utils/storage.js'

const SEMESTERS = {
  summer: {
    label: 'Summer 2026',
    color: 'var(--amber)',
    courses: ['Humanities', 'Written Communication'],
  },
  fall: {
    label: 'Fall 2026',
    color: 'var(--teal)',
    courses: ['Anatomy & Physiology', 'A&P Lab', 'American Government'],
  },
}

const TYPES = ['Essay', 'Discussion Post', 'Reading Response', 'Quiz', 'Exam', 'Lab Report', 'Other']
const STATUS = ['To do', 'In progress', 'Done']
const STATUS_COLOR = { 'To do': 'var(--text-muted)', 'In progress': 'var(--amber)', 'Done': 'var(--green)' }
const STATUS_BG    = { 'To do': 'var(--bg-hover)', 'In progress': 'var(--amber-dim)', 'Done': 'var(--green-dim)' }

const DEFAULT_ASSIGNMENTS = [
  { id: 1, title: 'Discussion Post Week 1', course: 'Humanities', type: 'Discussion Post', due: '2026-05-26', status: 'To do', notes: '' },
  { id: 2, title: 'Essay Draft 1',          course: 'Written Communication', type: 'Essay', due: '2026-05-28', status: 'To do', notes: '' },
]

export default function Courses() {
  const [tab,         setTab]         = useState('summer')
  const [assignments, setAssignments] = useState(() => load('assignments', DEFAULT_ASSIGNMENTS))
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState({ title: '', course: SEMESTERS.summer.courses[0], type: TYPES[0], due: '', status: 'To do', notes: '' })

  useEffect(() => { save('assignments', assignments) }, [assignments])

  const sem        = SEMESTERS[tab]
  const filtered   = assignments.filter(a => sem.courses.includes(a.course))

  const addAssignment = () => {
    if (!form.title || !form.due) return
    setAssignments(as => [...as, { ...form, id: Date.now() }])
    setForm({ title: '', course: sem.courses[0], type: TYPES[0], due: '', status: 'To do', notes: '' })
    setShowForm(false)
  }

  const updateStatus = (id, status) =>
    setAssignments(as => as.map(a => a.id === id ? { ...a, status } : a))

  const deleteAssignment = id =>
    setAssignments(as => as.filter(a => a.id !== id))

  const daysUntil = due => {
    const d = Math.ceil((new Date(due) - new Date()) / 86400000)
    if (d < 0)  return { label: 'Overdue',     color: 'var(--coral)'  }
    if (d === 0) return { label: 'Due today',   color: 'var(--coral)'  }
    if (d === 1) return { label: 'Due tomorrow',color: 'var(--amber)'  }
    return { label: `${d}d left`, color: 'var(--text-muted)' }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Assignments</div>
          <div className="page-subtitle">Track essays, posts, and exams by semester</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> Add assignment
        </button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Semester tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
          {Object.entries(SEMESTERS).map(([key, s]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: tab === key ? s.color : 'transparent',
              color: tab === key ? (key === 'summer' ? '#1a1a2e' : 'white') : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card" style={{ borderColor: sem.color }}>
            <div className="card-title">New assignment — {sem.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ gridColumn: '1/-1', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }} />
              <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }}>
                {sem.courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }} />
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={addAssignment}>Save</button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid-3">
          {['To do', 'In progress', 'Done'].map(s => (
            <div key={s} className="stat-card">
              <div className="stat-label">{s}</div>
              <div className="stat-value" style={{ color: STATUS_COLOR[s] }}>
                {filtered.filter(a => a.status === s).length}
              </div>
              <div className="stat-sub">assignments</div>
            </div>
          ))}
        </div>

        {/* Assignment list */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No assignments yet — add one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered
              .sort((a, b) => new Date(a.due) - new Date(b.due))
              .map(a => {
                const due = daysUntil(a.due)
                return (
                  <div key={a.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${sem.color}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{a.type}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {a.course} · Due {new Date(a.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · <span style={{ color: due.color, fontWeight: 600 }}>{due.label}</span>
                      </div>
                      {a.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{a.notes}</div>}
                    </div>
                    <select
                      value={a.status}
                      onChange={e => updateStatus(a.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: STATUS_BG[a.status], color: STATUS_COLOR[a.status], fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >
                      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => deleteAssignment(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
          </div>
        )}

      </div>
    </>
  )
}
