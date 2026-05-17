import { useState, useRef, useEffect } from 'react'
import { Palette, Sun, Moon, Plus, X, Check, Edit2, Download, Upload, FlaskConical } from 'lucide-react'
import FlipClock from './FlipClock.jsx'
import Tooltip from './Tooltip.jsx'
import { load, save } from '../utils/storage.js'
import { TEST_DATA } from '../utils/testData.js'

const DEFAULT_LINKS = [
  { id: 1, label: 'SCF Planner', url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓' },
  { id: 2, label: 'Canvas',      url: 'https://canvas.instructure.com',              emoji: '📋' },
  { id: 3, label: 'Gmail',       url: 'https://mail.google.com',                     emoji: '✉️' },
]

const ALL_KEYS = ['home_tasks','assignments','study_sessions','habit_grid','timer_settings','quick_links','streak','weather_city']

export default function TopBar({ theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS, saveState, onLinksChange }) {
  const [showTheme,  setShowTheme]  = useState(false)
  const [editMode,   setEditMode]   = useState(false)
  const [links,      setLinks]      = useState(() => load('quick_links', DEFAULT_LINKS))
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState({ label: '', url: '', emoji: '' })
  const [showAdd,    setShowAdd]    = useState(false)
  const [addForm,    setAddForm]    = useState({ label: '', url: '', emoji: '' })
  const themeRef = useRef(null)

  useEffect(() => { save('quick_links', links); onLinksChange?.() }, [links])

  useEffect(() => {
    const handler = e => { if (themeRef.current && !themeRef.current.contains(e.target)) setShowTheme(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const startEdit  = l => { setEditId(l.id); setEditForm({ label: l.label, url: l.url, emoji: l.emoji }) }
  const saveEdit   = () => { setLinks(ls => ls.map(l => l.id === editId ? { ...l, ...editForm } : l)); setEditId(null) }
  const deleteLink = id => setLinks(ls => ls.filter(l => l.id !== id))
  const addLink    = () => {
    if (!addForm.label || !addForm.url) return
    setLinks(ls => [...ls, { id: Date.now(), emoji: addForm.emoji || '🔗', label: addForm.label, url: addForm.url }])
    setAddForm({ label: '', url: '', emoji: '' }); setShowAdd(false)
  }

  // ── JSON Export ──────────────────────────────────
  const exportJSON = () => {
    const data = ALL_KEYS.reduce((a, k) => { a[k] = load(k, null); return a }, {})
    const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href = url
    a.download = `planner-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── JSON Import ──────────────────────────────────
  const importJSON = () => {
    const input = document.createElement('input')
    input.type  = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result)
          Object.entries(data).forEach(([k, v]) => { if (v !== null) save(k, v) })
          window.dispatchEvent(new Event('drive-loaded'))
          setShowTheme(false)
        } catch(err) { alert('Invalid JSON file') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // ── Dev mode ─────────────────────────────────────
  const loadTestData = () => {
    Object.entries(TEST_DATA).forEach(([k, v]) => save(k, v))
    window.dispatchEvent(new Event('drive-loaded'))
    setShowTheme(false)
  }

  const isOk  = saveState === 'saved'
  const isErr = saveState === 'error'

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <Tooltip text="Current time — updates every second" position="bottom">
          <FlipClock />
        </Tooltip>
        <span className={`save-pill ${isOk ? 'visible' : ''} ${isErr ? 'error visible' : ''}`}>
          {saveState === 'saving' ? '⟳ Saving…' : isOk ? '✓ Saved to Drive' : isErr ? '⚠ Save failed' : ''}
        </span>
      </div>

      <div className="top-bar-right">
        {/* Quick links */}
        {!editMode ? (
          <div className="ql-bar">
            {links.map(l => (
              <Tooltip key={l.id} text={`Open ${l.label} in a new tab`} position="bottom">
                <a href={l.url} target="_blank" rel="noreferrer" className="ql-chip">
                  <span>{l.emoji}</span>{l.label}
                </a>
              </Tooltip>
            ))}
            <Tooltip text="Edit quick links — change names, URLs, or add new ones" position="bottom">
              <button className="btn-icon" onClick={() => setEditMode(true)} style={{ padding: '4px 8px' }}>
                <Edit2 size={12} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 640 }}>
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
                  <Tooltip text="Edit this link"><button className="btn-icon" onClick={()=>startEdit(l)} style={{padding:3}}><Edit2 size={10}/></button></Tooltip>
                  <Tooltip text="Remove this link"><button className="btn-icon" onClick={()=>deleteLink(l.id)} style={{padding:3}}><X size={10}/></button></Tooltip>
                </div>
              )
            ))}
            {showAdd ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input value={addForm.emoji}  onChange={e=>setAddForm(f=>({...f,emoji:e.target.value}))}  className="input-sm" style={{width:38}} placeholder="🔗"/>
                <input value={addForm.label}  onChange={e=>setAddForm(f=>({...f,label:e.target.value}))}  className="input-sm" style={{width:90}} placeholder="Label"/>
                <input value={addForm.url}    onChange={e=>setAddForm(f=>({...f,url:e.target.value}))}    className="input-sm" style={{width:160}} placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&addLink()}/>
                <button className="btn-icon" onClick={addLink}><Check size={11}/></button>
                <button className="btn-icon" onClick={()=>setShowAdd(false)}><X size={11}/></button>
              </div>
            ) : (
              <Tooltip text="Add a new quick link"><button className="btn-icon" onClick={()=>setShowAdd(true)}><Plus size={12}/></button></Tooltip>
            )}
            <Tooltip text="Done editing links">
              <button className="btn-icon" onClick={()=>{setEditMode(false);setEditId(null);setShowAdd(false)}} style={{color:'var(--accent)'}}>
                <Check size={13}/>
              </button>
            </Tooltip>
          </div>
        )}

        {/* Theme / settings panel */}
        <div ref={themeRef} style={{ position: 'relative' }}>
          <Tooltip text="Theme, color scheme, import/export data, and dev tools" position="bottom">
            <button className="btn-icon" onClick={()=>setShowTheme(s=>!s)}>
              <Palette size={15}/>
            </button>
          </Tooltip>

          {showTheme && (
            <div className="theme-panel dropdown-panel" style={{ width: 240 }}>
              {/* Mode */}
              <p style={{fontSize:10.5,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Appearance</p>
              <button onClick={toggleTheme} className="btn btn-ghost" style={{width:'100%',justifyContent:'center',gap:8,marginBottom:14,fontSize:12.5}}>
                {theme==='dark' ? <><Sun size={13}/> Switch to light mode</> : <><Moon size={13}/> Switch to dark mode</>}
              </button>

              {/* Schemes */}
              <p style={{fontSize:10.5,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Accent color</p>
              <div style={{display:'flex',gap:10,marginBottom:18}}>
                {SCHEMES.map(s => (
                  <Tooltip key={s} text={s.charAt(0).toUpperCase()+s.slice(1)} position="bottom">
                    <button onClick={()=>setScheme(s)}
                      className={`scheme-dot ${scheme===s?'active':''}`}
                      style={{background:SCHEME_COLORS[s]}}/>
                  </Tooltip>
                ))}
              </div>

              {/* Data */}
              <p style={{fontSize:10.5,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Data</p>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                <Tooltip text="Download all your planner data as a JSON backup file" position="left">
                  <button onClick={exportJSON} className="btn btn-ghost" style={{width:'100%',justifyContent:'flex-start',gap:8,fontSize:12.5}}>
                    <Download size={13}/> Export backup
                  </button>
                </Tooltip>
                <Tooltip text="Restore data from a previously exported JSON backup file" position="left">
                  <button onClick={importJSON} className="btn btn-ghost" style={{width:'100%',justifyContent:'flex-start',gap:8,fontSize:12.5}}>
                    <Upload size={13}/> Import backup
                  </button>
                </Tooltip>
              </div>

              {/* Dev */}
              <p style={{fontSize:10.5,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Developer</p>
              <Tooltip text="Load realistic test data into every page to check that all features work correctly" position="left">
                <button onClick={loadTestData} className="btn btn-ghost" style={{width:'100%',justifyContent:'flex-start',gap:8,fontSize:12.5,color:'var(--amber)',borderColor:'rgba(251,191,36,0.3)'}}>
                  <FlaskConical size={13}/> Load test data
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
