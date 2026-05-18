import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on backdrop click
  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onBackdrop} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 800,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .25s ease',
      }}/>

      {/* Sheet */}
      <div ref={sheetRef} style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 900,
        background: 'var(--panel-bg, #1a1a2e)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom, 16px)',
        maxHeight: '85vh',
        overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Handle bar */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--glass-border)' }}/>
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px 14px', borderBottom:'1px solid var(--glass-border)' }}>
          <span style={{ fontWeight:700, fontSize:16, color:'var(--text-1)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', display:'flex', padding:4 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding:'16px 20px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
