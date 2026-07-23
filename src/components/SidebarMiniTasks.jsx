import { useState, useEffect, useRef } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { load, save } from '../utils/storage.js'

export default function SidebarMiniTasks() {
  const [tasks,    setTasks]    = useState(() => load('home_tasks', []))
  const [showAdd,  setShowAdd]  = useState(false)
  const [newText,  setNewText]  = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // { taskId, planId, title }
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = () => setTasks(load('home_tasks', []))
    window.addEventListener('drive-loaded', handler)
    return () => window.removeEventListener('drive-loaded', handler)
  }, [])

  useEffect(() => {
    if (showAdd && inputRef.current) inputRef.current.focus()
  }, [showAdd])

  const active = tasks.filter(t => !t.done)
  const done   = tasks.filter(t => t.done).length
  const total  = tasks.length

  const toggle = id => {
    const task = tasks.find(t => t.id === id)
    if (task && !task.done && task.calendarPlanId) {
      setConfirmModal({ taskId: id, planId: task.calendarPlanId, title: task.text.replace(/^📅 /,'') })
      return
    }
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(updated); save('home_tasks', updated)
  }

  const handleConfirm = (alsoCalendar) => {
    if (!confirmModal) return
    const { taskId, planId } = confirmModal
    const updated = tasks.map(t => t.id === taskId ? { ...t, done: true } : t)
    setTasks(updated); save('home_tasks', updated)
    if (alsoCalendar) {
      const plans = load('calendar_plans', [])
      save('calendar_plans', plans.filter(p => p.id !== planId))
    }
    setConfirmModal(null)
  }

  const addTask = () => {
    if (!newText.trim()) { setShowAdd(false); return }
    const updated = [{ id: Date.now(), text: newText.trim(), course: 'OTHER', done: false, urgency: 'none', due: '' }, ...tasks]
    setTasks(updated); save('home_tasks', updated)
    setNewText(''); setShowAdd(false)
  }

  const modal = confirmModal && (
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'var(--overlay)',backdropFilter:'blur(4px)'}}>
      <div className="card" style={{maxWidth:320,width:'100%',padding:20,textAlign:'center'}}>
        <div style={{fontSize:20,marginBottom:10}}>🔗</div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:8,color:'var(--text-1)'}}>Linked calendar plan</div>
        <div style={{fontSize:12,color:'var(--text-2)',marginBottom:16,lineHeight:1.5}}>
          Mark "{confirmModal.title}" as done and remove the linked calendar plan?
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          <button className="btn btn-primary" style={{justifyContent:'center',fontSize:12}} onClick={()=>handleConfirm(true)}>Yes, remove both</button>
          <button className="btn btn-ghost" style={{justifyContent:'center',fontSize:12}} onClick={()=>handleConfirm(false)}>Mark done, keep plan</button>
          <button className="btn btn-ghost" style={{justifyContent:'center',fontSize:12,color:'var(--text-3)'}} onClick={()=>setConfirmModal(null)}>Cancel</button>
        </div>
      </div>
    </div>
  )

  if (total === 0 && !showAdd) return (
    <>
      {modal}
      <div style={{ margin:'8px 8px 0', padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em' }}>Today</span>
          <button onClick={()=>setShowAdd(true)} style={{ background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', display:'flex', padding:2 }}><Plus size={12}/></button>
        </div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>No tasks yet</div>
      </div>
    </>
  )

  return (
    <>
    <div style={{ margin:'8px 8px 0', padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em' }}>Today</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, color: done===total&&total>0 ? 'var(--green)' : 'var(--text-3)', fontWeight:600 }}>{done}/{total}</span>
          <button onClick={()=>setShowAdd(s=>!s)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', display:'flex', padding:1 }}><Plus size={12}/></button>
        </div>
      </div>

      {/* Add input — slides in at top */}
      {showAdd && (
        <div style={{ display:'flex', gap:4, marginBottom:6, animation:'slideDown .15s ease' }}>
          <input
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') addTask(); if (e.key==='Escape') { setShowAdd(false); setNewText('') } }}
            placeholder="New task…"
            style={{ flex:1, padding:'5px 8px', background:'var(--glass-bg-2)', border:'1px solid var(--accent)', borderRadius:'var(--radius-sm)', color:'var(--text-1)', fontSize:11, fontFamily:'inherit' }}
          />
          <button onClick={addTask} style={{ background:'var(--accent)', border:'none', borderRadius:'var(--radius-sm)', color:'white', cursor:'pointer', display:'flex', padding:'4px 6px' }}><Check size={11}/></button>
          <button onClick={()=>{ setShowAdd(false); setNewText('') }} style={{ background:'none', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-sm)', color:'var(--text-3)', cursor:'pointer', display:'flex', padding:'4px 6px' }}><X size={11}/></button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height:3, background:'var(--glass-border)', borderRadius:2, marginBottom:7, overflow:'hidden' }}>
        <div style={{ height:'100%', background: done===total&&total>0 ? 'var(--green)' : 'var(--accent)', borderRadius:2, width:`${total>0?(done/total)*100:0}%`, transition:'width .3s' }}/>
      </div>

      {/* Tasks */}
      {active.slice(0,5).map(task => (
        <button key={task.id} onClick={() => toggle(task.id)} style={{
          display:'flex', alignItems:'center', gap:6, width:'100%',
          background:'none', border:'none', cursor:'pointer', padding:'3px 0', textAlign:'left',
        }}>
          <div style={{ width:10, height:10, borderRadius:3, border:'1.5px solid var(--text-3)', flexShrink:0, background:'transparent' }}/>
          <span style={{ fontSize:11, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{task.text}</span>
        </button>
      ))}

      {done > 0 && active.length === 0 && (
        <div style={{ fontSize:11, color:'var(--green)', textAlign:'center', padding:'3px 0' }}>✓ All done!</div>
      )}

      {tasks.length > 5 && (
        <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>+{tasks.length - 5} more on Home</div>
      )}
    </div>
    {modal}
  </>
  )
}
