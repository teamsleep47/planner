import { useState } from 'react'
import { BookOpen } from 'lucide-react'

const INIT_BOOKS = [
  { id: 1, title: 'Introduction to Algorithms',   course: 'Data Structures',    pages: 340, total: 1292, type: 'Textbook' },
  { id: 2, title: 'Smith et al. — ML Survey',     course: 'Data Structures',    pages: 12,  total: 28,   type: 'Paper'    },
  { id: 3, title: 'The Elements of Style',        course: 'Technical Writing',  pages: 105, total: 105,  type: 'Book'     },
  { id: 4, title: 'Linear Algebra Done Right',    course: 'Linear Algebra',     pages: 88,  total: 340,  type: 'Textbook' },
]

export default function Reading() {
  const [books] = useState(INIT_BOOKS)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Reading</div>
          <div className="page-subtitle">Textbooks, papers, and articles</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {books.map(b => {
          const pct = Math.round((b.pages / b.total) * 100)
          const done = b.pages >= b.total
          return (
            <div key={b.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ background: done ? 'var(--green-dim)' : 'var(--accent-dim)', borderRadius: 'var(--radius-md)', padding: 10, flexShrink: 0 }}>
                <BookOpen size={18} style={{ color: done ? 'var(--green)' : 'var(--accent-light)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{b.title}</span>
                  {done
                    ? <span className="badge badge-green">Done</span>
                    : <span className="badge badge-accent">{pct}%</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{b.course} · {b.type}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: done ? 'var(--green)' : 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {b.pages} / {b.total} pages
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
