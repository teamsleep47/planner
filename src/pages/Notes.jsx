import { ExternalLink } from 'lucide-react'

const LINKS = [
  { category: 'My tools', items: [
    { label: 'SCF Planner',         url: 'https://teamsleep47.github.io/scf-planner/', icon: '🎓', desc: 'Program planning, GPA, pre-req tracker' },
  ]},
  { category: 'School', items: [
    { label: 'Canvas',              url: 'https://canvas.instructure.com',              icon: '📋', desc: 'Assignments, grades, course content' },
    { label: 'School Portal',       url: '#',                                            icon: '🏫', desc: 'Registration, financial aid, transcripts' },
    { label: 'School Email',        url: '#',                                            icon: '✉️', desc: 'Student email' },
  ]},
  { category: 'Study resources', items: [
    { label: 'Khan Academy',        url: 'https://khanacademy.org',                     icon: '📖', desc: 'Free lessons — great for A&P' },
    { label: 'Quizlet',            url: 'https://quizlet.com',                          icon: '🃏', desc: 'Flashcards and practice tests' },
    { label: 'Purdue OWL',         url: 'https://owl.purdue.edu',                       icon: '✍️', desc: 'Writing guides for essays and citations' },
    { label: 'Google Scholar',     url: 'https://scholar.google.com',                  icon: '🔬', desc: 'Academic papers and sources' },
  ]},
]

export default function Notes() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Quick links</div>
          <div className="page-subtitle">Everything you need, one click away</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {LINKS.map(section => (
          <div key={section.category}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              {section.category}
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              {section.items.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none', transition: 'border-color .15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{link.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{link.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{link.desc}</div>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
