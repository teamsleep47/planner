import { useState, useCallback, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Clock, Target, Link, Menu, X, HardDrive, LogOut, Trash2 } from 'lucide-react'

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
    { to: '/links', icon: Link, text: 'Quick links' },
  ]},
]

const ALL_KEYS = ['home_tasks','assignments','study_sessions','habit_grid','timer_settings','quick_links','streak','weather_city']
function getAllData() { return ALL_KEYS.reduce((a,k) => { a[k]=load(k,null); return a }, {}) }

function wipeAllSettings() {
  if (!confirm('Wipe ALL planner data? This cannot be undone.')) return
  const prefix = 'planner_v1_'
  Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .forEach(k => localStorage.removeItem(k))
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
          <header className="mobile-header">
            <button style={{background:'none',border:'none',color:'var(--text-1)',display:'flex',padding:4,cursor:'pointer'}} onClick={()=>setSidebarOpen(o=>!o)}>
              {sidebarOpen?<X size={20}/>:<Menu size={20}/>}
            </button>
            <span style={{fontWeight:700,fontSize:15,letterSpacing:'-0.3px',flex:1}}>Planner</span>
            {/* Mobile top-right actions */}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={wipeAllSettings} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:4}} title="Wipe data">
                <Trash2 size={16}/>
              </button>
              <button onClick={signOut} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',display:'flex',padding:4}} title="Sign out">
                <LogOut size={16}/>
              </button>
              <Avatar profile={profile}/>
            </div>
          </header>

          {/* Desktop top bar */}
          <TopBar
            theme={theme} scheme={scheme}
            toggleTheme={toggleTheme} setScheme={setScheme}
            SCHEMES={SCHEMES} SCHEME_COLORS={SCHEME_COLORS}
            saveState={saveState}
            onLinksChange={handleDataChange}
          />

          <Routes>
            <Route path="/"        element={<WeeklyHome    key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/courses" element={<Courses       key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/study"   element={<StudySessions key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/goals"   element={<Goals         key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/links"   element={<Notes         key={driveKey} onDataChange={handleDataChange}/>}/>
          </Routes>

          {/* Mobile bottom nav */}
          <nav className="bottom-nav">
            {NAV.flatMap(g=>g.items).map(({to,icon:Icon,text})=>(
              <NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`bottom-nav-item ${isActive?'active':''}`}>
                <Icon size={20}/>
                <span>{text}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </HashRouter>
  )
}
