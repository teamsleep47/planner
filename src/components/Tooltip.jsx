import { useState, useRef, useCallback } from 'react'

export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible]   = useState(false)
  const [coords,  setCoords]    = useState({ top: 0, left: 0, placement: position })
  const wrapRef = useRef(null)
  const tipRef  = useRef(null)

  const show = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const TIP_W = 220
    const TIP_H = 44
    const GAP   = 8
    const vw    = window.innerWidth
    const vh    = window.innerHeight

    let left = rect.left + rect.width / 2 - TIP_W / 2
    let top, placement

    // Try preferred position, fall back if off screen
    if (position === 'top' && rect.top - TIP_H - GAP > 0) {
      top = rect.top - TIP_H - GAP
      placement = 'top'
    } else if (rect.bottom + TIP_H + GAP < vh) {
      top = rect.bottom + GAP
      placement = 'bottom'
    } else {
      top = rect.top - TIP_H - GAP
      placement = 'top'
    }

    // Clamp horizontal so it stays on screen
    left = Math.max(8, Math.min(left, vw - TIP_W - 8))

    setCoords({ top, left, placement })
    setVisible(true)
  }, [position])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <>
      <span ref={wrapRef} onMouseEnter={show} onMouseLeave={hide}
        style={{ display: 'contents' }}>
        {children}
      </span>
      {visible && (
        <div ref={tipRef} style={{
          position:     'fixed',
          top:          coords.top,
          left:         coords.left,
          width:        220,
          background:   'var(--tooltip-bg)',
          border:       '1px solid var(--tooltip-border)',
          borderRadius: 'var(--radius-md)',
          padding:      '7px 11px',
          fontSize:     12,
          fontWeight:   400,
          lineHeight:   1.5,
          color:        'var(--tooltip-text)',
          zIndex:       9999,
          pointerEvents:'none',
          boxShadow:    'var(--shadow)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation:    'fadeIn .12s ease',
        }}>
          {text}
        </div>
      )}
    </>
  )
}
