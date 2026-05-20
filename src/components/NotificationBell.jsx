import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'

export default function NotificationBell({ notifs, unread, markAllRead, clearNotif }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) setTimeout(markAllRead, 1500)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn-icon" onClick={handleOpen} style={{ position: 'relative', padding: 7 }}>
        <Bell size={15}/>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: 'var(--coral)', color: 'white',
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 300,
          background: 'var(--panel-bg, #1a1a2e)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
          zIndex: 500,
          overflow: 'hidden',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'1px solid var(--glass-border)' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Notifications</span>
            {notifs.length > 0 && (
              <button onClick={markAllRead} style={{ background:'none', border:'none', fontSize:11, color:'var(--accent)', cursor:'pointer', fontWeight:600 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'24px 14px', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
                No notifications
              </div>
            ) : notifs.map(n => (
              <div key={n.id} style={{
                display:'flex', alignItems:'flex-start', gap:10,
                padding:'11px 14px',
                borderBottom:'1px solid var(--glass-border)',
                borderLeft:`3px solid ${n.color}`,
                background: n.urgent ? `${n.color}08` : 'transparent',
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color: n.urgent ? n.color : 'var(--text-1)', marginBottom:2 }}>{n.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-2)' }}>{n.body}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>
                    {new Date(n.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
                  </div>
                </div>
                <button onClick={() => clearNotif(n.id)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', display:'flex', padding:2, flexShrink:0 }}>
                  <X size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
