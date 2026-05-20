import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Check, X, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  getCanvasToken, getCanvasUrl, getCanvasIcal, hasWarned,
  saveCanvasToken, saveCanvasUrl, saveCanvasIcal, setWarned,
  clearCanvasToken, testCanvasConnection, parseIcal
} from '../hooks/useCanvas.js'
import { useNotifications } from '../hooks/useNotifications.js'

function NotificationSettings() {
  const { settings, saveSettings, permission, requestPermission } = useNotifications()

  const toggle = (key) => saveSettings({...settings, [key]: !settings[key]})

  const TOGGLES = [
    { key:'dueSoon3d',     label:'Assignment due in 3 days',      desc:'Get notified 3 days before a deadline' },
    { key:'dueSoon1d',     label:'Assignment due tomorrow',        desc:'Get notified the day before a deadline' },
    { key:'dueToday',      label:'Assignment due today',           desc:'Alert on the day an assignment is due' },
    { key:"streakBreak",   label:"Study streak at risk",           desc:"Remind me at 6pm if you have not studied today" },
    { key:'habitReminder', label:'Daily habit reminder',           desc:'Evening reminder to check off habits' },
  ]

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 12px',borderRadius:'var(--radius-md)',background: permission==='granted'?'var(--green-dim)':permission==='denied'?'var(--coral-dim)':'var(--amber-dim)',border:`1px solid ${permission==='granted'?'var(--green)':permission==='denied'?'var(--coral)':'var(--amber)'}`}}>
        <span style={{fontSize:12,color: permission==='granted'?'var(--green)':permission==='denied'?'var(--coral)':'var(--amber)',flex:1,fontWeight:500}}>
          Browser notifications: {permission==='granted'?'Enabled':permission==='denied'?'Blocked — check browser settings':'Not yet requested'}
        </span>
        {permission!=='granted'&&permission!=='denied'&&(
          <button className="btn btn-primary" onClick={requestPermission} style={{fontSize:12,padding:'5px 12px'}}>Enable</button>
        )}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,padding:'10px 12px',borderRadius:'var(--radius-md)',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:13}}>Browser popup notifications</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>Show notifications outside the browser tab</div>
        </div>
        <button onClick={()=>toggle('browserPush')} style={{width:44,height:24,borderRadius:20,background:settings.browserPush&&permission==='granted'?'var(--accent)':'var(--glass-border)',border:'none',position:'relative',cursor:'pointer',transition:'background .25s',opacity:permission!=='granted'?.4:1}}>
          <div style={{position:'absolute',top:2,left:settings.browserPush&&permission==='granted'?20:2,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
        </button>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {TOGGLES.map(t=>(
          <div key={t.key} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:'var(--radius-md)',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)'}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{t.label}</div>
              <div style={{fontSize:12,color:'var(--text-3)'}}>{t.desc}</div>
            </div>
            <button onClick={()=>toggle(t.key)} style={{width:44,height:24,borderRadius:20,background:settings[t.key]?'var(--accent)':'var(--glass-border)',border:'none',position:'relative',cursor:'pointer',transition:'background .25s',boxShadow:settings[t.key]?'0 0 8px var(--accent-glow)':'none'}}>
              <div style={{position:'absolute',top:2,left:settings[t.key]?20:2,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
import { load, save } from '../utils/storage.js'
import { useTheme } from '../hooks/useTheme.js'
import Tooltip from '../components/Tooltip.jsx'

const FEATURE_KEYS = ['canvas_grades','canvas_modules','canvas_files','canvas_ical']
const FEATURE_LABELS = {
  canvas_grades:  { label:'Grade sync',       desc:'Pull current grades from Canvas API',           req:'token' },
  canvas_modules: { label:'Module progress',  desc:'Show completed vs total modules per course',    req:'token' },
  canvas_files:   { label:'Course files',     desc:'Browse and download course files from Canvas',  req:'token' },
  canvas_ical:    { label:'iCal import',      desc:'Auto-import due dates from Canvas calendar URL', req:'ical'  },
}

function ToggleSwitch({ on, onChange, disabled }) {
  return (
    <button onClick={()=>!disabled&&onChange(!on)} style={{
      width:44, height:24, borderRadius:20,
      background: on ? 'var(--accent)' : 'var(--glass-border)',
      border: `1px solid ${on ? 'var(--accent)' : 'var(--glass-border)'}`,
      position:'relative', cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'background .25s, border-color .25s',
      opacity: disabled ? 0.4 : 1,
      flexShrink:0,
      boxShadow: on ? '0 0 10px var(--accent-glow)' : 'none',
    }}>
      <div style={{
        position:'absolute', top:2,
        left: on ? 20 : 2,
        width:18, height:18, borderRadius:'50%',
        background:'white',
        transition:'left .25s cubic-bezier(.4,0,.2,1)',
        boxShadow:'0 1px 4px rgba(0,0,0,.3)',
      }}/>
    </button>
  )
}

export default function SettingsPage({ onDataChange }) {
  const { theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()
  const [token,      setToken]      = useState('')
  const [showToken,  setShowToken]  = useState(false)
  const [canvasUrl,  setCanvasUrl]  = useState(getCanvasUrl())
  const [icalUrl,    setIcalUrl]    = useState(getCanvasIcal())
  const [features,   setFeatures]   = useState(() => FEATURE_KEYS.reduce((a,k)=>({...a,[k]:load(k,false)}),{}))
  const [connStatus, setConnStatus] = useState(null) // null | testing | ok | error
  const [connMsg,    setConnMsg]    = useState('')
  const [icalStatus, setIcalStatus] = useState(null)
  const [icalMsg,    setIcalMsg]    = useState('')
  const [showWarn,   setShowWarn]   = useState(!hasWarned())
  const [saved,      setSaved]      = useState(false)

  // Token is always masked from state — only write to localStorage
  const hasToken = !!getCanvasToken()

  const saveFeature = (key, val) => {
    setFeatures(f => ({...f, [key]:val}))
    save(key, val)
    onDataChange?.()
  }

  const handleSaveToken = () => {
    if (!token) return
    saveCanvasToken(token)
    saveCanvasUrl(canvasUrl)
    setToken('')
    setSaved(true)
    setTimeout(()=>setSaved(false), 2000)
    if (!hasWarned()) { setWarned(); setShowWarn(false) }
  }

  const handleClearToken = () => {
    clearCanvasToken()
    setConnStatus(null)
    setSaved(false)
  }

  const testConnection = async () => {
    setConnStatus('testing')
    const result = await testCanvasConnection()
    if (result.ok) {
      setConnStatus('ok')
      setConnMsg(`Connected as ${result.user?.name || 'unknown'}`)
    } else {
      setConnStatus('error')
      const msgs = {
        no_token:      'No token saved — enter your token above first',
        invalid_token: 'Token rejected by Canvas — check it and try again',
        cors:          'CORS blocked — Canvas at this URL does not allow browser requests from GitHub Pages. iCal import will still work.',
      }
      setConnMsg(msgs[result.error] || `Error: ${result.error}`)
    }
  }

  const importIcal = async () => {
    setIcalStatus('loading')
    try {
      const res = await fetch(icalUrl)
      if (!res.ok) throw new Error('fetch failed')
      const text = await res.text()
      const events = parseIcal(text)
      if (!events.length) { setIcalStatus('error'); setIcalMsg('No events found in calendar feed'); return }
      // Merge into assignments
      const existing = load('assignments', [])
      const newOnes  = events.filter(e => !existing.find(a => a.title===e.summary && a.due===e.due))
      const merged   = [...existing, ...newOnes.map((e,i)=>({ id:Date.now()+i, title:e.summary, course:'Humanities', type:e.type, due:e.due, status:'To do', notes:e.desc||'' }))]
      save('assignments', merged)
      window.dispatchEvent(new Event('drive-loaded'))
      setIcalStatus('ok')
      setIcalMsg(`Imported ${newOnes.length} new assignments (${events.length - newOnes.length} already existed)`)
    } catch(e) {
      setIcalStatus('error')
      setIcalMsg('Could not fetch iCal — Canvas may block cross-origin requests. Try downloading the .ics and importing via JSON export instead.')
    }
  }

  const inputStyle = { padding:'9px 12px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const sectionHead = { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12, marginTop:4 }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Canvas integration, appearance, and data</div>
        </div>
      </div>

      <div className="page-body" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:720 }}>

        {/* Appearance */}
        <div className="card">
          <div className="card-title">Appearance</div>
          <div style={sectionHead}>Mode</div>
          <button onClick={toggleTheme} className="btn btn-ghost" style={{ marginBottom:16, gap:8 }}>
            {theme==='dark' ? '☀️ Switch to light mode' : '🌙 Switch to dark mode'}
          </button>
          <div style={sectionHead}>Accent color</div>
          <div style={{ display:'flex', gap:12 }}>
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
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div className="card-title" style={{margin:0}}>Canvas integration</div>
            <Tooltip text="Your token is stored only in this browser's localStorage — never sent anywhere except directly to Canvas">
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-3)', cursor:'help' }}>
                <Lock size={11}/> stored locally
              </div>
            </Tooltip>
          </div>

          {/* Token warning */}
          {showWarn && (
            <div style={{ background:'var(--amber-dim)', border:'1px solid var(--amber)', borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--amber)', display:'flex', gap:10, alignItems:'flex-start' }}>
              <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
              <div>
                <strong>Security notice:</strong> Your Canvas token gives read access to your account. It is stored only in this browser and never leaves your device. Never share your screen while this page is visible or copy your token anywhere else.
                <button onClick={()=>{setWarned();setShowWarn(false)}} style={{display:'block',marginTop:6,background:'none',border:'none',color:'var(--amber)',cursor:'pointer',fontSize:11,fontWeight:600,padding:0}}>
                  I understand — dismiss
                </button>
              </div>
            </div>
          )}

          <div style={sectionHead}>Canvas URL</div>
          <input style={{...inputStyle,marginBottom:14}} value={canvasUrl} onChange={e=>setCanvasUrl(e.target.value)} placeholder="https://scf.instructure.com"/>

          <div style={sectionHead}>API token {hasToken && <span style={{color:'var(--green)',fontSize:10,marginLeft:6}}>✓ saved</span>}</div>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <div style={{ position:'relative', flex:1 }}>
              <input
                style={{...inputStyle, paddingRight:44}}
                type={showToken?'text':'password'}
                value={token}
                onChange={e=>setToken(e.target.value)}
                placeholder={hasToken ? '••••••••••••••••• (token saved — enter new to replace)' : 'Paste your Canvas API token here'}
                onKeyDown={e=>e.key==='Enter'&&handleSaveToken()}
              />
              <button onClick={()=>setShowToken(s=>!s)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:0}}>
                {showToken?<EyeOff size={14}/>:<Eye size={14}/>}
              </button>
            </div>
            <Tooltip text="Save token to this browser">
              <button className="btn btn-primary" onClick={handleSaveToken} disabled={!token}>
                {saved?<><Check size={13}/> Saved</>:'Save'}
              </button>
            </Tooltip>
            {hasToken && (
              <Tooltip text="Remove saved token from this browser">
                <button className="btn btn-ghost" onClick={handleClearToken} style={{color:'var(--coral)'}}>
                  <X size={13}/> Clear
                </button>
              </Tooltip>
            )}
          </div>

          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:14}}>
            Get your token: Canvas → Account → Settings → scroll to "Approved Integrations" → New Access Token
          </div>

          {/* Test connection */}
          <Tooltip text="Test that your token and Canvas URL work correctly">
            <button className="btn btn-ghost" onClick={testConnection} disabled={connStatus==='testing'} style={{gap:8,marginBottom:8}}>
              <RefreshCw size={13} style={{animation:connStatus==='testing'?'spin 1s linear infinite':'none'}}/> 
              {connStatus==='testing'?'Testing…':'Test connection'}
            </button>
          </Tooltip>

          {connStatus && connStatus !== 'testing' && (
            <div style={{ padding:'8px 12px', borderRadius:'var(--radius-md)', fontSize:12, fontWeight:500, marginBottom:8,
              background: connStatus==='ok' ? 'var(--green-dim)' : 'var(--coral-dim)',
              color: connStatus==='ok' ? 'var(--green)' : 'var(--coral)',
              border: `1px solid ${connStatus==='ok'?'var(--green)':'var(--coral)'}`,
            }}>
              {connStatus==='ok' ? '✓ ' : '⚠ '}{connMsg}
            </div>
          )}
        </div>

        {/* iCal */}
        <div className="card">
          <div className="card-title">Canvas iCal import</div>
          <div style={{fontSize:12,color:'var(--text-2)',marginBottom:12}}>
            Get your iCal URL: Canvas → Calendar → Calendar Feed (bottom right) → copy the link
          </div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input style={{...inputStyle,flex:1}} value={icalUrl} onChange={e=>setIcalUrl(e.target.value)} placeholder="webcal://scf.instructure.com/feeds/calendars/..."/>
            <Tooltip text="Save iCal URL">
              <button className="btn btn-ghost" onClick={()=>{saveCanvasIcal(icalUrl);setSaved(true);setTimeout(()=>setSaved(false),1500)}}>Save URL</button>
            </Tooltip>
            <Tooltip text="Fetch calendar and import new assignments">
              <button className="btn btn-primary" onClick={importIcal} disabled={!icalUrl||icalStatus==='loading'}>
                {icalStatus==='loading'?'Importing…':'Import now'}
              </button>
            </Tooltip>
          </div>
          {icalStatus && icalStatus!=='loading' && (
            <div style={{ padding:'8px 12px', borderRadius:'var(--radius-md)', fontSize:12, marginTop:4,
              background:icalStatus==='ok'?'var(--green-dim)':'var(--coral-dim)',
              color:icalStatus==='ok'?'var(--green)':'var(--coral)',
              border:`1px solid ${icalStatus==='ok'?'var(--green)':'var(--coral)'}`,
            }}>
              {icalStatus==='ok'?'✓ ':'⚠ '}{icalMsg}
            </div>
          )}
        </div>

        {/* Feature toggles */}
        <div className="card">
          <div className="card-title">Canvas features</div>
          <div style={{fontSize:12,color:'var(--text-2)',marginBottom:14}}>
            Enable or disable Canvas cards. API features require a valid token. Cards animate out when disabled.
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {FEATURE_KEYS.map(key=>{
              const f = FEATURE_LABELS[key]
              const needsToken = f.req==='token' && !hasToken
              const needsIcal  = f.req==='ical'  && !getCanvasIcal()
              const disabled   = needsToken || needsIcal
              return (
                <div key={key} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 14px',borderRadius:'var(--radius-md)',background:'var(--glass-bg-2)',border:'1px solid var(--glass-border)' }}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:8}}>
                      {f.label}
                      {disabled && <span style={{fontSize:10,color:'var(--text-3)',fontWeight:400}}>({f.req==='token'?'requires token':'requires iCal URL'})</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{f.desc}</div>
                  </div>
                  <Tooltip text={disabled?`Save a ${f.req==='token'?'Canvas token':'Canvas iCal URL'} first to enable this`:`Toggle ${f.label} cards on/off`}>
                    <ToggleSwitch on={features[key]&&!disabled} onChange={v=>saveFeature(key,v)} disabled={disabled}/>
                  </Tooltip>
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
              <button className="btn btn-ghost" onClick={()=>{
                const ALL_KEYS=['home_tasks','assignments','study_sessions','habit_grid','timer_settings','quick_links','streak','weather_city','course_notes','full_course_notes']
                const data = ALL_KEYS.reduce((a,k)=>({...a,[k]:load(k,null)}),{})
                const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement('a')
                a.href=url; a.download=`planner-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
                URL.revokeObjectURL(url)
              }}>📥 Export backup</button>
            </Tooltip>
            <Tooltip text="Restore all data from a previously exported JSON file">
              <button className="btn btn-ghost" onClick={()=>{
                const input=document.createElement('input'); input.type='file'; input.accept='.json'
                input.onchange=e=>{
                  const file=e.target.files[0]; if(!file) return
                  const reader=new FileReader()
                  reader.onload=ev=>{ try { const d=JSON.parse(ev.target.result); Object.entries(d).forEach(([k,v])=>{ if(v!==null) save(k,v) }); window.dispatchEvent(new Event('drive-loaded')) } catch(e){ alert('Invalid JSON') } }
                  reader.readAsText(file)
                }; input.click()
              }}>📤 Import backup</button>
            </Tooltip>
            <Tooltip text="Wipe all planner data from this browser — cannot be undone">
              <button className="btn btn-ghost" onClick={()=>{
                if(!confirm('Wipe ALL data and return to a clean template? This removes all tasks, assignments, habits, notes, settings, and credentials. Cannot be undone.')) return
                const prefixes = ['planner_v1_']
                const exactKeys = ['planner_profile_v1','planner_hint_v1','planner_token_v1','canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1']
                Object.keys(localStorage).filter(k=>prefixes.some(p=>k.startsWith(p))).forEach(k=>localStorage.removeItem(k))
                exactKeys.forEach(k=>localStorage.removeItem(k))
                sessionStorage.clear()
                window.location.reload()
              }} style={{color:'var(--coral)'}}>
                🗑 Wipe all data
              </button>
            </Tooltip>
          </div>
        </div>

      </div>
    </>
  )
}
