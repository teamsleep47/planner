import { useState, useCallback, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Target, Link, Menu, X,
  Cloud, LogOut, Trash2, BookText, GraduationCap, Settings,
  Layers, Calendar, FolderOpen
} from 'lucide-react'

import { useAuth }          from './hooks/useAuth.jsx'
import { useTheme }         from './hooks/useTheme.js'
import { useFirestoreSync } from './hooks/useFirestoreSync.js'
import { useNotifications } from './hooks/useNotifications.js'
import { load, save }       from './utils/storage.js'
import { auth as fbAuth }   from './firebase.js'
import { signOut as fbSignOut } from 'firebase/auth'

import LoginPage      from './pages/LoginPage.jsx'
import WeeklyHome     from './pages/WeeklyHome.jsx'
import Courses        from './pages/Courses.jsx'
import Goals          from './pages/Goals.jsx'
import Notes          from './pages/Notes.jsx'
import NotesPage      from './pages/NotesPage.jsx'
import CanvasPage     from './pages/CanvasPage.jsx'
import SettingsPage   from './pages/SettingsPage.jsx'
import FlashcardsPage from './pages/FlashcardsPage.jsx'
import CalendarPage   from './pages/CalendarPage.jsx'
import ResourcesPage  from './pages/ResourcesPage.jsx'

import TopBar                 from './components/TopBar.jsx'
import SidebarMiniTasks       from './components/SidebarMiniTasks.jsx'
import SidebarMiniAssignments from './components/SidebarMiniAssignments.jsx'

// Master nav definition — each item has a stable `key` used for hide/show
const ALL_NAV = [
  { label: 'Daily', items: [
    { key:'home',       to:'/',           icon:LayoutDashboard, text:'Home'           },
    { key:'courses',    to:'/courses',    icon:BookOpen,        text:'Assignments'    },
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
  'habit_grid', 'habit_history',
  'streak',
  'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes', 'full_course_notes_v2',
  'quick_links', 'page_links',
  'weather_city',
  'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks', 'calendar_plans',
  'notification_settings',
  'saved_resources', 'resource_sort', 'resource_last_course',
  'hidden_tabs',
]

function getAllData() {
  return ALL_KEYS.reduce((a, k) => { a[k] = load(k, null); return a }, {})
}

function wipeAllSettings() {
  const prefixes  = ['planner_v1_']
  const exactKeys = ['canvas_token_v1','canvas_url_v1','canvas_ical_v1','canvas_warned_v1']
  Object.keys(localStorage).filter(k => prefixes.some(p => k.startsWith(p))).forEach(k => localStorage.removeItem(k))
  exactKeys.forEach(k => localStorage.removeItem(k))
  sessionStorage.clear()
  fbSignOut(fbAuth).catch(() => {}).finally(() => window.location.reload())
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

function ThemeTogglePill({ theme, toggleTheme }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 14,
        border: '1px solid var(--glass-border)',
        background: isDark ? '#29274a' : '#fff1da',
        cursor: 'pointer',
        padding: 0,
        transition: 'background .3s',
        flexShrink: 0,
      }}
    >
      <span style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', fontSize:11, opacity: isDark ? 0 : 1, transition:'opacity .2s' }}>☀️</span>
      <span style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', fontSize:11, opacity: isDark ? 1 : 0, transition:'opacity .2s' }}>🌙</span>
      <span style={{
        position: 'absolute',
        top: 3,
        left: isDark ? 'calc(100% - 25px)' : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: isDark ? '#9185f5' : '#e99a22',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left .25s cubic-bezier(.4,0,.2,1), background .3s',
      }}/>
    </button>
  )
}

function MobileHeader({ profile, signOut, sidebarOpen, setSidebarOpen, theme, toggleTheme, saveState }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropRef  = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const go = (path) => { navigate(path); setShowDropdown(false); }
  const ini = n => { const p=(n||'?').trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase() }

  return (
    <header className="mobile-header">
      <button
        onClick={() => setSidebarOpen(o => !o)}
        style={{
          background: sidebarOpen ? 'var(--accent-dim)' : 'none',
          border: 'none',
          color: sidebarOpen ? 'var(--accent)' : 'var(--text-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: 0,
          cursor: 'pointer', flexShrink: 0,
          transition: 'background .2s, color .2s',
        }}>
        {sidebarOpen ? <X size={22}/> : <Menu size={22}/>}
      </button>

      <span style={{fontWeight:700,fontSize:16,letterSpacing:'-0.4px',flex:1,color:'var(--text-1)'}}>Assignment Planner</span>

      <ThemeTogglePill theme={theme} toggleTheme={toggleTheme}/>

      {/* Avatar dropdown */}
      <div ref={dropRef} style={{position:'relative'}}>
        <button
          onClick={() => setShowDropdown(s => !s)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, display: 'flex',
            width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
          }}>
          <div className="avatar" style={{width:36,height:36}}>
            {profile?.picture
              ? <img src={profile.picture} referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>
              : ini(profile?.name||'?')}
          </div>
        </button>

        {showDropdown && (
          <div style={{
            position:'fixed', top:0, right:0, width:'min(280px, 90vw)',
            height:'100vh', zIndex:600,
            background:'var(--glass-bg)', backdropFilter:'var(--blur)',
            borderLeft:'1px solid var(--glass-border)',
            boxShadow:'-4px 0 32px rgba(0,0,0,0.35)',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{
              padding:'54px 20px 20px',
              borderBottom:'1px solid var(--glass-border)',
              background:'var(--glass-bg-2)',
            }}>
              <button onClick={()=>setShowDropdown(false)} style={{
                position:'absolute', top:14, right:14,
                background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)',
                borderRadius:0, width:36, height:36,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text-2)', cursor:'pointer',
              }}><X size={16}/></button>
              <div className="avatar" style={{width:52,height:52,fontSize:18,marginBottom:12}}>
                {profile?.picture
                  ? <img src={profile.picture} referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : ini(profile?.name||'?')}
              </div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--text-1)',marginBottom:3}}>{profile?.name||'User'}</div>
              <div style={{fontSize:12,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.email||''}</div>
            </div>

            <div style={{flex:1,overflow:'auto',padding:'10px 8px'}}>
              {[
                { icon: theme==='dark'?'🌙':'☀️', label: theme==='dark'?'Switch to light':'Switch to dark', action: toggleTheme },
                { icon:'⚙️', label:'Settings', action:()=>go('/settings') },
                { icon:'📅', label:'Calendar', action:()=>go('/calendar') },
                { icon:'📚', label:'Assignments', action:()=>go('/courses') },
              ].map((item,i)=>(
                <button key={i} onClick={item.action} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:14,
                  padding:'14px 16px', background:'none', border:'none',
                  borderRadius:0, color:'var(--text-1)',
                  fontSize:14, fontWeight:500, cursor:'pointer', textAlign:'left',
                  marginBottom:2, transition:'background .15s',
                }}
                  onTouchStart={e=>e.currentTarget.style.background='var(--glass-bg-2)'}
                  onTouchEnd={e=>e.currentTarget.style.background='none'}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--glass-bg-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{fontSize:20}}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div style={{padding:'12px 8px',borderTop:'1px solid var(--glass-border)'}}>
              <button onClick={signOut} style={{
                width:'100%', display:'flex', alignItems:'center', gap:14,
                padding:'14px 16px', background:'none', border:'none',
                borderRadius:0, color:'var(--text-2)',
                fontSize:14, cursor:'pointer', textAlign:'left', marginBottom:4,
              }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--glass-bg-2)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{fontSize:20}}>🚪</span> Sign out
              </button>
              <button onClick={()=>{setShowDropdown(false); setShowWipeConfirm(true)}} style={{
                width:'100%', display:'flex', alignItems:'center', gap:14,
                padding:'14px 16px', background:'none', border:'none',
                borderRadius:0, color:'var(--coral)',
                fontSize:14, cursor:'pointer', textAlign:'left',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{fontSize:20}}>🗑</span> Wipe all data
              </button>
            </div>
          </div>
        )}

        {showDropdown && (
          <div
            onClick={() => setShowDropdown(false)}
            style={{position:'fixed',inset:0,zIndex:599,background:'rgba(0,0,0,0.3)'}}
          />
        )}
      </div>
    </header>
  )
}

export default function App() {
  const { profile, loading, error, signIn, signOut, isAuthed } = useAuth()
  const { theme, toggleTheme }                                  = useTheme()
  const { syncToCloud, saveState }                              = useFirestoreSync(getAllData)
  const { notifs, unread, markAllRead, clearNotif }             = useNotifications()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [errorOverlay, setErrorOverlay] = useState(false)
  const [hiddenTabs,  setHiddenTabs]  = useState(() => load('hidden_tabs', ['canvas','resources','notes','links','flashcards','goals']))
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)

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
    syncToCloud(getAllData())
    window.dispatchEvent(new Event('data-saved'))
  }, [syncToCloud])

  useEffect(() => {
    if (saveState === 'error') {
      setErrorOverlay(true)
      const t = setTimeout(() => setErrorOverlay(false), 1800)
      return () => clearTimeout(t)
    }
  }, [saveState])

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
      <div className={`mobile-save-toast ${saveState==='saving'?'saving':saveState==='saved'?'saved':saveState==='error'?'error':''}`}>
        {saveState==='saving' && <><span style={{fontSize:14}}>⟳</span> Saving…</>}
        {saveState==='saved'  && <><span style={{fontSize:14}}>✓</span> Saved</>}
        {saveState==='error'  && <><span style={{fontSize:14}}>⚠</span> Save failed — check connection</>}
      </div>

      {errorOverlay && (
        <div className="save-error-overlay" style={{
          position:'fixed',inset:0,zIndex:9999,pointerEvents:'none',
        }}/>
      )}

      <div className="app-shell">
        <div className={`sidebar-overlay ${sidebarOpen?'open':''}`} onClick={()=>setSidebarOpen(false)}/>

        <aside className={`sidebar ${sidebarOpen?'open':''}`}>
          <div className="sidebar-logo">
            <span className="sidebar-logo-text">Assignment Planner</span>
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
              <Cloud size={12}/>
              <span style={{flex:1,fontSize:11}}>
                {saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Error':'Ready'}
              </span>
            </div>
            <div style={{display:'flex',gap:6,marginTop:8,padding:'0 2px'}}>
              <button onClick={signOut} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 8px',gap:5,...chipBorder}}>
                <LogOut size={12}/> Sign out
              </button>
              <button onClick={()=>setShowWipeConfirm(true)} className="btn btn-ghost"
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
            theme={theme}
            toggleTheme={toggleTheme}
            saveState={saveState}
            onLinksChange={handleDataChange}
            notifs={notifs} unread={unread} markAllRead={markAllRead} clearNotif={clearNotif}
          />
          <Routes>
            <Route path="/"           element={<WeeklyHome     onDataChange={handleDataChange}/>}/>
            <Route path="/courses"    element={<Courses        onDataChange={handleDataChange}/>}/>
            <Route path="/goals"      element={<Goals          onDataChange={handleDataChange}/>}/>
            <Route path="/links"      element={<Notes          onDataChange={handleDataChange}/>}/>
            <Route path="/notes"      element={<NotesPage      onDataChange={handleDataChange}/>}/>
            <Route path="/canvas"     element={<CanvasPage    />}/>
            <Route path="/settings"   element={<SettingsPage   onDataChange={handleDataChange} allNav={ALL_NAV} hiddenTabs={hiddenTabs} setHiddenTabs={setHiddenTabs}/>}/>
            <Route path="/flashcards" element={<FlashcardsPage onDataChange={handleDataChange}/>}/>
            <Route path="/calendar"   element={<CalendarPage   onDataChange={handleDataChange}/>}/>
            <Route path="/resources"  element={<ResourcesPage  onDataChange={handleDataChange}/>}/>
          </Routes>
        </div>
      </div>

      {showWipeConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--overlay)',backdropFilter:'blur(4px)'}} onClick={()=>setShowWipeConfirm(false)}>
          <div className="card" style={{maxWidth:340,width:'90%',padding:24,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
            <div style={{fontWeight:700,fontSize:15,color:'var(--text-1)',marginBottom:8}}>Wipe all data?</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginBottom:20,lineHeight:1.5}}>This will permanently delete all your tasks, assignments, calendar blocks, and settings. This cannot be undone.</div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn btn-ghost" onClick={()=>setShowWipeConfirm(false)} style={{flex:1}}>Cancel</button>
              <button className="btn" onClick={()=>{setShowWipeConfirm(false);wipeAllSettings()}} style={{flex:1,background:'var(--coral)',color:'white',border:'none'}}>Wipe all</button>
            </div>
          </div>
        </div>
      )}
    </HashRouter>
  )
}
