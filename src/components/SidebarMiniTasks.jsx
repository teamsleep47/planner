import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { load, save } from '../utils/storage.js'

export default function SidebarMiniTasks() {
  const [tasks, setTasks] = useState(() => load('home_tasks', []))

  // Refresh when tasks change elsewhere
  useEffect(() => {
    const handler = () => setTasks(load('home_tasks', []))
    window.addEventListener('drive-loaded', handler)
    return () => window.removeEventListener('drive-loaded', handler)
  }, [])

  const active = tasks.filter(t => !t.done).slice(0, 5)
  const done   = tasks.filter(t => t.done).length
  const total  = tasks.length

  const toggle = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(updated)
    save('home_tasks', updated)
  }

  if (total === 0) return null

  return (
    <div style={{
      margin: '8px 8px 0',
      padding: '10px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Today
        </span>
        <span style={{ fontSize:10, color: done===total ? 'var(--green)' : 'var(--text-3)', fontWeight:600 }}>
          {done}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:'var(--glass-border)', borderRadius:2, marginBottom:8, overflow:'hidden' }}>
        <div style={{ height:'100%', background: done===total ? 'var(--green)' : 'var(--accent)', borderRadius:2, width:`${total>0?(done/total)*100:0}%`, transition:'width .3s' }}/>
      </div>

      {/* Task list */}
      {active.map(task => (
        <button key={task.id} onClick={() => toggle(task.id)} style={{
          display:'flex', alignItems:'center', gap:6, width:'100%',
          background:'none', border:'none', cursor:'pointer',
          padding:'4px 0', textAlign:'left',
        }}>
          <Circle size={11} style={{ color:'var(--text-3)', flexShrink:0 }}/>
          <span style={{ fontSize:11, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {task.text}
          </span>
        </button>
      ))}

      {active.length === 0 && done > 0 && (
        <div style={{ fontSize:11, color:'var(--green)', textAlign:'center', padding:'4px 0' }}>
          ✓ All done!
        </div>
      )}

      {tasks.length > 5 && (
        <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4, textAlign:'center' }}>
          +{tasks.length - 5} more
        </div>
      )}
    </div>
  )
}
