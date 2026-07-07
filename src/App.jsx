import { useState, useCallback, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Clock, Target, Link, Menu, X,
  HardDrive, LogOut, Trash2, BookText, GraduationCap, Settings,
  Layers, Calendar, FolderOpen
} from 'lucide-react'

import { useAuth }             from './hooks/useAuth.jsx'
import { useTheme }            from './hooks/useTheme.js'
import { useDriveSync }        from './hooks/useDriveSync.js'
import { useNotifications }    from './hooks/useNotifications.js'
import { load, save }          from './utils/storage.js'

import LoginPage          from './pages/LoginPage.jsx'
import WeeklyHome         from './pages/WeeklyHome.jsx'
import Courses            from './pages/Courses.jsx'
import StudySessions      from './pages/StudySessions.jsx'
import Goals              from './pages/Goals.jsx'
import Notes              from './pages/Notes.jsx'
import NotesPage          from './pages/NotesPage.jsx'
import CanvasPage         from './pages/CanvasPage.jsx'
import SettingsPage       from './pages/SettingsPage.jsx'
import FlashcardsPage     from './pages/FlashcardsPage.jsx'
import CalendarPage       from './pages/CalendarPage.jsx'
import ResourcesPage      from './pages/ResourcesPage.jsx'

import TopBar             from './components/TopBar.jsx'
import SidebarMiniTasks   from './components/SidebarMiniTasks.jsx'
import SidebarMiniAssignments from './components/SidebarMiniAssignments.jsx'
import NotificationBell   from './components/NotificationBell.jsx'

const NAV = [
  { label: 'Daily', items: [
    { to: '/',           icon: LayoutDashboard, text: 'Home'           },
    { to: '/courses',    icon: BookOpen,        text: 'Assignments'    },
    { to: '/study',      icon: Clock,           text: 'Study sessions' },
    { to: '/calendar',   icon: Calendar,        text: 'Calendar'       },
  ]},
  { label: 'Progress', items: [
    { to: '/goals',      icon: Target,          text: 'Habits'         },
    { to: '/flashcards', icon: Layers,          text: 'Flashcards'     },
  ]},
  { label: 'Resources', items: [
    { to: '/links',      icon: Link,            text: 'Quick links'    },
    { to: '/notes',      icon: BookText,        text: 'Course notes'   },
    { to: '/resources',  icon: FolderOpen,      text: 'Resources'      },
    { to: '/canvas',     icon: GraduationCap,   text: 'Canvas'         },
    { to: '/settings',   icon: Settings,        text: 'Settings'       },
  ]},
]

// Flat list for hidden-tab filtering
const ALL_NAV = NAV.flatMap(g => g.items)

// Complete list of ALL data keys — auto-synced to Drive and included in export/import
const ALL_KEYS = [
  'home_tasks', 'study_sessions', 'habit_grid', 'habit_history',
  'timer_settings', 'streak', 'study_week_goal', 'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes', 'full_course_notes_v2',
  'quick_links', 'page_links', 'weather_city', 'scheme', 'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks', 'calendar_plans',
  'notification_settings',
  'saved_resources', 'resource_sort',
  'hidden_tabs', 'courses_accordion_state',
]

function getAllData() {
  return ALL_KEYS.reduce((a, k) => { a[k] = load(k, null); return a }, {})
}

function wipeAllSettings() {
  if (!confirm('Wipe ALL data and return to a clean template? Cannot be undone.')) return
  const prefixes  = ['planner_v1_']
  const exactKeys = [
    'planner_profile_v1','planner_hint_v1','planner_token_v1',
    'canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1',
  ]
  Object.keys(localStorage).filter(k => prefixes.some(p => k.startsWith(p))).forEach(k => localStorage.removeItem(k))
  exactKeys.forEach(k => localStorage.removeItem(k))
  sessionStorage.clear()
  window.location.reload()
}

const chipBorder = { border: '1.5px solid rgba(0,0,0,0.55)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }

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

function AppShell() {
  const { token, profile, loading, error, signIn, signOut, isAuthed, sessionExpired, refreshNow } = useAuth()
  const { theme, scheme, toggleTheme, setScheme, SCHEMES, SCHEME_COLORS } = useTheme()
  const { syncToDrive, saveState }                                         = useDriveSync()
  const { notifs, unread, markAllRead, clearNotif }                        = useNotifications()
  const { wallpaper }                                                       = { wallpaper: null }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [errorOverlay, setErrorOverlay] = useState(false)
  const [hiddenTabs,  setHiddenTabs]  = useState(() => load('hidden_tabs', []))

  // ── Sync: listen for drive-loaded event and refresh hidden tabs only ──
  // Pages handle their own state refresh via their own drive-loaded listeners.
  // No driveKey remounting — that was the root cause of all sync/widget bugs.
  useEffect(() => {
    const h = () => {
      setHiddenTabs(load('hidden_tabs', []))
      localStorage.setItem('planner_v1_last_drive_load', String(Date.now()))
    }
    window.addEventListener('drive-loaded', h)
    const lastLoad = Number(localStorage.getItem('planner_v1_last_drive_load') || 0)
    if (lastLoad && (Date.now() - lastLoad) < 5000) {
      setHiddenTabs(load('hidden_tabs', []))
    }
    return () => window.removeEventListener('drive-loaded', h)
  }, [])

  const handleDataChange = useCallback(() => {
    syncToDrive(getAllData())
  }, [syncToDrive])

  const location = useLocation()
  const [prevPath, setPrevPath] = useState(location.pathname)
  useEffect(() => {
    if (location.pathname !== prevPath) {
      setSidebarOpen(false)
      setPrevPath(location.pathname)
    }
  }, [location.pathname])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16}}>
      <div style={{width:40,height:40,border:'3px solid var(--glass-border)',borderTop:'3px solid var(--accent)',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <div style={{color:'var(--text-3)',fontSize:13}}>Loading…</div>
    </div>
  )

  if (!isAuthed) return <LoginPage onSignIn={signIn} error={error}/>

  const visibleNav = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => !hiddenTabs.includes(item.to))
  })).filter(group => group.items.length > 0)

  return (
    <div className={`app-root ${theme === 'dark' ? 'dark' : 'light'} scheme-${scheme}`}
         style={wallpaper ? {backgroundImage:`url(${wallpaper})`,backgroundSize:'cover',backgroundPosition:'center'} : {}}>

      {/* Session expired overlay */}
      {sessionExpired && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div className="card" style={{maxWidth:380,width:'100%',textAlign:'center',padding:32}}>
            <div style={{fontSize:32,marginBottom:12}}>⏱</div>
            <div style={{fontWeight:700,fontSize:17,marginBottom:8}}>Session expired</div>
            <div style={{fontSize:13,color:'var(--text-3)',marginBottom:20,lineHeight:1.6}}>Your Google session has expired after a period of inactivity. Click below to sign back in without losing any data.</div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:14,padding:'11px 0'}} onClick={refreshNow}>
              🔄 Refresh session
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">P</div>
            <span className="sidebar-logo-text">Planner</span>
          </div>
          <button className="btn-icon sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={16}/></button>
        </div>

        <div className="sidebar-user">
          <Avatar profile={profile}/>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name?.split(' ')[0] || 'Student'}</div>
            <div className="sidebar-user-email">{profile?.email || ''}</div>
          </div>
        </div>

        <SidebarMiniTasks/>
        <SidebarMiniAssignments/>

        <nav className="sidebar-nav">
          {visibleNav.map(group => (
            <div key={group.label}>
              <div className="sidebar-nav-label">{group.label}</div>
              {group.items.map(({ to, icon: Icon, text }) => (
                <NavLink key={to} to={to} end={to==='/'} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={16}/>
                  <span>{text}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className="btn btn-ghost" style={{fontSize:11,padding:'5px 10px',flex:1}} onClick={signOut}>
              <LogOut size={12}/> Sign out
            </button>
            <button className="btn btn-ghost" style={{fontSize:11,padding:'5px 10px',color:'var(--coral)',flex:1}} onClick={wipeAllSettings}>
              <Trash2 size={12}/> Wipe data
            </button>
          </div>
          <div style={{fontSize:10,color:'var(--text-3)',marginTop:8,textAlign:'center',opacity:.5}}>SCF Academic Planner · Jose G.</div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <TopBar
          theme={theme} scheme={scheme} toggleTheme={toggleTheme}
          setScheme={setScheme} SCHEMES={SCHEMES} SCHEME_COLORS={SCHEME_COLORS}
          saveState={saveState}
          onLinksChange={handleDataChange}
          notifs={notifs} unread={unread} markAllRead={markAllRead} clearNotif={clearNotif}
          onMenuClick={() => setSidebarOpen(s => !s)}
        />

        <main className="page-content">
          <Routes>
            <Route path="/"           element={<WeeklyHome     onDataChange={handleDataChange}/>}/>
            <Route path="/courses"    element={<Courses        onDataChange={handleDataChange}/>}/>
            <Route path="/study"      element={<StudySessions  onDataChange={handleDataChange}/>}/>
            <Route path="/goals"      element={<Goals          onDataChange={handleDataChange}/>}/>
            <Route path="/links"      element={<Notes          onDataChange={handleDataChange}/>}/>
            <Route path="/notes"      element={<NotesPage      onDataChange={handleDataChange}/>}/>
            <Route path="/canvas"     element={<CanvasPage     />}/>
            <Route path="/settings"   element={<SettingsPage   onDataChange={handleDataChange} allNav={ALL_NAV} hiddenTabs={hiddenTabs} setHiddenTabs={setHiddenTabs}/>}/>
            <Route path="/flashcards" element={<FlashcardsPage onDataChange={handleDataChange}/>}/>
            <Route path="/calendar"   element={<CalendarPage   onDataChange={handleDataChange}/>}/>
            <Route path="/resources"  element={<ResourcesPage  onDataChange={handleDataChange}/>}/>
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell/>
    </HashRouter>
  )
}
