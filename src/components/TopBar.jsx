import { useState, useRef, useEffect } from 'react'
import { Palette, Sun, Moon, Plus, X, Check, Edit2 } from 'lucide-react'
import FlipClock from './FlipClock.jsx'
import { load, save } from '../utils/storage.js'

const DEFAULT_LINKS = [
  { id: 1, label: 'SCF Planner', url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓' },
  { id: 2, label: 'Canvas',      url: 'https://canvas.instructure.com',              emoji: '📋' },
  { id: 3, label: 'Gmail',       url: 'https://mail.google.com',                     emoji: '✉️' },
]

export default function TopBar({ theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS, saveState, onLinksChange }) {
  const [showTheme,    setShowTheme]    = useState(false)
  const [editMode,     setEditMode]     = useState(false)
  const [links,        setLinks]        = useState(() => load('quick_links', DEFAULT_LINKS))
  const [editId,       setEditId]       = useState(null)
  const [editForm,     setEditForm]     = useState({ label: '', url: '', emoji: '' })
  const [showAdd,      setShowAdd]      = useState(false)
  const [addForm,      setAddForm]      = useState({ label: '', url: '', emoji: '' })
  const themeRef = useRef(null)

  useEffect(() => { save('quick_links', links); onLinksChange?.() }, [links])

  useEffect(() => {
    const handler = e => { if (themeRef.current && !themeRef.current.contains(e.target)) setShowTheme(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const startEdit = l => { setEditId(l.id); setEditForm({ label: l.label, url: l.url, emoji: l.emoji }) }
  const saveEdit  = () => { setLinks(ls => ls.map(l => l.id === editId ? { ...l, ...editForm } : l)); setEditId(null) }
  const deleteLink = id => setLinks(ls => ls.filter(l => l.id !== id))
  const addLink   = () => {
    if (!addForm.label || !addForm.url) return
    setLinks(ls => [...ls, { id: Date.now(), emoji: addForm.emoji || '🔗', label: addForm.label, url: addForm.url }])
    setAddForm({ label: '', url: '', emoji: '' }); setShowAdd(false)
  }

  const isOk = saveState === 'saved'
  const isErr = saveState === 'error'

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <FlipClock />
        <span className={`save-pill ${isOk ? 'visible' : ''} ${isErr ? 'error visible' : ''}`}>
          {saveState === 'saving' ? '⟳ Saving…' : isOk ? '✓ Saved to Drive' : isErr ? '⚠ Save failed' : ''}
        </span>
      </div>

      <div className="top-bar-right">
        {/* Quick links */}
        {!editMode ? (
          <div className="ql-bar">
            {links.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="ql-chip">
                <span>{l.emoji}</span>{l.label}
              </a>
            ))}
            <button className="btn-icon" onClick={() => setEditMode(true)} title="Edit links" style={{ padding: '4px 8px' }}>
              <Edit2 size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 600 }}>
            {links.map(l => (
              editId === l.id ? (
                <div key={l.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input value={editForm.emoji}  onChange={e => setEditForm(f=>({...f,emoji:e.target.value}))}  className="input-sm" style={{ width: 38 }} placeholder="🔗" />
                  <input value={editForm.label}  onChange={e => setEditForm(f=>({...f,label:e.target.value}))}  className="input-sm" style={{ width: 90 }} placeholder="Label" />
                  <input value={editForm.url}    onChange={e => setEditForm(f=>({...f,url:e.target.value}))}    className="input-sm" style={{ width: 160 }} placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&saveEdit()} />
                  <button className="btn-icon" onClick={saveEdit}><Check size={11}/></button>
                  <button className="btn-icon" onClick={()=>setEditId(null)}><X size={11}/></button>
                </div>
              ) : (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span className="ql-chip" style={{ cursor: 'default' }}>{l.emoji} {l.label}</span>
                  <button className="btn-icon" onClick={()=>startEdit(l)} style={{padding:3}}><Edit2 size={10}/></button>
                  <button className="btn-icon" onClick={()=>deleteLink(l.id)} style={{padding:3}}><X size={10}/></button>
                </div>
              )
            ))}
            {showAdd ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input value={addForm.emoji} onChange={e=>setAddForm(f=>({...f,emoji:e.target.value}))} className="input-sm" style={{width:38}} placeholder="🔗"/>
                <input value={addForm.label} onChange={e=>setAddForm(f=>({...f,label:e.target.value}))} className="input-sm" style={{width:90}} placeholder="Label"/>
                <input value={addForm.url}   onChange={e=>setAddForm(f=>({...f,url:e.target.value}))}   className="input-sm" style={{width:160}} placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&addLink()}/>
                <button className="btn-icon" onClick={addLink}><Check size={11}/></button>
                <button className="btn-icon" onClick={()=>setShowAdd(false)}><X size={11}/></button>
              </div>
            ) : (
              <button className="btn-icon" onClick={()=>setShowAdd(true)}><Plus size={12}/></button>
            )}
            <button className="btn-icon" onClick={()=>{setEditMode(false);setEditId(null);setShowAdd(false)}} style={{color:'var(--accent)'}}>
              <Check size={13}/>
            </button>
          </div>
        )}

        {/* Theme */}
        <div ref={themeRef} style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={()=>setShowTheme(s=>!s)} title="Theme">
            <Palette size={15}/>
          </button>
          {showTheme && (
            <div className="theme-panel">
              <p style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Mode</p>
              <button onClick={toggleTheme} className="btn btn-ghost" style={{width:'100%',justifyContent:'center',gap:8,marginBottom:16,fontSize:13}}>
                {theme==='dark' ? <><Sun size={13}/> Switch to light</> : <><Moon size={13}/> Switch to dark</>}
              </button>
              <p style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Accent color</p>
              <div style={{display:'flex',gap:10}}>
                {SCHEMES.map(s => (
                  <button key={s} onClick={()=>setScheme(s)}
                    className={`scheme-dot ${scheme===s?'active':''}`}
                    style={{background:SCHEME_COLORS[s]}} title={s}/>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
