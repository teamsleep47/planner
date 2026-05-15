import { useState, useCallback } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Clock, Target, Link, Menu, X, HardDrive, LogOut } from 'lucide-react'

import { useAuth }       from './hooks/useAuth.js'
import { useTheme }      from './hooks/useTheme.js'
import { useDriveSync }  from './hooks/useDriveSync.js'
import { load, save }    from './utils/storage.js'

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
    { to: '/goals',   icon: Target,          text: 'Habits'         },
  ]},
  { label: 'Resources', items: [
    { to: '/links',   icon: Link,            text: 'Quick links'    },
  ]},
]

const ALL_KEYS = ['home_tasks','assignments','study_sessions','habit_grid','timer_settings','quick_links','streak','weather_city','theme','scheme']

function getAllData() {
  return ALL_KEYS.reduce((acc, k) => { acc[k] = load(k, null); return acc }, {})
}

function Avatar({ profile }) {
  const initials = name => { const p=(name||'?').trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase() }
  return (
    <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--accent-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'var(--accent-light)',overflow:'hidden',flexShrink:0 }}>
      {profile?.picture
        ? <img src={profile.picture} referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}} />
        : initials(profile?.name||'?')}
    </div>
  )
}

export default function App() {
  const { profile, loading, error, signIn, signOut, isAuthed, token } = useAuth()
  const { theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()
  const { syncToDrive, saveState } = useDriveSync(token)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleDataChange = useCallback(() => {
    syncToDrive(getAllData())
  }, [syncToDrive])

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'var(--bg-primary)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ color:'var(--text-muted)',fontSize:14 }}>Loading…</div>
    </div>
  )

  if (!isAuthed) return <LoginPage onSignIn={signIn} error={error} loading={loading} />

  return (
    <HashRouter>
      <div className="app-shell">
        <div className={`sidebar-overlay ${sidebarOpen?'open':''}`} onClick={()=>setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen?'open':''}`}>
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="var(--accent)"/>
              <rect x="6" y="6" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
              <rect x="18" y="6" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="6" y="18" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="18" y="18" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
            </svg>
            <span>Planner</span>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(group => (
              <div key={group.label}>
                <div className="nav-label">{group.label}</div>
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
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',marginBottom:4}}>
              <Avatar profile={profile}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||'User'}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.email||''}</div>
              </div>
            </div>
            <div className="drive-status">
              <div className={`drive-dot ${token?'connected':''}`}/>
              <HardDrive size={13}/>
              <span style={{flex:1}}>{saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Save failed':'Drive ready'}</span>
              <button onClick={signOut} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',display:'flex',padding:2}} title="Sign out">
                <LogOut size={13}/>
              </button>
            </div>
          </div>
        </aside>

        <div className="main-content">
          {/* Mobile header */}
          <header className="mobile-header">
            <button className="hamburger" onClick={()=>setSidebarOpen(o=>!o)}>
              {sidebarOpen?<X size={20}/>:<Menu size={20}/>}
            </button>
            <span style={{fontWeight:600,fontSize:15}}>Planner</span>
            <div style={{marginLeft:'auto'}}><Avatar profile={profile}/></div>
          </header>

          {/* Desktop top bar */}
          <TopBar
            theme={theme} scheme={scheme}
            toggleTheme={toggleTheme} setScheme={setScheme}
            SCHEMES={SCHEMES} SCHEME_COLORS={SCHEME_COLORS}
            saveState={saveState}
          />

          <Routes>
            <Route path="/"        element={<WeeklyHome    onDataChange={handleDataChange}/>}/>
            <Route path="/courses" element={<Courses       onDataChange={handleDataChange}/>}/>
            <Route path="/study"   element={<StudySessions onDataChange={handleDataChange}/>}/>
            <Route path="/goals"   element={<Goals         onDataChange={handleDataChange}/>}/>
            <Route path="/links"   element={<Notes/>}/>
          </Routes>
        </div>
      </div>
    </HashRouter>
  )
}
