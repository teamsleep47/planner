import { useState, useCallback, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Clock, Target, Link, Menu, X, HardDrive, LogOut, Trash2, BookText, GraduationCap, Settings } from 'lucide-react'

import { useAuth }      from './hooks/useAuth.jsx'
import { useTheme }     from './hooks/useTheme.js'
import { useDriveSync } from './hooks/useDriveSync.js'
import { load, save }   from './utils/storage.js'

import LoginPage     from './pages/LoginPage.jsx'
import WeeklyHome    from './pages/WeeklyHome.jsx'
import Courses       from './pages/Courses.jsx'
import StudySessions from './pages/StudySessions.jsx'
import Goals         from './pages/Goals.jsx'
import Notes         from './pages/Notes.jsx'
import NotesPage     from './pages/NotesPage.jsx'
import CanvasPage    from './pages/CanvasPage.jsx'
import SettingsPage  from './pages/SettingsPage.jsx'
import TopBar        from './components/TopBar.jsx'

const NAV = [
  { label: 'Daily', items: [
    { to: '/',        icon: LayoutDashboard, text: 'Home'           },
    { to: '/courses', icon: BookOpen,        text: 'Assignments'    },
    { to: '/study',   icon: Clock,           text: 'Study sessions' },
  ]},
  { label: 'Progress', items: [
    { to: '/goals', icon: Target, text: 'Habits' },
  ]},
  { label: 'Resources', items: [
    { to: '/links',    icon: Link,          text: 'Quick links'   },
    { to: '/notes',    icon: BookText,      text: 'Course notes'  },
    { to: '/canvas',   icon: GraduationCap, text: 'Canvas'        },
    { to: '/settings', icon: Settings,      text: 'Settings'      },
  ]},
]

const ALL_KEYS = [
  'home_tasks','assignments','study_sessions','habit_grid','timer_settings',
  'quick_links','streak','weather_city','terms_v1','course_notes','full_course_notes',
  'page_links','habit_history','study_week_goal','sem_end_date','scheme','theme',
]
function getAllData() { return ALL_KEYS.reduce((a,k) => { a[k]=load(k,null); return a }, {}) }

function wipeAllSettings() {
  if (!confirm('Wipe ALL data and return to a clean template? This removes all tasks, assignments, habits, notes, settings, and credentials. Cannot be undone.')) return
  // Clear all planner data keys
  const prefixes = ['planner_v1_']
  const exactKeys = [
    'planner_profile_v1',
    'planner_hint_v1',
    'planner_token_v1',
    'canvas_token_v1',
    'canvas_url_v1',
    'canvas_ical_v1',
    'canvas_warned_v1',
  ]
  // Remove prefix-based keys
  Object.keys(localStorage)
    .filter(k => prefixes.some(p => k.startsWith(p)))
    .forEach(k => localStorage.removeItem(k))
  // Remove exact keys
  exactKeys.forEach(k => localStorage.removeItem(k))
  // Clear session storage
  sessionStorage.clear()
  // Reload to clean state — will show login page since token is gone
  window.location.reload()
}

function Avatar({ profile }) {
  const ini = n => { const p=(n||'?').trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase() }
  return (
    <div className="avatar">
      {profile?.picture
        ? <img src={profile.picture} referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>
        : ini(profile?.name||'?')}
    </div>
  )
}

const chipBorder = { border: '1.5px solid rgba(0,0,0,0.55)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }

function MobileHeader({ profile, signOut, wipeAllSettings, sidebarOpen, setSidebarOpen, theme, toggleTheme }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ini = n => { const p=(n||'?').trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase() }

  return (
    <header className="mobile-header">
      <button style={{background:'none',border:'none',color:'var(--text-1)',display:'flex',padding:4,cursor:'pointer'}} onClick={()=>setSidebarOpen(o=>!o)}>
        {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
      </button>
      <span style={{fontWeight:700,fontSize:15,letterSpacing:'-0.3px',flex:1}}>Planner</span>
      <div ref={dropRef} style={{position:'relative'}}>
        <button onClick={()=>setShowDropdown(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex'}}>
          <div className="avatar">
            {profile?.picture
              ? <img src={profile.picture} referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>
              : ini(profile?.name||'?')}
          </div>
        </button>
        {showDropdown && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right:0,
            width:200, background:'var(--panel-bg,#1a1a2e)',
            border:'1px solid var(--glass-border)', borderRadius:'var(--radius-lg)',
            boxShadow:'var(--shadow)', zIndex:500, overflow:'hidden',
          }}>
            {/* User info */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||'User'}</div>
              <div style={{fontSize:11,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.email||''}</div>
            </div>
            {/* Actions */}
            {[
              { icon:'🌙', label: theme==='dark'?'Switch to light':'Switch to dark', action:toggleTheme },
              { icon:'⚙️', label:'Settings', action:()=>{ navigate('/settings'); setShowDropdown(false) } },
              { icon:'🚪', label:'Sign out',  action:signOut },
              { icon:'🗑', label:'Wipe all data', action:()=>{ setShowDropdown(false); wipeAllSettings() }, danger:true },
            ].map((item,i)=>(
              <button key={i} onClick={item.action} style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'11px 14px', background:'none', border:'none',
                borderBottom: i<3 ? '1px solid var(--glass-border)' : 'none',
                color: item.danger ? 'var(--coral)' : 'var(--text-1)',
                fontSize:13, cursor:'pointer', textAlign:'left',
                transition:'background .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--glass-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const { token, profile, loading, error, signIn, signOut, isAuthed } = useAuth()
  const { theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()
  const { syncToDrive, saveState, synced } = useDriveSync()
  const [driveKey, setDriveKey] = useState(0)

  useEffect(() => {
    const handler = () => setDriveKey(k => k + 1)
    window.addEventListener('drive-loaded', handler)
    return () => window.removeEventListener('drive-loaded', handler)
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleDataChange = useCallback(() => {
    syncToDrive(getAllData())
  }, [syncToDrive])

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'var(--text-3)',fontSize:14}}>Loading…</div>
    </div>
  )

  if (!isAuthed) return <LoginPage onSignIn={signIn} error={error} loading={loading}/>

  return (
    <HashRouter>
      <div className="app-shell">
        <div className={`sidebar-overlay ${sidebarOpen?'open':''}`} onClick={()=>setSidebarOpen(false)}/>

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen?'open':''}`}>
          <div className="sidebar-logo">
            <svg width="30" height="30" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="9" fill="var(--accent)"/>
              <rect x="6" y="6" width="8" height="8" rx="2.5" fill="white" opacity="0.95"/>
              <rect x="18" y="6" width="8" height="8" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="6" y="18" width="8" height="8" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="18" y="18" width="8" height="8" rx="2.5" fill="white" opacity="0.95"/>
            </svg>
            <span className="sidebar-logo-text">Planner</span>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(group => (
              <div key={group.label}>
                <div className="nav-section-label">{group.label}</div>
                {group.items.map(({to,icon:Icon,text}) => (
                  <NavLink key={to} to={to} end={to==='/'} onClick={()=>setSidebarOpen(false)}
                    className={({isActive})=>`nav-item ${isActive?'active':''}`}>
                    <Icon size={16}/>{text}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-row">
              <Avatar profile={profile}/>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{profile?.name||'User'}</div>
                <div className="user-email">{profile?.email||''}</div>
              </div>
            </div>
            <div className="drive-pill">
              <div className={`drive-dot ${token?'connected':''}`}/>
              <HardDrive size={12}/>
              <span style={{flex:1,fontSize:11}}>
                {saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Error':'Drive ready'}
              </span>
            </div>
            {/* Sidebar action buttons */}
            <div style={{display:'flex',gap:6,marginTop:8,padding:'0 2px'}}>
              <button onClick={signOut} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 8px',gap:5,...chipBorder}}>
                <LogOut size={12}/> Sign out
              </button>
              <button onClick={wipeAllSettings} className="btn btn-ghost" style={{fontSize:11,padding:'6px 8px',gap:5,color:'var(--coral)',borderColor:'rgba(248,113,113,0.4)',...chipBorder}} title="Wipe all data">
                <Trash2 size={12}/>
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main-content">
          {/* Mobile header */}
          <MobileHeader profile={profile} signOut={signOut} wipeAllSettings={wipeAllSettings} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} toggleTheme={toggleTheme}/>

          {/* Desktop top bar */}
          <TopBar
            theme={theme} scheme={scheme}
            toggleTheme={toggleTheme} setScheme={setScheme}
            SCHEMES={SCHEMES} SCHEME_COLORS={SCHEME_COLORS}
            saveState={saveState}
            onLinksChange={handleDataChange}
          />

          <Routes>
            <Route path="/"         element={<WeeklyHome    key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/courses"  element={<Courses       key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/study"    element={<StudySessions key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/goals"    element={<Goals         key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/links"    element={<Notes         key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/notes"    element={<NotesPage     key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/canvas"   element={<CanvasPage    key={driveKey}/>}/>
            <Route path="/settings" element={<SettingsPage  key={driveKey} onDataChange={handleDataChange}/>}/>
          </Routes>


        </div>
      </div>
    </HashRouter>
  )
}
