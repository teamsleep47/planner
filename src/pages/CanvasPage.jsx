import { useState, useEffect } from 'react'
import { RefreshCw, Download, ExternalLink, BookOpen, FileText, BarChart2, Lock } from 'lucide-react'
import { fetchCourses, fetchEnrollment, fetchModules, fetchFiles, getCanvasToken, testCanvasConnection } from '../hooks/useCanvas.js'
import { load } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

function FeatureCard({ title, icon:Icon, enabled, children }) {
  return (
    <div style={{
      overflow:'hidden',
      maxHeight: enabled ? 2000 : 0,
      opacity:   enabled ? 1 : 0,
      transform: enabled ? 'translateY(0)' : 'translateY(-12px)',
      transition:'max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s ease, transform .3s ease',
      marginBottom: enabled ? 16 : 0,
    }}>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <Icon size={15} style={{color:'var(--accent)'}}/>
          <span className="card-title" style={{margin:0}}>{title}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function CanvasPage() {
  const [status,   setStatus]   = useState(null) // null | ok | cors | error
  const [courses,  setCourses]  = useState([])
  const [grades,   setGrades]   = useState({})
  const [modules,  setModules]  = useState({})
  const [files,    setFiles]    = useState({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const gradesOn  = load('canvas_grades',  false)
  const modulesOn = load('canvas_modules', false)
  const filesOn   = load('canvas_files',   false)
  const hasToken  = !!getCanvasToken()

  const fetchAll = async () => {
    if (!hasToken) return
    setLoading(true); setError('')
    try {
      // Test connection first
      const test = await testCanvasConnection()
      if (!test.ok) {
        if (test.error === 'cors') { setStatus('cors'); setError('Canvas at scf.instructure.com is blocking requests from GitHub Pages (CORS policy). Grade sync, modules, and files cannot be fetched. iCal import still works — set it up in Settings.') }
        else if (test.error === 'invalid_token') setError('Your Canvas token is invalid or expired. Go to Settings to update it.')
        else setError(`Connection error: ${test.error}`)
        setLoading(false); return
      }
      setStatus('ok')
      const courseList = await fetchCourses()
      setCourses(courseList)

      // Fetch per-course data in parallel
      await Promise.all(courseList.map(async (c) => {
        const id = c.id
        if (gradesOn)  { try { const e=await fetchEnrollment(id); setGrades(g=>({...g,[id]:e?.grades})) } catch(e){} }
        if (modulesOn) { try { const m=await fetchModules(id);    setModules(mo=>({...mo,[id]:m})) } catch(e){} }
        if (filesOn)   { try { const f=await fetchFiles(id);      setFiles(fi=>({...fi,[id]:f})) } catch(e){} }
      }))
    } catch(e) {
      setError(`Unexpected error: ${e.message}`)
    }
    setLoading(false)
  }

  useEffect(() => { if (hasToken) fetchAll() }, [])

  if (!hasToken) return (
    <>
      <div className="page-header"><div><div className="page-title">Canvas</div><div className="page-subtitle">LMS integration</div></div></div>
      <div className="page-body">
        <div className="card" style={{textAlign:'center',padding:'48px 24px',color:'var(--text-3)'}}>
          <Lock size={32} style={{margin:'0 auto 12px',opacity:.4}}/>
          <div style={{fontWeight:600,marginBottom:6}}>No token saved</div>
          <div style={{fontSize:13}}>Go to Settings to enter your Canvas API token and enable features.</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Canvas</div>
          <div className="page-subtitle">
            {status==='ok' ? `${courses.length} active courses` : status==='cors' ? 'CORS restricted — partial access' : 'Connecting…'}
          </div>
        </div>
        <Tooltip text="Refresh all Canvas data">
          <button className="btn btn-ghost" onClick={fetchAll} disabled={loading} style={{gap:8}}>
            <RefreshCw size={13} style={{animation:loading?'spin 1s linear infinite':'none'}}/> Refresh
          </button>
        </Tooltip>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:16}}>

        {error && (
          <div style={{padding:'12px 16px',borderRadius:'var(--radius-md)',background:'var(--coral-dim)',border:'1px solid var(--coral)',color:'var(--coral)',fontSize:13}}>
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div style={{textAlign:'center',padding:'32px',color:'var(--text-3)',fontSize:13}}>
            Loading Canvas data…
          </div>
        )}

        {!loading && courses.length > 0 && (
          <>
            {/* Courses overview */}
            <div className="card">
              <div className="card-title">Active courses</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {courses.map(c=>{
                  const grade = grades[c.id]
                  const mods  = modules[c.id]||[]
                  const done  = mods.filter(m=>m.completed_requirements?.length===m.items_count).length
                  return (
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:'var(--radius-md)',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                        {c.course_code && <div style={{fontSize:11,color:'var(--text-3)'}}>{c.course_code}</div>}
                      </div>
                      {gradesOn && grade && (
                        <Tooltip text={`Current grade: ${grade.current_grade||'N/A'} (${grade.current_score||'—'}%)`}>
                          <div style={{textAlign:'center',padding:'4px 10px',borderRadius:20,background:'var(--accent-dim)',border:'1px solid var(--accent)'}}>
                            <div style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>{grade.current_grade||'N/A'}</div>
                            <div style={{fontSize:10,color:'var(--text-3)'}}>{grade.current_score||'—'}%</div>
                          </div>
                        </Tooltip>
                      )}
                      {modulesOn && mods.length > 0 && (
                        <Tooltip text={`${done} of ${mods.length} modules complete`}>
                          <div style={{fontSize:12,color:'var(--text-2)'}}>📦 {done}/{mods.length}</div>
                        </Tooltip>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Grades detail */}
            <FeatureCard title="Grade sync" icon={BarChart2} enabled={gradesOn}>
              {courses.map(c=>{
                const g = grades[c.id]
                if (!g) return null
                const pct = parseFloat(g.current_score)||0
                return (
                  <div key={c.id} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                      <span style={{fontWeight:500}}>{c.name}</span>
                      <span style={{fontWeight:700,color:pct>=90?'var(--green)':pct>=80?'var(--amber)':'var(--coral)'}}>{g.current_grade||'N/A'} ({pct}%)</span>
                    </div>
                    <div className="progress-bar" style={{height:7}}>
                      <div className="progress-fill" style={{width:`${pct}%`,background:pct>=90?'var(--green)':pct>=80?'var(--amber)':'var(--coral)'}}/>
                    </div>
                  </div>
                )
              })}
            </FeatureCard>

            {/* Modules */}
            <FeatureCard title="Module progress" icon={BookOpen} enabled={modulesOn}>
              {courses.map(c=>{
                const mods = modules[c.id]||[]; if(!mods.length) return null
                return (
                  <div key={c.id} style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--accent)',marginBottom:8}}>{c.name}</div>
                    {mods.map(m=>{
                      const done = m.state==='completed'
                      return (
                        <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--glass-border)'}}>
                          <span style={{fontSize:14}}>{done?'✅':'⬜'}</span>
                          <span style={{fontSize:12,color:done?'var(--text-3)':'var(--text-1)',textDecoration:done?'line-through':'none',flex:1}}>{m.name}</span>
                          {m.items_count>0&&<span style={{fontSize:11,color:'var(--text-3)'}}>{m.items_count} items</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </FeatureCard>

            {/* Files */}
            <FeatureCard title="Course files" icon={FileText} enabled={filesOn}>
              {courses.map(c=>{
                const cf = files[c.id]||[]; if(!cf.length) return null
                return (
                  <div key={c.id} style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--accent)',marginBottom:8}}>{c.name}</div>
                    {cf.slice(0,10).map(f=>(
                      <div key={f.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--glass-border)'}}>
                        <FileText size={12} style={{color:'var(--text-3)',flexShrink:0}}/>
                        <span style={{flex:1,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.display_name}</span>
                        <span style={{fontSize:10,color:'var(--text-3)',flexShrink:0}}>{f.size ? `${Math.round(f.size/1024)}KB` : ''}</span>
                        <Tooltip text={`Download ${f.display_name}`}>
                          <a href={f.url} target="_blank" rel="noreferrer" style={{display:'flex',color:'var(--accent)'}}>
                            <Download size={12}/>
                          </a>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )
              })}
            </FeatureCard>
          </>
        )}
      </div>
    </>
  )
}
