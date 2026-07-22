import { useState, useEffect } from 'react'
import { Settings, Plus, X, Check, Edit2, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import FlipClock from './FlipClock.jsx'
import Tooltip from './Tooltip.jsx'
import { load, save } from '../utils/storage.js'
import NotificationBell from './NotificationBell.jsx'

const DEFAULT_LINKS = [
  { id: 1, label: 'SCF Planner', url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓' },
  { id: 2, label: 'Canvas',      url: 'https://canvas.instructure.com',              emoji: '📋' },
  { id: 3, label: 'Gmail',       url: 'https://mail.google.com',                     emoji: '✉️' },
]

// Kept in sync with App.jsx ALL_KEYS
const ALL_KEYS = [
  'home_tasks', 'study_sessions', 'habit_grid', 'habit_history',
  'timer_settings', 'streak', 'study_week_goal', 'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes', 'full_course_notes_v2',
  'quick_links', 'page_links', 'weather_city', 'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks', 'calendar_plans',
  'notification_settings',
  'saved_resources', 'resource_sort', 'resource_last_course',
  'hidden_tabs',
]

function ThemeTogglePill({ theme, toggleTheme }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 14,
        border: '1px solid var(--glass-border)',
        background: isDark ? '#29274a' : '#fff1da',
        cursor: 'pointer',
        padding: 0,
        transition: 'background .3s',
        flexShrink: 0,
      }}
    >
      <span style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', fontSize:11, opacity: isDark ? 0 : 1, transition:'opacity .2s' }}>☀️</span>
      <span style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', fontSize:11, opacity: isDark ? 1 : 0, transition:'opacity .2s' }}>🌙</span>
      <span style={{
        position: 'absolute',
        top: 3,
        left: isDark ? 'calc(100% - 25px)' : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: isDark ? '#9185f5' : '#e99a22',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left .25s cubic-bezier(.4,0,.2,1), background .3s',
      }}/>
    </button>
  )
}

function QuickLinksModal({ links, setLinks, onClose }) {
  const [localLinks, setLocalLinks] = useState(links)
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState({ label:'', url:'', emoji:'' })
  const [showAdd,    setShowAdd]    = useState(false)
  const [addForm,    setAddForm]    = useState({ label:'', url:'', emoji:'' })
  const [dragIdx,    setDragIdx]    = useState(null)
  const [dragOverIdx,setDragOverIdx]= useState(null)

  const startEdit = l => { setEditId(l.id); setEditForm({ label:l.label, url:l.url, emoji:l.emoji }) }
  const saveEdit  = () => { setLocalLinks(ls => ls.map(l => l.id===editId ? {...l,...editForm} : l)); setEditId(null) }
  const deleteLink = id => setLocalLinks(ls => ls.filter(l => l.id!==id))
  const addLink   = () => {
    if (!addForm.label.trim() || !addForm.url.trim()) return
    setLocalLinks(ls => [...ls, { ...addForm, id: Date.now() }])
    setAddForm({ label:'', url:'', emoji:'' }); setShowAdd(false)
  }

  const handleDragStart = (e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed='move' }
  const handleDragOver  = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop      = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    const arr = [...localLinks]
    const [moved] = arr.splice(dragIdx, 1)
    arr.splice(i, 0, moved)
    setLocalLinks(arr); setDragIdx(null); setDragOverIdx(null)
  }

  const done = () => { setLinks(localLinks); save('quick_links', localLinks); onClose() }

  const inp = { padding:'6px 8px', background:'var(--glass-bg)', border:'1px solid var(--glass-border)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit' }

  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)'}}/>
      <div className="card" style={{position:'relative',zIndex:1,width:'100%',maxWidth:520,maxHeight:'80vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--glass-border)'}}>
          <span style={{fontWeight:700,fontSize:15}}>Quick Links</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:2}}><X size={16}/></button>
        </div>

        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:6}}>
          {localLinks.map((l, i) => (
            editId === l.id ? (
              <div key={l.id} style={{display:'flex',gap:6,alignItems:'center',padding:'8px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--accent)'}}>
                <input value={editForm.emoji} onChange={e=>setEditForm(f=>({...f,emoji:e.target.value}))} style={{...inp,width:38}} placeholder="🔗"/>
                <input value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))} style={{...inp,flex:1}} placeholder="Label"/>
                <input value={editForm.url}   onChange={e=>setEditForm(f=>({...f,url:e.target.value}))}   style={{...inp,flex:2}} placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&saveEdit()}/>
                <button className="btn-icon" onClick={saveEdit}><Check size={13}/></button>
                <button className="btn-icon" onClick={()=>setEditId(null)}><X size={11}/></button>
              </div>
            ) : (
              <div key={l.id}
                draggable
                onDragStart={e=>handleDragStart(e,i)}
                onDragOver={e=>handleDragOver(e,i)}
                onDrop={e=>handleDrop(e,i)}
                onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null)}}
                style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:dragOverIdx===i?'var(--accent-dim)':'var(--glass-bg-2)',border:dragOverIdx===i?'1px solid var(--accent)':'1px solid var(--glass-border)',cursor:'default',transition:'background .1s'}}>
                <GripVertical size={14} style={{color:'var(--text-3)',cursor:'grab',flexShrink:0}}/>
                <span style={{fontSize:16,flexShrink:0}}>{l.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.label}</div>
                  <div style={{fontSize:11,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.url}</div>
                </div>
                <button className="btn-icon" onClick={()=>startEdit(l)} style={{padding:4}}><Edit2 size={12}/></button>
                <button className="btn-icon" onClick={()=>deleteLink(l.id)} style={{padding:4,color:'var(--coral)'}}><X size={12}/></button>
              </div>
            )
          ))}

          {showAdd ? (
            <div style={{display:'flex',gap:6,alignItems:'center',padding:'8px 10px',background:'var(--glass-bg-2)',border:'1px solid var(--accent)'}}>
              <input value={addForm.emoji} onChange={e=>setAddForm(f=>({...f,emoji:e.target.value}))} style={{...inp,width:38}} placeholder="🔗"/>
              <input value={addForm.label} onChange={e=>setAddForm(f=>({...f,label:e.target.value}))} style={{...inp,flex:1}} placeholder="Label" autoFocus/>
              <input value={addForm.url}   onChange={e=>setAddForm(f=>({...f,url:e.target.value}))}   style={{...inp,flex:2}} placeholder="https://…" onKeyDown={e=>e.key==='Enter'&&addLink()}/>
              <button className="btn-icon" onClick={addLink}><Check size={13}/></button>
              <button className="btn-icon" onClick={()=>setShowAdd(false)}><X size={11}/></button>
            </div>
          ) : (
            <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'1px dashed var(--glass-border)',color:'var(--text-3)',cursor:'pointer',fontSize:13,transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--glass-border)'}>
              <Plus size={14}/> Add link
            </button>
          )}
        </div>

        <div style={{padding:'12px 14px',borderTop:'1px solid var(--glass-border)',display:'flex',justifyContent:'flex-end'}}>
          <button className="btn btn-primary" onClick={done} style={{fontSize:13}}>Done</button>
        </div>
      </div>
    </div>
  )
}

export default function TopBar({ theme, toggleTheme, saveState, onLinksChange, notifs=[], unread=0, markAllRead=()=>{}, clearNotif=()=>{} }) {
  const navigate = useNavigate()
  const [links,    setLinks]    = useState(() => load('quick_links', DEFAULT_LINKS))
  const [showModal,setShowModal]= useState(false)
  const [dragIdx,    setDragIdx]    = useState(null)
  const [dragOverIdx,setDragOverIdx]= useState(null)

  useEffect(() => { onLinksChange?.() }, [links])

  const handleLinkDragStart = (e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed='move' }
  const handleLinkDragOver  = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleLinkDrop      = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    const arr = [...links]
    const [moved] = arr.splice(dragIdx, 1)
    arr.splice(i, 0, moved)
    setLinks(arr); save('quick_links', arr)
    setDragIdx(null); setDragOverIdx(null)
  }

  const isOk  = saveState === 'saved'
  const isErr = saveState === 'error'

  return (
    <>
      {showModal && <QuickLinksModal links={links} setLinks={setLinks} onClose={()=>setShowModal(false)}/>}
      <div className="top-bar">
        <div className="top-bar-left">
          <FlipClock/>
          <span className={`save-pill ${isOk||isErr ? 'visible' : ''} ${isErr ? 'error visible' : ''}`}>
            {saveState==='saving'?'⟳ Saving…':isOk?'✓ Saved':isErr?'⚠ Save failed':''}
          </span>
        </div>

        <div className="top-bar-right">
          <NotificationBell notifs={notifs} unread={unread} markAllRead={markAllRead} clearNotif={clearNotif}/>

          {/* Quick links */}
          <div className="ql-bar">
            {links.map((l, i) => (
              <Tooltip key={l.id} text={`Open ${l.label} in a new tab`} position="bottom">
                <a href={l.url} target="_blank" rel="noreferrer" className="ql-chip"
                  draggable
                  onDragStart={e=>handleLinkDragStart(e,i)}
                  onDragOver={e=>handleLinkDragOver(e,i)}
                  onDrop={e=>handleLinkDrop(e,i)}
                  onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null)}}
                  style={{opacity:dragIdx===i?0.4:1,outline:dragOverIdx===i?'2px solid var(--accent)':'none'}}>
                  <span>{l.emoji}</span>{l.label}
                </a>
              </Tooltip>
            ))}
            <Tooltip text="Edit quick links" position="bottom">
              <button className="btn-icon" onClick={()=>setShowModal(true)} style={{padding:'4px 8px'}}>
                <Edit2 size={12}/>
              </button>
            </Tooltip>
          </div>

          <ThemeTogglePill theme={theme} toggleTheme={toggleTheme}/>

          <Tooltip text="Settings" position="bottom">
            <button className="btn-icon" onClick={()=>navigate('/settings')} style={{padding:'4px 8px'}}>
              <Settings size={15}/>
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  )
}
