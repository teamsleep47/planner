import { useState, useCallback, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Clock, Target, Link, Menu, X,
  HardDrive, LogOut, Trash2, BookText, GraduationCap, Settings,
  Layers, Calendar, FolderOpen
} from 'lucide-react'

import { useAuth }          from './hooks/useAuth.jsx'
import { useTheme }         from './hooks/useTheme.js'
import { useDriveSync }     from './hooks/useDriveSync.js'
import { useNotifications } from './hooks/useNotifications.js'
import { useBingWallpaper } from './hooks/useBingWallpaper.js'
import { load, save }       from './utils/storage.js'

import LoginPage      from './pages/LoginPage.jsx'
import WeeklyHome     from './pages/WeeklyHome.jsx'
import Courses        from './pages/Courses.jsx'
import StudySessions  from './pages/StudySessions.jsx'
import Goals          from './pages/Goals.jsx'
import Notes          from './pages/Notes.jsx'
import NotesPage      from './pages/NotesPage.jsx'
import CanvasPage     from './pages/CanvasPage.jsx'
import SettingsPage   from './pages/SettingsPage.jsx'
import FlashcardsPage from './pages/FlashcardsPage.jsx'
import CalendarPage   from './pages/CalendarPage.jsx'
import ResourcesPage  from './pages/ResourcesPage.jsx'

import TopBar                 from './components/TopBar.jsx'
import BingHeader             from './components/BingHeader.jsx'
import SidebarMiniTasks       from './components/SidebarMiniTasks.jsx'
import SidebarMiniAssignments from './components/SidebarMiniAssignments.jsx'

// Master nav definition — each item has a stable `key` used for hide/show
const ALL_NAV = [
  { label: 'Daily', items: [
    { key:'home',       to:'/',           icon:LayoutDashboard, text:'Home'           },
    { key:'courses',    to:'/courses',    icon:BookOpen,        text:'Assignments'    },
    { key:'study',      to:'/study',      icon:Clock,           text:'Study sessions' },
    { key:'calendar',   to:'/calendar',   icon:Calendar,        text:'Calendar'       },
  ]},
  { label: 'Progress', items: [
    { key:'goals',      to:'/goals',      icon:Target,          text:'Habits'         },
    { key:'flashcards', to:'/flashcards', icon:Layers,          text:'Flashcards'     },
  ]},
  { label: 'Resources', items: [
    { key:'links',      to:'/links',      icon:Link,            text:'Quick links'    },
    { key:'notes',      to:'/notes',      icon:BookText,        text:'Course notes'   },
    { key:'resources',  to:'/resources',  icon:FolderOpen,      text:'Resources'      },
    { key:'canvas',     to:'/canvas',     icon:GraduationCap,   text:'Canvas'         },
    { key:'settings',   to:'/settings',   icon:Settings,        text:'Settings'       },
  ]},
]

// ALL localStorage keys — synced to Drive & included in export
const ALL_KEYS = [
  'home_tasks',
  'study_sessions',
  'habit_grid', 'habit_history',
  'timer_settings',
  'streak',
  'study_week_goal',
  'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes', 'full_course_notes_v2',
  'quick_links', 'page_links',
  'weather_city',
  'scheme', 'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks', 'calendar_plans',
  'notification_settings',
  'saved_resources', 'resource_sort', 'resource_last_course',
  'bing_wallpaper_cache',
  'hidden_tabs',
]

function getAllData() {
  return ALL_KEYS.reduce((a, k) => { a[k] = load(k, null); return a }, {})
}

function wipeAllSettings() {
  if (!confirm('Wipe ALL data? Cannot be undone.')) return
  const prefixes  = ['planner_v1_']
  const exactKeys = ['planner_profile_v1','planner_hint_v1','planner_token_v1','canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1']
  Object.keys(localStorage).filter(k => prefixes.some(p => k.startsWith(p))).forEach(k => localStorage.removeItem(k))
  exactKeys.forEach(k => localStorage.removeItem(k))
  sessionStorage.clear()
  window.location.reload()
}

const chipBorder = { border:'1.5px solid rgba(0,0,0,0.55)', boxShadow:'0 1px 4px rgba(0,0,0,0.18)' }

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

function SidebarMiniWidgets({ hiddenTabs }) {
  const loc = useLocation()
  const isHome       = loc.pathname==='/'
  const isCourses    = loc.pathname==='/courses'
  const isFlashcards = loc.pathname==='/flashcards'
  const isCalendar   = loc.pathname==='/calendar'
  const isResources  = loc.pathname==='/resources'
  return (
    <>
      {!isHome && <SidebarMiniTasks/>}
      {!isHome && !isCourses && !isFlashcards && !isCalendar && !isResources && <SidebarMiniAssignments/>}
    </>
  )
}

function MobileHeader({ profile, signOut, sidebarOpen, setSidebarOpen, theme, toggleTheme }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropRef  = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
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
          <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:210,background:'var(--panel-bg,#1a1a2e)',border:'1px solid var(--glass-border)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow)',zIndex:500,overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||'User'}</div>
              <div style={{fontSize:11,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.email||''}</div>
            </div>
            {[
              { icon: theme==='dark'?'☀️':'🌙', label: theme==='dark'?'Switch to light':'Switch to dark', action: toggleTheme },
              { icon:'⚙️', label:'Settings', action:()=>{ navigate('/settings'); setShowDropdown(false) } },
              { icon:'🚪', label:'Sign out',  action: signOut },
              { icon:'🗑',  label:'Wipe data', action:()=>{ setShowDropdown(false); wipeAllSettings() }, danger:true },
            ].map((item,i)=>(
              <button key={i} onClick={item.action} style={{
                width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
                background:'none',border:'none',
                borderBottom:i<3?'1px solid var(--glass-border)':'none',
                color:item.danger?'var(--coral)':'var(--text-1)',
                fontSize:13,cursor:'pointer',textAlign:'left',transition:'background .15s',
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
  const { syncToDrive, saveState }                                         = useDriveSync()
  const { notifs, unread, markAllRead, clearNotif }                        = useNotifications()
  const { wallpaper }                                                       = useBingWallpaper(theme === 'bing')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [driveKey,    setDriveKey]    = useState(0)
  const [hiddenTabs,  setHiddenTabs]  = useState(() => load('hidden_tabs', []))

  useEffect(() => {
    const h = () => {
      setDriveKey(k => k + 1)
      setHiddenTabs(load('hidden_tabs', []))
    }
    window.addEventListener('drive-loaded', h)
    return () => window.removeEventListener('drive-loaded', h)
  }, [])

  const handleDataChange = useCallback(() => {
    syncToDrive(getAllData())
  }, [syncToDrive])

  // Filter NAV based on hidden tabs
  const visibleNav = ALL_NAV
    .map(group => ({
      ...group,
      items: group.items.filter(item => !hiddenTabs.includes(item.key))
    }))
    .filter(group => group.items.length > 0)

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

        <aside className={`sidebar ${sidebarOpen?'open':''}`}>
          <div className="sidebar-logo">
            <svg width="30" height="30" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="9" fill="var(--accent)"/>
              <rect x="6"  y="6"  width="8" height="8" rx="2.5" fill="white" opacity="0.95"/>
              <rect x="18" y="6"  width="8" height="8" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="6"  y="18" width="8" height="8" rx="2.5" fill="white" opacity="0.55"/>
              <rect x="18" y="18" width="8" height="8" rx="2.5" fill="white" opacity="0.95"/>
            </svg>
            <span className="sidebar-logo-text">Planner</span>
          </div>

          <nav className="sidebar-nav">
            {visibleNav.map(group => (
              <div key={group.label}>
                <div className="nav-section-label">{group.label}</div>
                {group.items.map(({ key, to, icon: Icon, text }) => (
                  <NavLink key={to} to={to} end={to==='/'} onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icon size={16}/>{text}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <SidebarMiniWidgets hiddenTabs={hiddenTabs}/>

          <div className="sidebar-footer">
            <div className="user-row">
              <Avatar profile={profile}/>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{profile?.name||'User'}</div>
                <div className="user-email">{profile?.email||''}</div>
              </div>
            </div>
            <div className={`drive-pill ${saveState==='saved'||saveState==='idle'?'':'error'}`}>
              <div className={`drive-dot ${saveState==='saved'||saveState==='idle'?'connected':''}`}/>
              <HardDrive size={12}/>
              <span style={{flex:1,fontSize:11}}>
                {saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Error':'Drive ready'}
              </span>
            </div>
            <div style={{display:'flex',gap:6,marginTop:8,padding:'0 2px'}}>
              <button onClick={signOut} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 8px',gap:5,...chipBorder}}>
                <LogOut size={12}/> Sign out
              </button>
              <button onClick={wipeAllSettings} className="btn btn-ghost"
                style={{fontSize:11,padding:'6px 8px',gap:5,color:'var(--coral)',borderColor:'rgba(248,113,113,0.4)',...chipBorder}}
                title="Wipe all data">
                <Trash2 size={12}/>
              </button>
            </div>
          </div>
        </aside>

        <div className="main-content">
          <MobileHeader
            profile={profile} signOut={signOut}
            sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
            theme={theme} toggleTheme={toggleTheme}
          />
          <TopBar
            theme={theme} scheme={scheme}
            toggleTheme={toggleTheme} setScheme={setScheme}
            SCHEMES={SCHEMES} SCHEME_COLORS={SCHEME_COLORS}
            saveState={saveState}
            onLinksChange={handleDataChange}
            notifs={notifs} unread={unread} markAllRead={markAllRead} clearNotif={clearNotif}
          />
          <BingHeader enabled={theme==='bing'} wallpaper={wallpaper}/>
          <Routes>
            <Route path="/"           element={<WeeklyHome     key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/courses"    element={<Courses        key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/study"      element={<StudySessions  key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/goals"      element={<Goals          key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/links"      element={<Notes          key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/notes"      element={<NotesPage      key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/canvas"     element={<CanvasPage     key={driveKey}/>}/>
            <Route path="/settings"   element={<SettingsPage   key={driveKey} onDataChange={handleDataChange} allNav={ALL_NAV} hiddenTabs={hiddenTabs} setHiddenTabs={setHiddenTabs}/>}/>
            <Route path="/flashcards" element={<FlashcardsPage key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/calendar"   element={<CalendarPage   key={driveKey} onDataChange={handleDataChange}/>}/>
            <Route path="/resources"  element={<ResourcesPage  key={driveKey} onDataChange={handleDataChange}/>}/>
          </Routes>
        </div>
      </div>
    </HashRouter>
  )
}
