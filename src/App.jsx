import { useState } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Clock, Target,
  BookMarked, Wallet, StickyNote, Menu, X,
  HardDrive
} from 'lucide-react'

import WeeklyHome    from './pages/WeeklyHome.jsx'
import Courses       from './pages/Courses.jsx'
import StudySessions from './pages/StudySessions.jsx'
import Goals         from './pages/Goals.jsx'
import Reading       from './pages/Reading.jsx'
import Notes         from './pages/Notes.jsx'
import Finance       from './pages/Finance.jsx'

const NAV = [
  { label: 'Core', items: [
    { to: '/',         icon: LayoutDashboard, text: 'Weekly home'    },
    { to: '/courses',  icon: BookOpen,        text: 'Courses'        },
    { to: '/study',    icon: Clock,           text: 'Study sessions' },
  ]},
  { label: 'Progress', items: [
    { to: '/goals',    icon: Target,          text: 'Goals & habits' },
    { to: '/reading',  icon: BookMarked,      text: 'Reading'        },
  ]},
  { label: 'Other', items: [
    { to: '/notes',    icon: StickyNote,      text: 'Notes'          },
    { to: '/finance',  icon: Wallet,          text: 'Finance'        },
  ]},
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const driveConnected = false // will wire up in useDriveSync hook later

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <HashRouter>
      <div className="app-shell">

        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="#6366f1"/>
              <rect x="6" y="6" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
              <rect x="18" y="6" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="6" y="18" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="18" y="18" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
            </svg>
            <span>Dashboard</span>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(group => (
              <div key={group.label}>
                <div className="nav-label">{group.label}</div>
                {group.items.map(({ to, icon: Icon, text }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={closeSidebar}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    {text}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="drive-status">
              <div className={`drive-dot ${driveConnected ? 'connected' : ''}`} />
              <HardDrive size={13} />
              <span>{driveConnected ? 'Drive synced' : 'Drive not connected'}</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main-content">
          {/* Mobile header */}
          <header className="mobile-header">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Dashboard</span>
          </header>

          <Routes>
            <Route path="/"         element={<WeeklyHome />}    />
            <Route path="/courses"  element={<Courses />}       />
            <Route path="/study"    element={<StudySessions />} />
            <Route path="/goals"    element={<Goals />}         />
            <Route path="/reading"  element={<Reading />}       />
            <Route path="/notes"    element={<Notes />}         />
            <Route path="/finance"  element={<Finance />}       />
          </Routes>
        </div>

      </div>
    </HashRouter>
  )
}
