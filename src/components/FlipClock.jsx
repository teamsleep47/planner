import { useState, useEffect, useRef } from 'react'

function FlipDigit({ value }) {
  const [display,  setDisplay]  = useState(value)
  const [prev,     setPrev]     = useState(value)
  const [flipping, setFlipping] = useState(false)
  const lastVal = useRef(value)

  useEffect(() => {
    if (value === lastVal.current) return
    setPrev(lastVal.current)
    lastVal.current = value
    setFlipping(true)
    const t = setTimeout(() => {
      setDisplay(value)
      setFlipping(false)
    }, 320)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div style={{
      position: 'relative',
      width: 36, height: 52,
      perspective: 160,
    }}>
      {/* Bottom half — shows new value */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
        background: 'var(--flip-bg)',
        borderRadius: '0 0 6px 6px',
        borderTop: '1px solid var(--flip-border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
        color: 'var(--text-1)',
      }}>
        <span style={{ marginTop: -2 }}>{display}</span>
      </div>

      {/* Top half — shows current value */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'var(--flip-bg)',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid var(--flip-border)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
        color: 'var(--text-1)',
      }}>
        <span style={{ marginBottom: -2 }}>{display}</span>
      </div>

      {/* Flap — animates when digit changes */}
      {flipping && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d',
          animation: 'flipDown 320ms ease-in forwards',
          borderRadius: '6px 6px 0 0',
          zIndex: 10,
        }}>
          {/* Front of flap — shows old value */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--flip-bg)',
            borderRadius: '6px 6px 0 0',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
            color: 'var(--text-1)',
            backfaceVisibility: 'hidden',
          }}>
            <span style={{ marginBottom: -2 }}>{prev}</span>
          </div>
          {/* Back of flap — shows new value, rotated 180deg */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--flip-bg)',
            borderRadius: '6px 6px 0 0',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
            color: 'var(--text-1)',
            transform: 'rotateX(180deg)',
            backfaceVisibility: 'hidden',
          }}>
            <span style={{ marginBottom: -2, transform: 'scaleY(-1)' }}>{display}</span>
          </div>
        </div>
      )}

      {/* Outer border/glow */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 6,
        border: '1px solid var(--flip-border)',
        boxShadow: '0 0 8px var(--accent-glow)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function FlipSep() {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{
      fontSize: 22, fontWeight: 900,
      color: 'var(--accent)',
      opacity: on ? 1 : 0.25,
      transition: 'opacity .25s',
      margin: '0 2px',
      paddingBottom: 4,
      textShadow: '0 0 8px var(--accent-glow)',
    }}>:</span>
  )
}

export default function FlipClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h  = time.getHours()
  const hh = String(h % 12 || 12).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} aria-label="Current time">
      <FlipDigit value={hh[0]} />
      <FlipDigit value={hh[1]} />
      <FlipSep />
      <FlipDigit value={mm[0]} />
      <FlipDigit value={mm[1]} />
      <FlipSep />
      <FlipDigit value={ss[0]} />
      <FlipDigit value={ss[1]} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginLeft: 5 }}>{ap}</span>
    </div>
  )
}
