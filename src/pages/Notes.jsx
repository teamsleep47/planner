import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const DEFAULT_LINKS = [
  { id: 1, category: 'My tools',        label: 'SCF Planner',   url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓', desc: 'Program planning, GPA, pre-req tracker' },
  { id: 2, category: 'School',          label: 'Canvas',         url: 'https://canvas.instructure.com',              emoji: '📋', desc: 'Assignments, grades, course content' },
  { id: 3, category: 'School',          label: 'School Portal',  url: '#',                                            emoji: '🏫', desc: 'Registration, financial aid, transcripts' },
  { id: 4, category: 'School',          label: 'School Email',   url: '#',                                            emoji: '✉️', desc: 'Student email' },
  { id: 5, category: 'Study resources', label: 'Khan Academy',   url: 'https://khanacademy.org',                     emoji: '📖', desc: 'Free lessons — great for A&P prep' },
  { id: 6, category: 'Study resources', label: 'Quizlet',        url: 'https://quizlet.com',                          emoji: '🃏', desc: 'Flashcards and practice tests' },
  { id: 7, category: 'Study resources', label: 'Purdue OWL',     url: 'https://owl.purdue.edu',                       emoji: '✍️', desc: 'Writing guides, APA/MLA citation help' },
  { id: 8, category: 'Study resources', label: 'Google Scholar', url: 'https://scholar.google.com',                  emoji: '🔬', desc: 'Academic papers and peer-reviewed sources' },
]

const CATEGORIES = ['My tools', 'School', 'Study resources', 'Other']

const BLANK = { label: '', url: '', emoji: '🔗', desc: '', category: 'Other' }

export default function Notes({ onDataChange }) {
  const [links,    setLinks]    = useState(() => load('page_links', DEFAULT_LINKS))
  const [editId,   setEditId]   = useState(null)
  const [editForm, setEditForm] = useState(BLANK)
  const [showAdd,  setShowAdd]  = useState(false)
  const [addForm,  setAddForm]  = useState(BLANK)

  useEffect(() => { save('page_links', links); onDataChange?.() }, [links])

  const startEdit = l => { setEditId(l.id); setEditForm({ label: l.label, url: l.url, emoji: l.emoji, desc: l.desc || '', category: l.category }) }
  const saveEdit  = () => {
    if (!editForm.label || !editForm.url) return
    setLinks(ls => ls.map(l => l.id === editId ? { ...l, ...editForm } : l))
    setEditId(null)
  }
  const deleteLink = id => setLinks(ls => ls.filter(l => l.id !== id))
  const addLink    = () => {
    if (!addForm.label || !addForm.url) return
    setLinks(ls => [...ls, { id: Date.now(), ...addForm }])
    setAddForm(BLANK); setShowAdd(false)
  }
  const moveUp   = id => setLinks(ls => { const i = ls.findIndex(l => l.id === id); if (i <= 0) return ls; const n = [...ls]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n })
  const moveDown = id => setLinks(ls => { const i = ls.findIndex(l => l.id === id); if (i >= ls.length - 1) return ls; const n = [...ls]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n })

  const categories = [...new Set(links.map(l => l.category))]

  const inputStyle = { padding: '7px 10px', background: 'var(--glass-bg-2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit', width: '100%' }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Quick links</div>
          <div className="page-subtitle">Everything you need, one click away</div>
        </div>
        <Tooltip text="Add a new quick link to your collection">
          <button className="btn btn-primary" onClick={() => setShowAdd(s => !s)}>
            <Plus size={14} /> Add link
          </button>
        </Tooltip>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Add form */}
        {showAdd && (
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <div className="card-title">New link</div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input style={inputStyle} value={addForm.emoji} onChange={e => setAddForm(f=>({...f,emoji:e.target.value}))} placeholder="🔗" />
              <input style={inputStyle} value={addForm.label} onChange={e => setAddForm(f=>({...f,label:e.target.value}))} placeholder="Label (e.g. Canvas)" />
              <input style={inputStyle} value={addForm.url}   onChange={e => setAddForm(f=>({...f,url:e.target.value}))}   placeholder="https://…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input style={inputStyle} value={addForm.desc} onChange={e => setAddForm(f=>({...f,desc:e.target.value}))} placeholder="Short description (optional)" />
              <select style={inputStyle} value={addForm.category} onChange={e => setAddForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={addLink}>Save link</button>
              <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setAddForm(BLANK) }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Links by category */}
        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.filter(l => l.category === cat).map(link => (
                <div key={link.id}>
                  {editId === link.id ? (
                    <div className="card" style={{ borderColor: 'var(--accent)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <input style={inputStyle} value={editForm.emoji}    onChange={e => setEditForm(f=>({...f,emoji:e.target.value}))}    placeholder="🔗" />
                        <input style={inputStyle} value={editForm.label}    onChange={e => setEditForm(f=>({...f,label:e.target.value}))}    placeholder="Label" />
                        <input style={inputStyle} value={editForm.url}      onChange={e => setEditForm(f=>({...f,url:e.target.value}))}      placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&saveEdit()} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <input style={inputStyle} value={editForm.desc}     onChange={e => setEditForm(f=>({...f,desc:e.target.value}))}     placeholder="Description" />
                        <select style={inputStyle} value={editForm.category} onChange={e => setEditForm(f=>({...f,category:e.target.value}))}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={saveEdit} style={{ fontSize: 12 }}>Save</button>
                        <button className="btn btn-ghost"   onClick={() => setEditId(null)} style={{ fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{link.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{link.label}</div>
                        {link.desc && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{link.desc}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Tooltip text="Open link in new tab">
                          <a href={link.url} target="_blank" rel="noreferrer" className="btn-icon" style={{ padding: 6, display: 'flex' }}>
                            <ExternalLink size={13} />
                          </a>
                        </Tooltip>
                        <Tooltip text="Move up in list">
                          <button className="btn-icon" onClick={() => moveUp(link.id)} style={{ padding: 6 }}><ArrowUp size={13} /></button>
                        </Tooltip>
                        <Tooltip text="Move down in list">
                          <button className="btn-icon" onClick={() => moveDown(link.id)} style={{ padding: 6 }}><ArrowDown size={13} /></button>
                        </Tooltip>
                        <Tooltip text="Edit this link">
                          <button className="btn-icon" onClick={() => startEdit(link)} style={{ padding: 6 }}><Edit2 size={13} /></button>
                        </Tooltip>
                        <Tooltip text="Remove this link permanently">
                          <button className="btn-icon" onClick={() => deleteLink(link.id)} style={{ padding: 6, color: 'var(--coral)' }}><Trash2 size={13} /></button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
