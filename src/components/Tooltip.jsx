import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)
  const [coords,  setCoords]  = useState({ top: 0, left: 0 })
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!wrapRef.current) return
      const rect  = wrapRef.current.getBoundingClientRect()
      const TIP_W = 220
      const TIP_H = 48
      const GAP   = 8
      const vw    = window.innerWidth
      const vh    = window.innerHeight

      // Horizontal: center on element, clamp to screen
      let left = rect.left + rect.width / 2 - TIP_W / 2
      left = Math.max(8, Math.min(left, vw - TIP_W - 8))

      // Vertical: prefer position prop, fallback
      let top
      if (position === 'bottom' || rect.top - TIP_H - GAP < 0) {
        top = Math.min(rect.bottom + GAP, vh - TIP_H - 8)
      } else if (position === 'left' || position === 'right') {
        top = rect.top + rect.height / 2 - TIP_H / 2
        left = position === 'left'
          ? Math.max(8, rect.left - TIP_W - GAP)
          : Math.min(rect.right + GAP, vw - TIP_W - 8)
      } else {
        top = rect.top - TIP_H - GAP
      }

      setCoords({ top, left })
      setVisible(true)
    }, 400)
  }, [position])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const tooltip = visible ? createPortal(
    <div style={{
      position:     'fixed',
      top:          coords.top,
      left:         coords.left,
      width:        220,
      background:   'var(--tooltip-bg, #0f0f1e)',
      border:       '1px solid var(--tooltip-border, rgba(255,255,255,0.15))',
      borderRadius: 8,
      padding:      '7px 12px',
      fontSize:     12,
      lineHeight:   1.5,
      color:        'var(--tooltip-text, #e0e0ff)',
      zIndex:       99999,
      pointerEvents:'none',
      boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
      animation:    'fadeIn .1s ease',
    }}>
      {text}
    </div>,
    document.body
  ) : null

  return (
    <>
      <span ref={wrapRef} onMouseEnter={show} onMouseLeave={hide}
        style={{ display: 'contents' }}>
        {children}
      </span>
      {tooltip}
    </>
  )
}
