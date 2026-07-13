import { useState, useEffect } from 'react'
import { FileText, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

function getCourseList() {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const list  = terms.flatMap(t => t.courses.map(c => ({ name:c.name, color:c.color })))
    return list.length > 0 ? list : [
      {name:'Humanities',color:'#6366f1'},
      {name:'Written Communication',color:'#14b8a6'},
      {name:'Anatomy & Physiology',color:'#f59e0b'},
      {name:'A&P Lab',color:'#f59e0b'},
      {name:'American Government',color:'#f43f5e'},
    ]
  } catch(e) { return [] }
}

function getSaved()       { return load('saved_resources', []) }
function pinFile(r)       { const s=getSaved(); if(!s.find(x=>x.fileId===r.fileId)) save('saved_resources',[...s,r]) }
function unpinFile(id)    { save('saved_resources', getSaved().filter(r=>r.fileId!==id)) }

export default function ResourcesPage({ onDataChange }) {
  const { user } = useAuth()
  const courses  = getCourseList()

  const [saved,        setSaved]        = useState(getSaved)
  const [activeCourse, setActiveCourse] = useState(() => load('resource_last_course', courses[0]?.name || 'all'))
  const [sortBy,       setSortBy]       = useState(() => load('resource_sort', 'date'))
  const [showAdd,      setShowAdd]      = useState(false)
  const [addForm,      setAddForm]      = useState({ name:'', url:'' })
  const [error,        setError]        = useState('')

  useEffect(() => { save('saved_resources', saved); onDataChange?.() }, [saved])
  useEffect(() => { save('resource_sort', sortBy) }, [sortBy])
  useEffect(() => { save('resource_last_course', activeCourse) }, [activeCourse])
  useEffect(() => {
    const h = () => setSaved(load('saved_resources', []))
    window.addEventListener('drive-loaded', h)
    return () => window.removeEventListener('drive-loaded', h)
  }, [])

  const pinResource = (entry, courseName) => {
    pinFile({ ...entry, course: courseName, pinned: new Date().toISOString() })
    setSaved(getSaved())
    onDataChange?.()
  }

  const unpin = (fileId) => {
    unpinFile(fileId)
    setSaved(getSaved())
    onDataChange?.()
  }

  const addLink = (e) => {
    e.preventDefault()
    setError('')
    const name = addForm.name.trim()
    let url    = addForm.url.trim()
    if (!name || !url) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    pinResource({ fileId: `${Date.now()}_${name}`, name, link: url }, activeCourse)
    setAddForm({ name:'', url:'' })
    setShowAdd(false)
  }

  // Pinned resources for the active course only
  const courseColor = courses.find(c=>c.name===activeCourse)?.color || 'var(--accent)'
  const pinnedForCourse = [...saved]
    .filter(r => r.course === activeCourse)
    .sort((a,b) => {
      if (sortBy==='date') return new Date(b.pinned)-new Date(a.pinned)
      if (sortBy==='name') return a.name.localeCompare(b.name)
      return 0
    })

  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit' }

  if (!user) return (
    <>
      <div className="page-header">
        <div><div className="page-title">Resources</div><div className="page-subtitle">Links organized by course</div></div>
      </div>
      <div className="page-body">
        <div className="card" style={{textAlign:'center',padding:'48px 24px',color:'var(--text-3)'}}>
          <FileText size={36} style={{margin:'0 auto 12px',opacity:.3}}/>
          <div style={{fontWeight:600,marginBottom:6}}>Sign-in required</div>
          <div style={{fontSize:13}}>Sign in to save and organize links.</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Resources</div><div className="page-subtitle">Links pinned by course</div></div>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {error && (
          <div style={{padding:'8px 12px',borderRadius:'var(--radius-md)',background:'var(--coral-dim)',color:'var(--coral)',fontSize:12,border:'1px solid var(--coral)'}}>⚠ {error}</div>
        )}

        {/* Course tabs */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginRight:4}}>Course</span>
          {courses.map(c => (
            <button key={c.name} onClick={()=>setActiveCourse(c.name)} style={{
              padding:'4px 12px', borderRadius:20, border:`1.5px solid ${activeCourse===c.name?c.color:'var(--glass-border)'}`,
              background: activeCourse===c.name ? `${c.color}22` : 'transparent',
              color: activeCourse===c.name ? c.color : 'var(--text-2)',
              fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .15s',
            }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Pinned links for active course */}
        <div className="card" style={{padding:'14px 16px',borderLeft:`3px solid ${courseColor}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontWeight:700,fontSize:13,color:courseColor}}>{activeCourse}</span>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <select style={{...inputStyle,fontSize:11,padding:'3px 7px'}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="date">Newest</option>
                <option value="name">A–Z</option>
              </select>
              <Tooltip text={`Pin a link to ${activeCourse}`}>
                <button onClick={()=>setShowAdd(s=>!s)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--accent)',fontWeight:600,padding:'4px 9px',borderRadius:'var(--radius-sm)',border:'1px solid var(--accent)',background:'var(--accent-dim)'}}>
                  <Plus size={11}/> Add link
                </button>
              </Tooltip>
            </div>
          </div>

          {showAdd && (
            <form onSubmit={addLink} style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
              <input style={{...inputStyle,flex:'1 1 140px'}} placeholder="Name" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} autoFocus/>
              <input style={{...inputStyle,flex:'2 1 200px'}} placeholder="https://…" value={addForm.url} onChange={e=>setAddForm(f=>({...f,url:e.target.value}))}/>
              <button type="submit" className="btn btn-primary" style={{fontSize:12}}>Add</button>
            </form>
          )}

          {pinnedForCourse.length === 0 ? (
            <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'16px 0'}}>
              No links for {activeCourse} yet.<br/>Add a link to get started.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {pinnedForCourse.map(r => (
                <div key={r.fileId} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--glass-border)'}}>
                  <span style={{fontSize:14,flexShrink:0}}>🔗</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
                  </div>
                  <div style={{display:'flex',gap:3,flexShrink:0}}>
                    <Tooltip text="Open link">
                      <a href={r.link} target="_blank" rel="noreferrer" className="btn-icon" style={{padding:5,display:'flex'}}><ExternalLink size={11}/></a>
                    </Tooltip>
                    <Tooltip text="Delete / unpin this link">
                      <button className="btn-icon" onClick={()=>unpin(r.fileId)} style={{padding:5,color:'var(--coral)'}}><Trash2 size={11}/></button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
