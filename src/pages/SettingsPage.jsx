import { useState } from 'react'
import { Lock, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { useTheme } from '../hooks/useTheme.js'
import Tooltip from '../components/Tooltip.jsx'

// ── Canvas helpers ────────────────────────────────
const LS_CANVAS_TOKEN  = 'canvas_token_v1'
const LS_CANVAS_URL    = 'canvas_url_v1'
const LS_CANVAS_ICAL   = 'canvas_ical_v1'
const LS_CANVAS_WARNED = 'canvas_warned_v1'
function getCanvasToken() { try { return localStorage.getItem(LS_CANVAS_TOKEN)||'' } catch(e){ return '' } }
function getCanvasUrl()   { try { return localStorage.getItem(LS_CANVAS_URL)||'' }   catch(e){ return '' } }
function getCanvasIcal()  { try { return localStorage.getItem(LS_CANVAS_ICAL)||'' }  catch(e){ return '' } }
function hasWarned()      { try { return !!localStorage.getItem(LS_CANVAS_WARNED) }   catch(e){ return false } }

const FEATURE_KEYS = ['canvas_grades','canvas_modules','canvas_files','canvas_ical']
const FEATURE_LABELS = {
  canvas_grades:  { label:'Grade sync',       desc:'Pull current grades from Canvas API',            req:'token' },
  canvas_modules: { label:'Module progress',  desc:'Show completed vs total modules per course',     req:'token' },
  canvas_files:   { label:'Course files',     desc:'Browse and download course files from Canvas',   req:'token' },
  canvas_ical:    { label:'iCal import',      desc:'Auto-import due dates from Canvas calendar URL', req:'ical'  },
}

// All keys exported/imported — keep in sync with App.jsx ALL_KEYS
const EXPORT_KEYS = [
  'home_tasks', 'study_sessions', 'habit_grid', 'habit_history',
  'timer_settings', 'streak', 'study_week_goal', 'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes', 'full_course_notes_v2',
  'quick_links', 'page_links', 'weather_city', 'scheme', 'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks',
  'notification_settings',
  'saved_resources', 'resource_sort', 'resource_last_course',
  'bing_wallpaper_cache',
]

function ToggleSwitch({ on, onChange, disabled }) {
  return (
    <button onClick={()=>!disabled&&onChange(!on)} style={{
      width:44, height:24, borderRadius:20,
      background: on ? 'var(--accent)' : 'var(--glass-border)',
      border: `1px solid ${on ? 'var(--accent)' : 'var(--glass-border)'}`,
      position:'relative', cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'background .25s, border-color .25s',
      opacity: disabled ? 0.4 : 1, flexShrink:0,
      boxShadow: on ? '0 0 10px var(--accent-glow)' : 'none',
    }}>
      <div style={{
        position:'absolute', top:2, left: on ? 20 : 2,
        width:18, height:18, borderRadius:'50%', background:'white',
        transition:'left .25s cubic-bezier(.4,0,.2,1)',
        boxShadow:'0 1px 4px rgba(0,0,0,.3)',
      }}/>
    </button>
  )
}

function NotificationSettings() {
  const NOTIF_KEY = 'notification_settings'
  const [settings, setSettings] = useState(() => load(NOTIF_KEY, {
    enabled: true, browserPush: false,
    dueSoon3d: true, dueSoon1d: true, dueSoonDay: true, streakReminder: true,
  }))
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const saveSettings = (s) => { setSettings(s); save(NOTIF_KEY, s) }
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const r = await Notification.requestPermission()
    setPermission(r); return r
  }

  const rows = [
    { key:'dueSoon3d',      label:'Due in 3 days' },
    { key:'dueSoon1d',      label:'Due tomorrow'  },
    { key:'dueSoonDay',     label:'Due today'     },
    { key:'streakReminder', label:'Daily streak reminder' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:13,fontWeight:600}}>In-app notifications</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>Bell icon in the top bar</div>
        </div>
        <ToggleSwitch on={settings.enabled} onChange={v=>saveSettings({...settings,enabled:v})}/>
      </div>
      {rows.map(r=>(
        <div key={r.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingLeft:12}}>
          <span style={{fontSize:12,color:'var(--text-2)'}}>{r.label}</span>
          <ToggleSwitch on={settings[r.key]&&settings.enabled} onChange={v=>saveSettings({...settings,[r.key]:v})} disabled={!settings.enabled}/>
        </div>
      ))}
      <div style={{borderTop:'1px solid var(--glass-border)',paddingTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:13,fontWeight:600}}>Browser push</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>
            {permission==='granted'?'✓ Granted':permission==='denied'?'✗ Blocked — enable in browser settings':'Not yet enabled'}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {permission!=='granted'&&<button className="btn btn-ghost" style={{fontSize:11}} onClick={requestPermission}>Enable</button>}
          <ToggleSwitch on={settings.browserPush&&permission==='granted'} onChange={v=>saveSettings({...settings,browserPush:v})} disabled={permission!=='granted'}/>
        </div>
      </div>
      <button className="btn btn-ghost" style={{fontSize:12,alignSelf:'flex-start'}} onClick={()=>{
        if(permission==='granted'){
          new Notification('Planner',{body:'Notifications are working!',icon:'/planner/favicon.svg'})
        } else { alert('Enable browser notifications first, then test again.') }
      }}>🔔 Send test notification</button>
    </div>
  )
}

export default function SettingsPage({ onDataChange }) {
  const { theme, scheme, setTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()
  const [token,      setToken]      = useState('')
  const [showToken,  setShowToken]  = useState(false)
  const [canvasUrl,  setCanvasUrl]  = useState(getCanvasUrl())
  const [icalUrl,    setIcalUrl]    = useState(getCanvasIcal())
  const [features,   setFeatures]   = useState(() => FEATURE_KEYS.reduce((a,k)=>({...a,[k]:load(k,false)}),{}))
  const [connStatus, setConnStatus] = useState(null)
  const [connMsg,    setConnMsg]    = useState('')
  const [icalStatus, setIcalStatus] = useState(null)
  const [icalMsg,    setIcalMsg]    = useState('')
  const [showWarn,   setShowWarn]   = useState(!hasWarned())
  const [saved,      setSaved]      = useState(false)

  const hasToken = !!getCanvasToken()

  const saveFeature = (key, val) => { setFeatures(f=>({...f,[key]:val})); save(key,val); onDataChange?.() }

  const saveToken = () => {
    if (!token.trim()) return
    if (!hasWarned()) { localStorage.setItem(LS_CANVAS_WARNED,'1'); setShowWarn(false) }
    localStorage.setItem(LS_CANVAS_TOKEN, token.trim())
    setToken(''); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  const clearToken = () => { localStorage.removeItem(LS_CANVAS_TOKEN); setSaved(true); setTimeout(()=>setSaved(false),2000) }

  const saveCanvasUrl = () => { localStorage.setItem(LS_CANVAS_URL, canvasUrl.trim()); setSaved(true); setTimeout(()=>setSaved(false),2000) }
  const saveIcalUrl   = () => { localStorage.setItem(LS_CANVAS_ICAL, icalUrl.trim());  setSaved(true); setTimeout(()=>setSaved(false),2000) }

  const testConnection = async () => {
    const t = getCanvasToken(); const u = getCanvasUrl()
    if (!t||!u) { setConnStatus('error'); setConnMsg('Add a token and Canvas URL first'); return }
    setConnStatus('testing'); setConnMsg('')
    try {
      const res = await fetch(`${u}/api/v1/courses?per_page=5`, { headers:{ Authorization:`Bearer ${t}` } })
      if (res.ok) { setConnStatus('ok'); setConnMsg(`Connected — ${(await res.json()).length} courses found`) }
      else { setConnStatus('error'); setConnMsg(`HTTP ${res.status} — check your token and URL`) }
    } catch(e) { setConnStatus('error'); setConnMsg('Network error or CORS restriction') }
  }

  const testIcal = async () => {
    const url = getCanvasIcal()
    if (!url) { setIcalStatus('error'); setIcalMsg('Add an iCal URL first'); return }
    setIcalStatus('testing')
    try {
      const res = await fetch(url)
      if (res.ok && (await res.text()).includes('BEGIN:VCALENDAR')) {
        setIcalStatus('ok'); setIcalMsg('iCal URL is valid')
      } else {
        setIcalStatus('error'); setIcalMsg('URL does not return a valid calendar — try downloading and importing via JSON export')
      }
    } catch(e) { setIcalStatus('error'); setIcalMsg('CORS blocked — try downloading the .ics and importing via JSON export') }
  }

  const doExport = () => {
    const data = EXPORT_KEYS.reduce((a,k)=>({...a,[k]:load(k,null)}),{})
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`planner-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = () => {
    const input = document.createElement('input'); input.type='file'; input.accept='.json'
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const d = JSON.parse(ev.target.result)
          Object.entries(d).forEach(([k,v]) => { if(v!==null) save(k,v) })
          window.dispatchEvent(new Event('drive-loaded'))
        } catch(e) { alert('Invalid JSON file') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const inputStyle   = { padding:'9px 12px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const sectionHead  = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12, marginTop:4 }

  const THEMES = [
    { key:'dark',  icon:'🌙', label:'Dark'  },
    { key:'light', icon:'☀️', label:'Light' },
    { key:'bing',  icon:'🌄', label:'Bing'  },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Canvas integration, appearance, and data</div>
        </div>
        <span style={{fontSize:11,color:saved?'var(--green)':'transparent',fontWeight:600,transition:'color .3s'}}>✓ Saved</span>
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20,maxWidth:720}}>

        {/* Appearance */}
        <div className="card">
          <div className="card-title">Appearance</div>

          <div style={sectionHead}>Theme</div>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {THEMES.map(t=>(
              <button key={t.key} onClick={()=>setTheme(t.key)}
                className={theme===t.key?'btn btn-primary':'btn btn-ghost'}
                style={{flex:1,justifyContent:'center',gap:6,fontSize:13}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={sectionHead}>Accent color</div>
          <div style={{display:'flex',gap:12}}>
            {SCHEMES.map(s=>(
              <Tooltip key={s} text={s.charAt(0).toUpperCase()+s.slice(1)}>
                <button onClick={()=>setScheme(s)} style={{
                  width:32, height:32, borderRadius:'50%',
                  background:SCHEME_COLORS[s],
                  border:`3px solid ${scheme===s?'var(--text-1)':'transparent'}`,
                  cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.2)',
                  transition:'transform .15s',
                }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Canvas connection */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <div className="card-title" style={{margin:0}}>Canvas integration</div>
            <Tooltip text="Your token is stored only in this browser's localStorage — never sent anywhere except directly to Canvas">
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-3)',cursor:'help'}}>
                <Lock size={11}/> stored locally
              </div>
            </Tooltip>
          </div>

          {showWarn && (
            <div style={{background:'var(--amber-dim)',border:'1px solid var(--amber)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--amber)',display:'flex',gap:10,alignItems:'flex-start'}}>
              <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
              <div><strong>Security notice:</strong> Your Canvas token gives read access to your account. It is stored only in this browser and never leaves your device. Never share your screen while this page is visible.</div>
            </div>
          )}

          <div style={sectionHead}>Canvas URL</div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input style={{...inputStyle,flex:1}} placeholder="https://canvas.instructure.com" value={canvasUrl} onChange={e=>setCanvasUrl(e.target.value)}/>
            <button className="btn btn-ghost" onClick={saveCanvasUrl} style={{whiteSpace:'nowrap'}}>Save</button>
          </div>

          <div style={sectionHead}>Access token {hasToken&&<span style={{color:'var(--green)',fontSize:10,marginLeft:6,fontWeight:400}}>✓ Token saved</span>}</div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <div style={{position:'relative',flex:1}}>
              <input style={{...inputStyle,paddingRight:80}} type={showToken?'text':'password'} placeholder={hasToken?'Token saved — paste new to replace':'Paste your Canvas access token'} value={token} onChange={e=>setToken(e.target.value)}/>
              <button onClick={()=>setShowToken(s=>!s)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',fontSize:11,color:'var(--text-3)',cursor:'pointer'}}>{showToken?'Hide':'Show'}</button>
            </div>
            <button className="btn btn-primary" onClick={saveToken} disabled={!token.trim()}>Save</button>
            {hasToken&&<button className="btn btn-ghost" onClick={clearToken} style={{color:'var(--coral)'}}>Clear</button>}
          </div>
          <a href="https://canvas.instructure.com/profile/settings" target="_blank" rel="noreferrer" style={{fontSize:11,color:'var(--accent)',display:'inline-flex',alignItems:'center',gap:4,marginBottom:16}}>
            Get your token from Canvas profile settings <ExternalLink size={10}/>
          </a>

          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className="btn btn-ghost" onClick={testConnection} disabled={connStatus==='testing'} style={{gap:6}}>
              {connStatus==='testing'&&<RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>}
              Test connection
            </button>
            {connStatus&&connStatus!=='testing'&&(
              <span style={{fontSize:12,color:connStatus==='ok'?'var(--green)':'var(--coral)',alignSelf:'center'}}>{connMsg}</span>
            )}
          </div>

          <div style={sectionHead}>Canvas iCal URL</div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input style={{...inputStyle,flex:1}} placeholder="https://canvas.instructure.com/feeds/calendars/…" value={icalUrl} onChange={e=>setIcalUrl(e.target.value)}/>
            <button className="btn btn-ghost" onClick={saveIcalUrl}>Save</button>
            <button className="btn btn-ghost" onClick={testIcal}>Test</button>
          </div>
          {icalStatus&&icalStatus!=='testing'&&(
            <div style={{fontSize:12,color:icalStatus==='ok'?'var(--green)':'var(--coral)',marginBottom:12}}>{icalMsg}</div>
          )}

          <div style={sectionHead}>Features</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {FEATURE_KEYS.map(key=>{
              const f = FEATURE_LABELS[key]
              const disabled = f.req==='token'?!hasToken:!getCanvasIcal()
              return (
                <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
                      {f.label}
                      {disabled&&<span style={{fontSize:10,color:'var(--text-3)',fontWeight:400}}>(requires {f.req==='token'?'token':'iCal URL'})</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{f.desc}</div>
                  </div>
                  <ToggleSwitch on={features[key]&&!disabled} onChange={v=>saveFeature(key,v)} disabled={disabled}/>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-title">Notifications</div>
          <NotificationSettings/>
        </div>

        {/* Data */}
        <div className="card">
          <div className="card-title">Data management</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <Tooltip text="Download all planner data as a JSON backup file">
              <button className="btn btn-ghost" onClick={doExport}>📥 Export backup</button>
            </Tooltip>
            <Tooltip text="Restore all data from a previously exported JSON file">
              <button className="btn btn-ghost" onClick={doImport}>📤 Import backup</button>
            </Tooltip>
            <Tooltip text="Wipe all planner data from this browser — cannot be undone">
              <button className="btn btn-ghost" style={{color:'var(--coral)'}} onClick={()=>{
                if(!confirm('Wipe ALL data? This removes all tasks, assignments, habits, notes, settings, and credentials. Cannot be undone.')) return
                const prefixes=['planner_v1_']
                const exactKeys=['planner_profile_v1','planner_hint_v1','planner_token_v1','canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1']
                Object.keys(localStorage).filter(k=>prefixes.some(p=>k.startsWith(p))).forEach(k=>localStorage.removeItem(k))
                exactKeys.forEach(k=>localStorage.removeItem(k))
                sessionStorage.clear(); window.location.reload()
              }}>🗑 Wipe all data</button>
            </Tooltip>
          </div>
        </div>

      </div>
    </>
  )
}
