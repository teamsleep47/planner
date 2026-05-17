import { useState, useEffect } from 'react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const ALL_COURSES = [
  { id:'HUM',  label:'Humanities',            sem:'Summer 2026', color:'var(--accent)' },
  { id:'WCOM', label:'Written Communication', sem:'Summer 2026', color:'var(--teal)'  },
  { id:'ANP',  label:'Anatomy & Physiology',  sem:'Fall 2026',   color:'var(--amber)' },
  { id:'ANPL', label:'A&P Lab',               sem:'Fall 2026',   color:'var(--amber)' },
  { id:'GOV',  label:'American Government',   sem:'Fall 2026',   color:'var(--coral)' },
]

export default function NotesPage({ onDataChange }) {
  const [active, setActive]  = useState('HUM')
  const [notes,  setNotes]   = useState(() => load('full_course_notes', {}))
  const [saved,  setSaved]   = useState(false)

  useEffect(() => {
    save('full_course_notes', notes)
    onDataChange?.()
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [notes])

  const course = ALL_COURSES.find(c => c.id === active)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Course notes</div>
          <div className="page-subtitle">Full notes per course — saved to Drive automatically</div>
        </div>
        <span style={{ fontSize:11, color:saved?'var(--green)':'transparent', fontWeight:600, transition:'color .3s' }}>✓ Saved</span>
      </div>

      <div className="page-body" style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

        {/* Course selector */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, width:180, flexShrink:0 }}>
          {['Summer 2026','Fall 2026'].map(sem => (
            <div key={sem}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', padding:'10px 10px 5px' }}>{sem}</div>
              {ALL_COURSES.filter(c=>c.sem===sem).map(c=>(
                <Tooltip key={c.id} text={`Open ${c.label} notes`} position="right">
                  <button onClick={()=>setActive(c.id)} style={{
                    width:'100%', textAlign:'left', padding:'9px 12px',
                    borderRadius:'var(--radius-md)', border:'none',
                    background:active===c.id?'var(--accent-dim)':'transparent',
                    color:active===c.id?'var(--accent)':'var(--text-2)',
                    fontWeight:active===c.id?700:500, fontSize:13,
                    cursor:'pointer', transition:'all .15s',
                    borderLeft:active===c.id?`3px solid ${c.color}`:'3px solid transparent',
                  }}>
                    {c.label}
                    {notes[c.id] && <span style={{fontSize:10,color:'var(--text-3)',marginLeft:6}}>
                      {notes[c.id].length > 0 ? `${notes[c.id].split('\n').length} lines` : ''}
                    </span>}
                  </button>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:course?.color, boxShadow:`0 0 8px ${course?.color}` }}/>
            <span style={{ fontWeight:700, fontSize:16 }}>{course?.label}</span>
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{course?.sem}</span>
          </div>
          <textarea
            className="inline-input"
            value={notes[active]||''}
            onChange={e=>setNotes(n=>({...n,[active]:e.target.value}))}
            placeholder={`Notes for ${course?.label}…\n\nTip: Use plain text, bullet points, or Markdown-style formatting.\n- Key concept\n- Important term\n- Exam tip`}
            style={{ flex:1, minHeight:500, resize:'vertical', fontSize:13, lineHeight:1.7, fontFamily:'var(--font-mono)' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-3)' }}>
            <span>{(notes[active]||'').length} characters</span>
            <span>{(notes[active]||'').split('\n').filter(Boolean).length} lines</span>
          </div>
        </div>

      </div>
    </>
  )
}
