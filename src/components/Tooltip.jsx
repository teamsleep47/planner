import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)
  const [pos,     setPos]     = useState({ x: 0, y: 0 })
  const [smooth,  setSmooth]  = useState({ x: 0, y: 0 })
  const wrapRef   = useRef(null)
  const showTimer = useRef(null)
  const rafRef    = useRef(null)
  const target    = useRef({ x: 0, y: 0 })

  // Smoothly lerp tooltip position toward mouse
  const animate = useCallback(() => {
    setSmooth(prev => {
      const nx = prev.x + (target.current.x - prev.x) * 0.18
      const ny = prev.y + (target.current.y - prev.y) * 0.18
      return { x: nx, y: ny }
    })
    rafRef.current = requestAnimationFrame(animate)
  }, [])

  const onMouseMove = useCallback((e) => {
    const TIP_W = 230
    const TIP_H = 50
    const GAP   = 14
    const vw    = window.innerWidth
    const vh    = window.innerHeight

    let x = e.clientX + GAP
    let y = e.clientY - TIP_H / 2

    // Clamp to viewport
    if (x + TIP_W > vw - 8) x = e.clientX - TIP_W - GAP
    if (y < 8) y = 8
    if (y + TIP_H > vh - 8) y = vh - TIP_H - 8

    target.current = { x, y }
    if (!visible) {
      setSmooth({ x, y })
      setPos({ x, y })
    }
  }, [visible])

  const onMouseEnter = useCallback((e) => {
    onMouseMove(e)
    showTimer.current = setTimeout(() => {
      setVisible(true)
      rafRef.current = requestAnimationFrame(animate)
    }, 350)
  }, [animate, onMouseMove])

  const onMouseLeave = useCallback(() => {
    clearTimeout(showTimer.current)
    cancelAnimationFrame(rafRef.current)
    setVisible(false)
  }, [])

  useEffect(() => () => {
    clearTimeout(showTimer.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  if (!text) return <>{children}</>

  return (
    <>
      <div ref={wrapRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
      {visible && createPortal(
        <div style={{
          position:   'fixed',
          left:       smooth.x,
          top:        smooth.y,
          width:      230,
          background: 'var(--tooltip-bg, rgba(10,10,28,0.97))',
          border:     '1px solid var(--tooltip-border, rgba(255,255,255,0.15))',
          borderRadius: 10,
          padding:    '7px 12px',
          fontSize:   12,
          lineHeight: 1.55,
          color:      'var(--tooltip-text, #e0e0ff)',
          zIndex:     99999,
          pointerEvents: 'none',
          boxShadow:  '0 4px 24px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          animation:  'fadeIn .15s ease',
          willChange: 'transform',
        }}>
          {text}
        </div>,
        document.body
      )}
    </>
  )
}
