import { useState } from 'react'
import { Eye, EyeOff, Lock, Check, X, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { useTheme } from '../hooks/useTheme.js'
import Tooltip from '../components/Tooltip.jsx'
import { auth as fbAuth } from '../firebase.js'
import { signOut as fbSignOut } from 'firebase/auth'

const LS_CANVAS_TOKEN  = 'canvas_token_v1'
const LS_CANVAS_URL    = 'canvas_url_v1'
const LS_CANVAS_ICAL   = 'canvas_ical_v1'
const LS_CANVAS_WARNED = 'canvas_warned_v1'

function getCanvasToken() { try { return localStorage.getItem(LS_CANVAS_TOKEN)||'' } catch(e){ return '' } }
function getCanvasUrl()   { try { return localStorage.getItem(LS_CANVAS_URL)||''   } catch(e){ return '' } }
function getCanvasIcal()  { try { return localStorage.getItem(LS_CANVAS_ICAL)||''  } catch(e){ return '' } }
function hasWarned()      { try { return !!localStorage.getItem(LS_CANVAS_WARNED)  } catch(e){ return false } }

const FEATURE_KEYS = ['canvas_grades','canvas_modules','canvas_files','canvas_ical']
const FEATURE_LABELS = {
  canvas_grades:  { label:'Grade sync',       desc:'Pull grades from Canvas API',                req:'token' },
  canvas_modules: { label:'Module progress',  desc:'Show completed vs total modules per course', req:'token' },
  canvas_files:   { label:'Course files',     desc:'Browse and download course files',           req:'token' },
  canvas_ical:    { label:'iCal import',      desc:'Auto-import due dates from Canvas calendar', req:'ical'  },
}

const ALL_EXPORT_KEYS = [
  'home_tasks','study_sessions','habit_grid','habit_history',
  'timer_settings','streak','study_week_goal','sem_end_date',
  'terms_v1','assignments','habits_config','recurring_tasks','rec_history','goals_config',
  'course_notes','full_course_notes','full_course_notes_v2',
  'quick_links','page_links','weather_city','scheme','theme',
  'flashcard_decks','flashcard_cards',
  'calendar_blocks','calendar_plans',
  'notification_settings',
  'saved_resources','resource_sort','resource_last_course',
  'bing_wallpaper_cache','hidden_tabs',
]

function ToggleSwitch({ on, onChange, disabled }) {
  return (
    <button onClick={()=>!disabled&&onChange(!on)} style={{
      width:44,height:24,borderRadius:20,flexShrink:0,cursor:disabled?'not-allowed':'pointer',
      background:on?'var(--accent)':'var(--glass-border)',
      border:`1px solid ${on?'var(--accent)':'var(--glass-border)'}`,
      position:'relative',transition:'background .25s,border-color .25s',
      opacity:disabled?.4:1,boxShadow:on?'0 0 10px var(--accent-glow)':'none',
    }}>
      <div style={{position:'absolute',top:2,left:on?20:2,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s cubic-bezier(.4,0,.2,1)',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
    </button>
  )
}

export default function SettingsPage({ onDataChange, allNav=[], hiddenTabs=[], setHiddenTabs=()=>{} }) {
  const { theme, scheme, setTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()

  const [token,      setToken]      = useState('')
  const [showToken,  setShowToken]  = useState(false)
  const [canvasUrl,  setCanvasUrl]  = useState(getCanvasUrl())
  const [icalUrl,    setIcalUrl]    = useState(getCanvasIcal())
  const [features,   setFeatures]   = useState(() => FEATURE_KEYS.reduce((a,k)=>({...a,[k]:load(k,false)}),{}))
  const [connStatus, setConnStatus] = useState(null)
  const [connMsg,    setConnMsg]    = useState('')
  const [showWarn,   setShowWarn]   = useState(!hasWarned())
  const [saved,      setSaved]      = useState(false)

  const hasToken = !!getCanvasToken()

  const flashSaved = () => { setSaved(true); setTimeout(()=>setSaved(false),2000) }
  const saveFeature = (key, val) => { setFeatures(f=>({...f,[key]:val})); save(key,val); onDataChange?.() }

  const saveToken = () => {
    if (!token.trim()) return
    if (!hasWarned()) { localStorage.setItem(LS_CANVAS_WARNED,'1'); setShowWarn(false) }
    localStorage.setItem(LS_CANVAS_TOKEN, token.trim())
    setToken(''); flashSaved()
  }

  const testConnection = async () => {
    const t = getCanvasToken(); const u = getCanvasUrl()
    if (!t||!u) { setConnStatus('error'); setConnMsg('Add a token and Canvas URL first'); return }
    setConnStatus('testing'); setConnMsg('')
    try {
      const res = await fetch(`${u}/api/v1/courses?per_page=5`, { headers:{ Authorization:`Bearer ${t}` } })
      if (res.ok) { setConnStatus('ok'); setConnMsg(`Connected — ${(await res.json()).length} courses`) }
      else { setConnStatus('error'); setConnMsg(`HTTP ${res.status}`) }
    } catch(e) { setConnStatus('error'); setConnMsg('Network error') }
  }

  // Tab visibility
  const toggleTab = (key) => {
    const next = hiddenTabs.includes(key)
      ? hiddenTabs.filter(k => k !== key)
      : [...hiddenTabs, key]
    setHiddenTabs(next)
    save('hidden_tabs', next)
    onDataChange?.()
  }

  // Flatten all nav items for the toggle list (exclude settings itself)
  const allTabItems = allNav.flatMap(g => g.items).filter(item => item.key !== 'settings')

  const inp = { padding:'9px 12px',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-md)',color:'var(--text-1)',fontSize:13,fontFamily:'inherit',width:'100%' }
  const sh  = { fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12,marginTop:4 }

  const THEMES = [
    { key:'dark',  icon:'🌙', label:'Dark'  },
    { key:'light', icon:'☀️', label:'Light' },
    { key:'bing',  icon:'🌄', label:'Bing'  },
  ]

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Settings</div><div className="page-subtitle">Appearance, Canvas, tabs, and data</div></div>
        <span style={{fontSize:11,color:saved?'var(--green)':'transparent',fontWeight:600,transition:'color .3s'}}>✓ Saved</span>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20,maxWidth:720}}>

        {/* ── Appearance ───────────────────────────────── */}
        <div className="card">
          <div className="card-title">Appearance</div>

          <div style={sh}>Theme</div>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {THEMES.map(t=>(
              <button key={t.key} onClick={()=>setTheme(t.key)}
                className={theme===t.key?'btn btn-primary':'btn btn-ghost'}
                style={{flex:1,justifyContent:'center',gap:6,fontSize:13}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={sh}>Accent color</div>
          <div style={{display:'flex',gap:12}}>
            {SCHEMES.map(s=>(
              <Tooltip key={s} text={s.charAt(0).toUpperCase()+s.slice(1)}>
                <button onClick={()=>setScheme(s)} style={{
                  width:32,height:32,borderRadius:'50%',background:SCHEME_COLORS[s],
                  border:`3px solid ${scheme===s?'var(--text-1)':'transparent'}`,
                  cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.2)',transition:'transform .15s',
                }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* ── Tab visibility ────────────────────────────── */}
        <div className="card">
          <div className="card-title">Tabs</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:14}}>
            Hide tabs you don't use. Hidden tabs are removed from the sidebar. Settings is always visible.
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {allTabItems.map(item => {
              const isVisible = !hiddenTabs.includes(item.key)
              const Icon = item.icon
              return (
                <div key={item.key} style={{display:'flex',alignItems:'center',gap:12,justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:'var(--radius-sm)',background:isVisible?'var(--accent-dim)':'var(--glass-bg-2)',border:`1px solid ${isVisible?'var(--accent)':'var(--glass-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                      <Icon size={14} style={{color:isVisible?'var(--accent)':'var(--text-3)'}}/>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:isVisible?'var(--text-1)':'var(--text-3)'}}>{item.text}</div>
                      <div style={{fontSize:11,color:'var(--text-3)'}}>{isVisible?'Visible in sidebar':'Hidden'}</div>
                    </div>
                  </div>
                  <ToggleSwitch on={isVisible} onChange={()=>toggleTab(item.key)}/>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Canvas ───────────────────────────────────── */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <div className="card-title" style={{margin:0}}>Canvas integration</div>
            <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-3)'}}>
              <Lock size={11}/> stored locally only
            </div>
          </div>

          {showWarn && (
            <div style={{background:'var(--amber-dim)',border:'1px solid var(--amber)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--amber)',display:'flex',gap:10,alignItems:'flex-start'}}>
              <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
              <div><strong>Security:</strong> Your token gives read access to Canvas. It stays in this browser only. <button onClick={()=>{localStorage.setItem(LS_CANVAS_WARNED,'1');setShowWarn(false)}} style={{background:'none',border:'none',color:'var(--amber)',cursor:'pointer',fontSize:11,fontWeight:600,padding:0,marginTop:4,display:'block'}}>Got it — dismiss</button></div>
            </div>
          )}

          <div style={sh}>Canvas URL</div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input style={{...inp,flex:1}} placeholder="https://canvas.instructure.com" value={canvasUrl} onChange={e=>setCanvasUrl(e.target.value)}/>
            <button className="btn btn-ghost" onClick={()=>{localStorage.setItem(LS_CANVAS_URL,canvasUrl.trim());flashSaved()}}>Save</button>
          </div>

          <div style={sh}>API token {hasToken&&<span style={{color:'var(--green)',fontSize:10,marginLeft:6,fontWeight:400}}>✓ saved</span>}</div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <div style={{position:'relative',flex:1}}>
              <input style={{...inp,paddingRight:60}} type={showToken?'text':'password'}
                placeholder={hasToken?'Token saved — paste to replace':'Paste Canvas token'} value={token} onChange={e=>setToken(e.target.value)}/>
              <button onClick={()=>setShowToken(s=>!s)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',fontSize:11,color:'var(--text-3)',cursor:'pointer'}}>
                {showToken?<EyeOff size={13}/>:<Eye size={13}/>}
              </button>
            </div>
            <button className="btn btn-primary" onClick={saveToken} disabled={!token.trim()}>Save</button>
            {hasToken&&<button className="btn btn-ghost" onClick={()=>{localStorage.removeItem(LS_CANVAS_TOKEN);flashSaved()}} style={{color:'var(--coral)'}}>Clear</button>}
          </div>
          <a href="https://canvas.instructure.com/profile/settings" target="_blank" rel="noreferrer" style={{fontSize:11,color:'var(--accent)',display:'inline-flex',alignItems:'center',gap:4,marginBottom:16}}>
            Get token from Canvas → Account → Settings <ExternalLink size={10}/>
          </a>

          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className="btn btn-ghost" onClick={testConnection} disabled={connStatus==='testing'} style={{gap:6}}>
              <RefreshCw size={12} style={{animation:connStatus==='testing'?'spin 1s linear infinite':'none'}}/> Test connection
            </button>
            {connStatus&&connStatus!=='testing'&&<span style={{fontSize:12,color:connStatus==='ok'?'var(--green)':'var(--coral)',alignSelf:'center'}}>{connMsg}</span>}
          </div>

          <div style={sh}>iCal URL</div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input style={{...inp,flex:1}} placeholder="https://canvas.instructure.com/feeds/calendars/…" value={icalUrl} onChange={e=>setIcalUrl(e.target.value)}/>
            <button className="btn btn-ghost" onClick={()=>{localStorage.setItem(LS_CANVAS_ICAL,icalUrl.trim());flashSaved()}}>Save</button>
          </div>

          <div style={sh}>Features</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {FEATURE_KEYS.map(key=>{
              const f=FEATURE_LABELS[key]
              const disabled=f.req==='token'?!hasToken:!getCanvasIcal()
              return (
                <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{f.label}{disabled&&<span style={{fontSize:10,color:'var(--text-3)',fontWeight:400,marginLeft:6}}>(needs {f.req==='token'?'token':'iCal URL'})</span>}</div>
                    <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{f.desc}</div>
                  </div>
                  <ToggleSwitch on={features[key]&&!disabled} onChange={v=>saveFeature(key,v)} disabled={disabled}/>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Data management ───────────────────────────── */}
        <div className="card">
          <div className="card-title">Data management</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button className="btn btn-ghost" onClick={()=>{
              const data=ALL_EXPORT_KEYS.reduce((a,k)=>({...a,[k]:load(k,null)}),{})
              const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
              const url=URL.createObjectURL(blob)
              const a=document.createElement('a'); a.href=url; a.download=`planner-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
              URL.revokeObjectURL(url)
            }}>📥 Export backup</button>
            <button className="btn btn-ghost" onClick={()=>{
              const input=document.createElement('input'); input.type='file'; input.accept='.json'
              input.onchange=e=>{
                const file=e.target.files[0]; if(!file) return
                const reader=new FileReader()
                reader.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); Object.entries(d).forEach(([k,v])=>{ if(v!==null) save(k,v) }); window.dispatchEvent(new Event('drive-loaded')) }catch(e){ alert('Invalid JSON') } }
                reader.readAsText(file)
              }; input.click()
            }}>📤 Import backup</button>
            <button className="btn btn-ghost" style={{color:'var(--coral)'}} onClick={()=>{
              if(!confirm('Wipe ALL data? Cannot be undone.')) return
              const prefixes=['planner_v1_']; const exactKeys=['canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1']
              Object.keys(localStorage).filter(k=>prefixes.some(p=>k.startsWith(p))).forEach(k=>localStorage.removeItem(k))
              exactKeys.forEach(k=>localStorage.removeItem(k))
              sessionStorage.clear()
              fbSignOut(fbAuth).catch(()=>{}).finally(()=>window.location.reload())
            }}>🗑 Wipe all data</button>
          </div>
        </div>
      </div>
    </>
  )
}
