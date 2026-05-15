import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Palette, Plus, X, Check, Edit2, ExternalLink } from 'lucide-react'
import FlipClock from './FlipClock.jsx'
import { load, save } from '../utils/storage.js'

const DEFAULT_LINKS = [
  { id: 1, label: 'SCF Planner', url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓' },
  { id: 2, label: 'Canvas',      url: 'https://canvas.instructure.com',              emoji: '📋' },
  { id: 3, label: 'Gmail',       url: 'https://mail.google.com',                     emoji: '✉️' },
]

export default function TopBar({ theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS, saveState }) {
  const [showTheme,   setShowTheme]   = useState(false)
  const [showQLEdit,  setShowQLEdit]  = useState(false)
  const [links,       setLinks]       = useState(() => load('quick_links', DEFAULT_LINKS))
  const [editId,      setEditId]      = useState(null)
  const [editForm,    setEditForm]    = useState({ label: '', url: '', emoji: '' })
  const [newForm,     setNewForm]     = useState({ label: '', url: '', emoji: '' })
  const [showNewForm, setShowNewForm] = useState(false)
  const themeRef = useRef(null)

  useEffect(() => { save('quick_links', links) }, [links])

  // Close theme panel on outside click
  useEffect(() => {
    const handler = e => { if (themeRef.current && !themeRef.current.contains(e.target)) setShowTheme(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const startEdit = (link) => {
    setEditId(link.id)
    setEditForm({ label: link.label, url: link.url, emoji: link.emoji })
  }

  const saveEdit = () => {
    setLinks(ls => ls.map(l => l.id === editId ? { ...l, ...editForm } : l))
    setEditId(null)
  }

  const deleteLink = id => setLinks(ls => ls.filter(l => l.id !== id))

  const addLink = () => {
    if (!newForm.label || !newForm.url) return
    setLinks(ls => [...ls, { id: Date.now(), ...newForm, emoji: newForm.emoji || '🔗' }])
    setNewForm({ label: '', url: '', emoji: '' })
    setShowNewForm(false)
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <FlipClock />

        {/* Save indicator */}
        <span className={`save-indicator ${saveState === 'saved' ? 'visible' : ''}`}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved to Drive' : saveState === 'error' ? '⚠ Save failed' : ''}
        </span>
      </div>

      <div className="top-bar-right">
        {/* Quick links bar */}
        {!showQLEdit && (
          <div className="ql-bar">
            {links.map(link => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="ql-chip">
                <span>{link.emoji}</span>{link.label}
              </a>
            ))}
            <button className="btn-icon" onClick={() => setShowQLEdit(true)} title="Edit quick links" style={{ padding: '4px 8px', fontSize: 11 }}>
              <Edit2 size={12} />
            </button>
          </div>
        )}

        {/* Quick links editor */}
        {showQLEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {links.map(link => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {editId === link.id ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                      style={{ width: 36, ...inputStyle }} placeholder="🔗" />
                    <input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                      style={{ width: 90, ...inputStyle }} placeholder="Label" />
                    <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                      style={{ width: 150, ...inputStyle }} placeholder="https://..." />
                    <button className="btn-icon" onClick={saveEdit}><Check size={12} /></button>
                    <button className="btn-icon" onClick={() => setEditId(null)}><X size={12} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span className="ql-chip" style={{ cursor: 'default' }}>{link.emoji} {link.label}</span>
                    <button className="btn-icon" onClick={() => startEdit(link)} style={{ padding: 3 }}><Edit2 size={10} /></button>
                    <button className="btn-icon" onClick={() => deleteLink(link.id)} style={{ padding: 3 }}><X size={10} /></button>
                  </div>
                )}
              </div>
            ))}
            {showNewForm ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input value={newForm.emoji} onChange={e => setNewForm(f => ({ ...f, emoji: e.target.value }))}
                  style={{ width: 36, ...inputStyle }} placeholder="🔗" />
                <input value={newForm.label} onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))}
                  style={{ width: 90, ...inputStyle }} placeholder="Label" />
                <input value={newForm.url} onChange={e => setNewForm(f => ({ ...f, url: e.target.value }))}
                  style={{ width: 150, ...inputStyle }} placeholder="https://..." />
                <button className="btn-icon" onClick={addLink}><Check size={12} /></button>
                <button className="btn-icon" onClick={() => setShowNewForm(false)}><X size={12} /></button>
              </div>
            ) : (
              <button className="btn-icon" onClick={() => setShowNewForm(true)}><Plus size={12} /></button>
            )}
            <button className="btn-icon" onClick={() => { setShowQLEdit(false); setEditId(null); setShowNewForm(false) }}>
              <Check size={12} />
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <div ref={themeRef} style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setShowTheme(s => !s)} title="Theme">
            <Palette size={15} />
          </button>
          {showTheme && (
            <div className="theme-panel">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Theme</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={toggleTheme} className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '6px 10px', gap: 6 }}>
                  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Color</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {SCHEMES.map(s => (
                  <button key={s} onClick={() => setScheme(s)}
                    className={`scheme-dot ${scheme === s ? 'active' : ''}`}
                    style={{ background: SCHEME_COLORS[s] }}
                    title={s}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '4px 8px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'inherit',
}
