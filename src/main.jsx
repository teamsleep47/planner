import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth.jsx'
import App from './App.jsx'
import './index.css'

// Apply saved theme/scheme before first render to avoid flash
const theme  = localStorage.getItem('planner_v1_theme')  || 'dark'
const scheme = localStorage.getItem('planner_v1_scheme') || 'indigo'
document.documentElement.setAttribute('data-theme',  theme)
document.documentElement.setAttribute('data-scheme', scheme)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
