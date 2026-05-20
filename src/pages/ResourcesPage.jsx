import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, ExternalLink, Upload, Folder, X, RefreshCw, BookOpen } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const LS_TOKEN = 'planner_token_v1'
function getToken() { try { return localStorage.getItem(LS_TOKEN)||'' } catch(e){ return '' } }

function getCourseNames() {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const names = terms.flatMap(t=>t.courses.map(c=>({name:c.name,color:c.color})))
    return names.length > 0 ? names : [
      {name:'Humanities',color:'#6366f1'},
      {name:'Written Communication',color:'#14b8a6'},
      {name:'Anatomy & Physiology',color:'#f59e0b'},
      {name:'A&P Lab',color:'#f59e0b'},
      {name:'American Government',color:'#f43f5e'},
    ]
  } catch(e) { return [] }
}

// Search Drive for files by name
async function searchDriveFiles(query, token) {
  const q = query
    ? `name contains '${query.replace(/'/g,"\\'")}' and trashed=false`
    : `trashed=false and (mimeType='application/pdf' or name contains '.pdf')`
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)&pageSize=30&orderBy=modifiedTime desc`
  const res  = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } })
  if (res.status===401) throw new Error('TOKEN_EXPIRED')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.files || []
}

// Get resource links saved locally
function getSavedResources() { return load('saved_resources', []) }
function saveResource(r) {
  const saved = getSavedResources()
  if (saved.find(s=>s.fileId===r.fileId)) return
  save('saved_resources', [...saved, r])
}
function removeResource(fileId) {
  save('saved_resources', getSavedResources().filter(r=>r.fileId!==fileId))
}

export default function ResourcesPage({ onDataChange }) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [saved,     setSaved]     = useState(getSavedResources)
  const [filter,    setFilter]    = useState('all') // all | course name
  const [uploading, setUploading] = useState(false)
  const [uploadCourse, setUploadCourse] = useState('')
  const courses = getCourseNames()
  const hasToken = !!getToken()

  useEffect(() => { save('saved_resources', saved); onDataChange?.() }, [saved])

  // Auto-search PDFs on mount if token available
  useEffect(() => { if (hasToken) doSearch('') }, [hasToken])

  const doSearch = useCallback(async (q) => {
    const token = getToken()
    if (!token) return
    setLoading(true); setError('')
    try {
      const files = await searchDriveFiles(q, token)
      setResults(files)
    } catch(e) {
      if (e.message==='TOKEN_EXPIRED') {
        setError('Your Google session expired. Please sign out and sign back in.')
        window.dispatchEvent(new Event('token-expired'))
      } else {
        setError(`Search failed: ${e.message}`)
      }
    }
    setLoading(false)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    doSearch(query)
  }

  const pinResource = (file, courseName) => {
    const r = {
      fileId:   file.id,
      name:     file.name,
      course:   courseName,
      link:     file.webViewLink,
      size:     file.size,
      modified: file.modifiedTime,
      pinned:   new Date().toISOString(),
    }
    saveResource(r)
    setSaved(getSavedResources())
    onDataChange?.()
  }

  const unpin = (fileId) => {
    removeResource(fileId)
    setSaved(getSavedResources())
  }

  const uploadFile = async (file, courseName) => {
    const token = getToken()
    if (!token || !file) return
    setUploading(true)
    try {
      // Create file metadata
      const meta = JSON.stringify({ name: file.name, mimeType: file.type||'application/pdf' })
      const form = new FormData()
      form.append('metadata', new Blob([meta], {type:'application/json'}))
      form.append('file', file)
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,modifiedTime', {
        method: 'POST',
        headers: { Authorization:`Bearer ${token}` },
        body: form,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const uploaded = await res.json()
      pinResource(uploaded, courseName)
      doSearch(query)
    } catch(e) {
      setError(`Upload failed: ${e.message}`)
    }
    setUploading(false)
  }

  const handleFileInput = (e, courseName) => {
    const file = e.target.files[0]
    if (file) uploadFile(file, courseName)
    e.target.value = ''
  }

  const savedByCourse = courses.map(c => ({
    ...c,
    resources: saved.filter(r => r.course === c.name)
  })).filter(c => filter==='all' || filter===c.name)

  const fmtSize = bytes => {
    if (!bytes) return ''
    const kb = bytes/1024
    return kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
  }

  const isPinned = id => saved.some(r=>r.fileId===id)

  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit' }

  if (!hasToken) return (
    <>
      <div className="page-header">
        <div><div className="page-title">Resources</div><div className="page-subtitle">PDF files from Google Drive, organized by course</div></div>
      </div>
      <div className="page-body">
        <div className="card" style={{textAlign:'center',padding:'48px 24px',color:'var(--text-3)'}}>
          <FileText size={36} style={{margin:'0 auto 12px',opacity:.3}}/>
          <div style={{fontWeight:600,marginBottom:6}}>Google sign-in required</div>
          <div style={{fontSize:13}}>Sign in with Google to browse and search your Drive files.</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Resources</div><div className="page-subtitle">PDF files from Google Drive, organized by course</div></div>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* Search bar */}
        <div className="card" style={{padding:'14px 16px'}}>
          <form onSubmit={handleSearch} style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative',flex:1}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
              <input
                style={{...inputStyle,width:'100%',paddingLeft:34}}
                placeholder="Search your Google Drive for PDFs..."
                value={query}
                onChange={e=>setQuery(e.target.value)}
              />
            </div>
            <Tooltip text="Search Google Drive for files matching your query">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{gap:6,fontSize:13}}>
                {loading ? <RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> : <Search size={13}/>}
                {loading ? 'Searching…' : 'Search'}
              </button>
            </Tooltip>
            <Tooltip text="Refresh results">
              <button type="button" className="btn-icon" onClick={()=>doSearch(query)} disabled={loading} style={{padding:8}}>
                <RefreshCw size={14} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
              </button>
            </Tooltip>
          </form>

          {error && (
            <div style={{marginTop:10,padding:'8px 12px',borderRadius:'var(--radius-md)',background:'var(--coral-dim)',color:'var(--coral)',fontSize:12,border:'1px solid var(--coral)'}}>
              ⚠ {error}
            </div>
          )}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:20,alignItems:'start'}}>

          {/* Pinned resources by course */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em'}}>Pinned by course</span>
              <select style={{...inputStyle,fontSize:11,padding:'4px 8px'}} value={filter} onChange={e=>setFilter(e.target.value)}>
                <option value="all">All courses</option>
                {courses.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {savedByCourse.map(c=>(
              <div key={c.name} className="card" style={{padding:'12px 14px',borderLeft:`3px solid ${c.color}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:c.color}}>{c.name}</span>
                  {/* Upload button */}
                  <Tooltip text={`Upload a PDF to Drive and pin to ${c.name}`}>
                    <label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--accent)',fontWeight:600,padding:'3px 8px',borderRadius:'var(--radius-sm)',border:'1px solid var(--accent)',background:'var(--accent-dim)'}}>
                      <Upload size={11}/> Upload
                      <input type="file" accept=".pdf,application/pdf" style={{display:'none'}} onChange={e=>handleFileInput(e,c.name)} disabled={uploading}/>
                    </label>
                  </Tooltip>
                </div>
                {c.resources.length===0 ? (
                  <div style={{fontSize:11,color:'var(--text-3)'}}>No pinned files — search and pin from Drive</div>
                ) : c.resources.map(r=>(
                  <div key={r.fileId} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--glass-border)'}}>
                    <FileText size={12} style={{color:'var(--text-3)',flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
                      {r.size&&<div style={{fontSize:10,color:'var(--text-3)'}}>{fmtSize(Number(r.size))}</div>}
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <Tooltip text="Open in Google Drive">
                        <a href={r.link} target="_blank" rel="noreferrer" className="btn-icon" style={{padding:4,display:'flex'}}><ExternalLink size={11}/></a>
                      </Tooltip>
                      <Tooltip text="Unpin from this course">
                        <button className="btn-icon" onClick={()=>unpin(r.fileId)} style={{padding:4,color:'var(--coral)'}}><X size={11}/></button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Search results */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em'}}>
              Drive results {results.length>0&&`(${results.length})`}
            </span>

            {results.length===0&&!loading&&(
              <div className="card" style={{textAlign:'center',padding:'32px',color:'var(--text-3)'}}>
                <Search size={24} style={{margin:'0 auto 10px',opacity:.3}}/>
                <div style={{fontSize:13}}>Search your Drive to find PDFs</div>
                <div style={{fontSize:11,marginTop:4}}>Type a filename or leave blank to browse all PDFs</div>
              </div>
            )}

            {results.map(file=>(
              <div key={file.id} className="card" style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                <FileText size={18} style={{color:'var(--accent)',flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</div>
                  <div style={{fontSize:11,color:'var(--text-3)',marginTop:2,display:'flex',gap:8}}>
                    {file.size&&<span>{fmtSize(Number(file.size))}</span>}
                    {file.modifiedTime&&<span>Modified {new Date(file.modifiedTime).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                  {/* Pin to course */}
                  {!isPinned(file.id) ? (
                    <select
                      defaultValue=""
                      onChange={e=>{ if(e.target.value) { pinResource(file, e.target.value); setSaved(getSavedResources()) } }}
                      style={{...inputStyle,fontSize:11,padding:'4px 8px',maxWidth:140}}
                    >
                      <option value="" disabled>Pin to course…</option>
                      {courses.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  ) : (
                    <span style={{fontSize:11,color:'var(--green)',fontWeight:600,padding:'4px 8px'}}>✓ Pinned</span>
                  )}
                  <Tooltip text="Open in Google Drive">
                    <a href={file.webViewLink} target="_blank" rel="noreferrer" className="btn-icon" style={{padding:6,display:'flex'}}>
                      <ExternalLink size={13}/>
                    </a>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
