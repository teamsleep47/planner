import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import Tooltip from '../components/Tooltip.jsx'

const HOURS   = Array.from({length:17}, (_,i) => i+6)  // 6am - 10pm
const DAYS_S  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_F  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getCourseColors() {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const map   = {}
    terms.forEach(t => t.courses.forEach(c => { map[c.name] = c.color }))
    return map
  } catch(e) { return {} }
}

function getAssignmentDots() {
  // Returns map of dateStr -> [{title, course, color}]
  try {
    const terms  = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const active = terms.find(t=>t.active)||terms[0]
    if (!active) return {}
    const map = {}
    active.courses.forEach(c => {
      c.assignments.filter(a=>a.due&&a.status!=='Done').forEach(a => {
        if (!map[a.due]) map[a.due] = []
        map[a.due].push({ title:a.title, course:c.name, color:c.color })
      })
    })
    return map
  } catch(e) { return {} }
}

function uid() { return Math.random().toString(36).slice(2,9) }

const BLOCK_COLORS = ['#6366f1','#14b8a6','#f59e0b','#f43f5e','#22c55e','#8b5cf6','#06b6d4']

const BLANK_BLOCK = { title:'', color: BLOCK_COLORS[0], allDay: false }

export default function CalendarPage({ onDataChange }) {
  const [view,    setView]    = useState('week')   // day | week | month
  const [anchor,  setAnchor]  = useState(new Date())
  const [blocks,  setBlocks]  = useState(() => load('calendar_blocks', []))
  const [dragging,setDragging]= useState(null)   // { startHour, date }
  const [newBlock,setNewBlock]= useState(null)   // { date, startHour, endHour }
  const [editBlock,setEditBlock]=useState(null)
  const [editForm, setEditForm]=useState(BLANK_BLOCK)
  const [showAdd,  setShowAdd] = useState(false)
  const [addForm,  setAddForm] = useState({ ...BLANK_BLOCK, date: new Date().toISOString().slice(0,10), startHour:9, endHour:10 })
  const gridRef = useRef(null)
  const dotMap  = getAssignmentDots()
  const cColors = getCourseColors()

  useEffect(() => { save('calendar_blocks', blocks); onDataChange?.() }, [blocks])

  // ── Navigation ────────────────────────────────────
  const prev = () => {
    const d = new Date(anchor)
    if (view==='day')   d.setDate(d.getDate()-1)
    if (view==='week')  d.setDate(d.getDate()-7)
    if (view==='month') d.setMonth(d.getMonth()-1)
    setAnchor(d)
  }
  const next = () => {
    const d = new Date(anchor)
    if (view==='day')   d.setDate(d.getDate()+1)
    if (view==='week')  d.setDate(d.getDate()+7)
    if (view==='month') d.setMonth(d.getMonth()+1)
    setAnchor(d)
  }
  const goToday = () => setAnchor(new Date())

  // ── Week helpers ──────────────────────────────────
  const getWeekDays = (d) => {
    const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
    return Array.from({length:7}, (_,i) => { const x=new Date(sun); x.setDate(sun.getDate()+i); return x })
  }
  const weekDays = getWeekDays(anchor)

  // ── Drag to create ────────────────────────────────
  const onMouseDownCell = (date, hour) => {
    setDragging({ date: date.toISOString().slice(0,10), startHour: hour, endHour: hour+1 })
  }
  const onMouseEnterCell = (date, hour) => {
    if (!dragging) return
    setDragging(d => ({ ...d, endHour: Math.max(d.startHour+1, hour+1) }))
  }
  const onMouseUpCell = () => {
    if (!dragging) return
    setNewBlock({ ...dragging })
    setAddForm(f => ({ ...f, date: dragging.date, startHour: dragging.startHour, endHour: dragging.endHour }))
    setShowAdd(true)
    setDragging(null)
  }

  const saveBlock = () => {
    if (!addForm.title.trim()) return
    setBlocks(bs => [...bs, { ...addForm, id: uid() }])
    setShowAdd(false); setNewBlock(null)
    setAddForm({ ...BLANK_BLOCK, date: new Date().toISOString().slice(0,10), startHour:9, endHour:10 })
  }

  const deleteBlock = id => setBlocks(bs => bs.filter(b => b.id !== id))
  const updateBlock = (id, patch) => setBlocks(bs => bs.map(b => b.id===id ? {...b,...patch} : b))

  const dayBlocks = (dateStr) => blocks.filter(b => b.date === dateStr)

  const hourH = 52 // px per hour

  // ── Header title ──────────────────────────────────
  const headerTitle = () => {
    if (view==='day')   return anchor.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
    if (view==='week')  return `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`
    if (view==='month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    return ''
  }

  const today = new Date().toISOString().slice(0,10)
  const nowH  = new Date().getHours() + new Date().getMinutes()/60

  const inputStyle = { padding:'7px 10px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:12, fontFamily:'inherit', width:'100%' }

  // ── Time grid (shared by day + week) ──────────────
  const TimeGrid = ({ days }) => (
    <div style={{ display:'flex', overflow:'auto', flex:1 }} ref={gridRef} onMouseUp={onMouseUpCell} onMouseLeave={onMouseUpCell}>
      {/* Time labels */}
      <div style={{ width:48, flexShrink:0, paddingTop:24 }}>
        {HOURS.map(h => (
          <div key={h} style={{ height:hourH, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:8, paddingTop:4 }}>
            <span style={{ fontSize:10, color:'var(--text-3)', fontWeight:600 }}>{h===12?'noon':h>12?`${h-12}pm`:`${h}am`}</span>
          </div>
        ))}
      </div>
      {/* Day columns */}
      {days.map(day => {
        const ds      = day.toISOString().slice(0,10)
        const isToday = ds === today
        const db      = dayBlocks(ds)
        return (
          <div key={ds} style={{ flex:1, minWidth: days.length===1?'100%':100, borderLeft:'1px solid var(--glass-border)', position:'relative' }}>
            {/* Day header */}
            <div style={{ height:24, display:'flex', alignItems:'center', justifyContent:'center', gap:4, borderBottom:'1px solid var(--glass-border)', background: isToday?'var(--accent-dim)':'transparent' }}>
              <span style={{ fontSize:11, fontWeight:700, color: isToday?'var(--accent)':'var(--text-3)' }}>
                {days.length>1 ? DAYS_S[day.getDay()] : ''} {day.getDate()}
              </span>
              {dotMap[ds]?.length > 0 && <div style={{ width:5,height:5,borderRadius:'50%',background:'var(--coral)' }}/>}
            </div>
            {/* Hour cells */}
            {HOURS.map(h => (
              <div key={h} onMouseDown={()=>onMouseDownCell(day,h)} onMouseEnter={()=>onMouseEnterCell(day,h)}
                style={{ height:hourH, borderBottom:'1px solid var(--glass-border)', cursor:'crosshair', userSelect:'none',
                  background: dragging&&dragging.date===ds&&h>=dragging.startHour&&h<dragging.endHour ? 'var(--accent-dim)' : 'transparent',
                  transition:'background .1s' }}/>
            ))}
            {/* Now line */}
            {isToday && (
              <div style={{ position:'absolute', left:0, right:0, top: 24 + (nowH-6)*hourH, height:2, background:'var(--coral)', zIndex:5, pointerEvents:'none' }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--coral)',position:'absolute',left:-4,top:-3 }}/>
              </div>
            )}
            {/* Blocks */}
            {db.map(b => {
              const top = 24 + (b.startHour-6)*hourH
              const h   = (b.endHour-b.startHour)*hourH
              return (
                <div key={b.id} onClick={()=>{setEditBlock(b);setEditForm({title:b.title,color:b.color})}}
                  style={{ position:'absolute', left:2, right:2, top, height:Math.max(h-2,20), borderRadius:6,
                    background:`${b.color}33`, border:`1.5px solid ${b.color}`,
                    padding:'3px 6px', cursor:'pointer', zIndex:4, overflow:'hidden',
                    boxShadow:`0 0 8px ${b.color}44`,
                  }}>
                  <div style={{ fontSize:11, fontWeight:700, color:b.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>{b.startHour>12?b.startHour-12:b.startHour}{b.startHour>=12?'pm':'am'}–{b.endHour>12?b.endHour-12:b.endHour}{b.endHour>=12?'pm':'am'}</div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  // ── Month grid ────────────────────────────────────
  const MonthGrid = () => {
    const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const lastDay  = new Date(anchor.getFullYear(), anchor.getMonth()+1, 0)
    const startPad = firstDay.getDay()
    const cells    = []
    for (let i=0; i<startPad; i++) cells.push(null)
    for (let d=1; d<=lastDay.getDate(); d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d))
    while (cells.length%7!==0) cells.push(null)

    return (
      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--glass-border)' }}>
          {DAYS_S.map(d=><div key={d} style={{padding:'6px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-3)'}}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((day,i) => {
            if (!day) return <div key={i} style={{ minHeight:80, borderRight:'1px solid var(--glass-border)', borderBottom:'1px solid var(--glass-border)', background:'var(--glass-bg)' }}/>
            const ds      = day.toISOString().slice(0,10)
            const isToday = ds === today
            const dots    = dotMap[ds] || []
            const db      = dayBlocks(ds)
            return (
              <div key={ds} onClick={()=>{setAnchor(day);setView('day')}}
                style={{ minHeight:80, borderRight:'1px solid var(--glass-border)', borderBottom:'1px solid var(--glass-border)',
                  padding:'4px 6px', cursor:'pointer', transition:'background .15s',
                  background: isToday?'var(--accent-dim)':'transparent' }}
                onMouseEnter={e=>e.currentTarget.style.background=isToday?'var(--accent-dim)':'var(--glass-bg)'}
                onMouseLeave={e=>e.currentTarget.style.background=isToday?'var(--accent-dim)':'transparent'}
              >
                <div style={{ fontSize:12, fontWeight:700, color:isToday?'var(--accent)':'var(--text-2)', marginBottom:4 }}>{day.getDate()}</div>
                {dots.slice(0,2).map((dot,di)=>(
                  <div key={di} style={{ fontSize:10, padding:'1px 4px', borderRadius:3, background:`${dot.color}33`, color:dot.color, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dot.title}</div>
                ))}
                {dots.length>2&&<div style={{fontSize:9,color:'var(--text-3)'}}>+{dots.length-2} more</div>}
                {db.slice(0,2).map(b=>(
                  <div key={b.id} style={{ fontSize:10, padding:'1px 4px', borderRadius:3, background:`${b.color}33`, color:b.color, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title}</div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Calendar</div>
          <div className="page-subtitle">{headerTitle()}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Tooltip text="Go to today">
            <button className="btn btn-ghost" onClick={goToday} style={{ fontSize:12 }}>Today</button>
          </Tooltip>
          <button className="btn-icon" onClick={prev} style={{ padding:7 }}><ChevronLeft size={14}/></button>
          <button className="btn-icon" onClick={next} style={{ padding:7 }}><ChevronRight size={14}/></button>
          <div style={{ display:'flex', gap:4, background:'var(--glass-bg-2)', padding:3, borderRadius:'var(--radius-md)', border:'1px solid var(--glass-border)' }}>
            {['day','week','month'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background:view===v?'var(--accent)':'transparent', color:view===v?'white':'var(--text-2)', transition:'all .15s' }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <Tooltip text="Add a study block manually">
            <button className="btn btn-primary" onClick={()=>{setShowAdd(true);setAddForm({...BLANK_BLOCK,date:today,startHour:9,endHour:10})}} style={{ fontSize:12, gap:6 }}>
              <Plus size={13}/> Add block
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Add block form */}
      {showAdd && (
        <div style={{ margin:'0 32px', padding:'14px 16px', background:'var(--glass-bg-2)', border:'1px solid var(--accent)', borderRadius:'var(--radius-lg)', display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:'2 1 200px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>Title</div>
            <input style={inputStyle} placeholder="Study block title" value={addForm.title} onChange={e=>setAddForm(f=>({...f,title:e.target.value}))} autoFocus onKeyDown={e=>e.key==='Enter'&&saveBlock()}/>
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>Date</div>
            <input type="date" style={inputStyle} value={addForm.date} onChange={e=>setAddForm(f=>({...f,date:e.target.value}))}/>
          </div>
          <div style={{ flex:'1 1 80px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>Start</div>
            <select style={inputStyle} value={addForm.startHour} onChange={e=>setAddForm(f=>({...f,startHour:Number(e.target.value)}))}>
              {HOURS.map(h=><option key={h} value={h}>{h>12?`${h-12}:00 PM`:h===12?'12:00 PM':`${h}:00 AM`}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 80px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>End</div>
            <select style={inputStyle} value={addForm.endHour} onChange={e=>setAddForm(f=>({...f,endHour:Number(e.target.value)}))}>
              {HOURS.filter(h=>h>addForm.startHour).map(h=><option key={h} value={h}>{h>12?`${h-12}:00 PM`:h===12?'12:00 PM':`${h}:00 AM`}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 140px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>Color</div>
            <div style={{ display:'flex', gap:6 }}>
              {BLOCK_COLORS.map(c=><button key={c} onClick={()=>setAddForm(f=>({...f,color:c}))} style={{ width:22,height:22,borderRadius:'50%',background:c,border:`3px solid ${addForm.color===c?'white':'transparent'}`,cursor:'pointer' }}/>)}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-primary" onClick={saveBlock} style={{ fontSize:12 }}>Save</button>
            <button className="btn btn-ghost" onClick={()=>{setShowAdd(false);setNewBlock(null)}} style={{ fontSize:12 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit block popover */}
      {editBlock && (
        <div style={{ margin:'0 32px', padding:'14px 16px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-lg)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <input style={{...inputStyle,flex:1,minWidth:150}} value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} autoFocus onKeyDown={e=>e.key==='Enter'&&(updateBlock(editBlock.id,editForm),setEditBlock(null))}/>
          <div style={{ display:'flex', gap:6 }}>
            {BLOCK_COLORS.map(c=><button key={c} onClick={()=>setEditForm(f=>({...f,color:c}))} style={{ width:20,height:20,borderRadius:'50%',background:c,border:`3px solid ${editForm.color===c?'white':'transparent'}`,cursor:'pointer' }}/>)}
          </div>
          <button className="btn btn-primary" onClick={()=>{updateBlock(editBlock.id,editForm);setEditBlock(null)}} style={{fontSize:12}}>Save</button>
          <button className="btn btn-ghost" onClick={()=>setEditBlock(null)} style={{fontSize:12}}>Cancel</button>
          <button className="btn btn-ghost" onClick={()=>{deleteBlock(editBlock.id);setEditBlock(null)}} style={{fontSize:12,color:'var(--coral)'}}>Delete</button>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', margin:'16px 32px 0', background:'var(--glass-bg)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {view==='month' && <MonthGrid/>}
        {view==='week'  && <TimeGrid days={weekDays}/>}
        {view==='day'   && <TimeGrid days={[anchor]}/>}
      </div>
    </>
  )
}
