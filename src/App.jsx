import { useState } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Clock, Target,
  BookMarked, Wallet, StickyNote, Menu, X, HardDrive, LogOut
} from 'lucide-react'

import { useAuth } from './hooks/useAuth.js'
import LoginPage     from './pages/LoginPage.jsx'
import WeeklyHome    from './pages/WeeklyHome.jsx'
import Courses       from './pages/Courses.jsx'
import StudySessions from './pages/StudySessions.jsx'
import Goals         from './pages/Goals.jsx'
import Reading       from './pages/Reading.jsx'
import Notes         from './pages/Notes.jsx'
import Finance       from './pages/Finance.jsx'

const NAV = [
  { label: 'Core', items: [
    { to: '/',        icon: LayoutDashboard, text: 'Weekly home'    },
    { to: '/courses', icon: BookOpen,        text: 'Courses'        },
    { to: '/study',   icon: Clock,           text: 'Study sessions' },
  ]},
  { label: 'Progress', items: [
    { to: '/goals',   icon: Target,          text: 'Goals & habits' },
    { to: '/reading', icon: BookMarked,      text: 'Reading'        },
  ]},
  { label: 'Other', items: [
    { to: '/notes',   icon: StickyNote,      text: 'Notes'          },
    { to: '/finance', icon: Wallet,          text: 'Finance'        },
  ]},
]

function Avatar({ profile }) {
  const initials = (name) => {
    const parts = (name || '?').trim().split(/\s+/)
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
  }
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'var(--accent-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, color: 'var(--accent-light)',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {profile?.picture
        ? <img src={profile.picture} referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
        : initials(profile?.name || '?')
      }
    </div>
  )
}

export default function App() {
  const { token, profile, loading, error, signIn, signOut, isAuthed } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Still checking hash / attempting silent restore
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  // Not signed in — show login page
  if (!isAuthed) {
    return <LoginPage onSignIn={signIn} error={error} loading={loading} />
  }

  // Signed in — show dashboard
  return (
    <HashRouter>
      <div className="app-shell">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="#6366f1"/>
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
                {group.items.map(({ to, icon: Icon, text }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icon size={16} />{text}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            {/* User profile row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 4 }}>
              <Avatar profile={profile} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.email || ''}
                </div>
              </div>
            </div>
            {/* Drive + sign out */}
            <div className="drive-status">
              <div className="drive-dot connected" />
              <HardDrive size={13} />
              <span style={{ flex: 1 }}>Drive connected</span>
              <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }} title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        <div className="main-content">
          <header className="mobile-header">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Planner</span>
            <div style={{ marginLeft: 'auto' }}><Avatar profile={profile} /></div>
          </header>

          <Routes>
            <Route path="/"        element={<WeeklyHome />}    />
            <Route path="/courses" element={<Courses />}       />
            <Route path="/study"   element={<StudySessions />} />
            <Route path="/goals"   element={<Goals />}         />
            <Route path="/reading" element={<Reading />}       />
            <Route path="/notes"   element={<Notes />}         />
            <Route path="/finance" element={<Finance />}       />
          </Routes>
        </div>
      </div>
    </HashRouter>
  )
}
