import { useState, useEffect, useRef } from 'react'

// A single flip card digit — one number displayed as top+bottom halves
// with a flap animation when the value changes
function FlipDigit({ value }) {
  const [cur,      setCur]      = useState(value)
  const [prev,     setPrev]     = useState(value)
  const [flipping, setFlipping] = useState(false)
  const lastVal = useRef(value)

  useEffect(() => {
    if (value === lastVal.current) return
    setPrev(lastVal.current)
    lastVal.current = value
    setFlipping(true)
    const t = setTimeout(() => { setCur(value); setFlipping(false) }, 350)
    return () => clearTimeout(t)
  }, [value])

  const card = {
    position: 'absolute', left: 0, right: 0,
    overflow: 'hidden',
    fontFamily: 'var(--font-mono)',
    fontSize: 26, fontWeight: 700,
    color: 'var(--text-1)',
    background: 'var(--flip-bg, rgba(255,255,255,0.08))',
    display: 'flex', justifyContent: 'center',
  }

  return (
    <div style={{ position: 'relative', width: 38, height: 54, perspective: 200 }}>

      {/* Top half — upper portion of current digit */}
      <div style={{ ...card, top: 0, height: '50%', alignItems: 'flex-end', borderRadius: '6px 6px 0 0', borderBottom: '1px solid var(--flip-border, rgba(255,255,255,0.1))' }}>
        <span style={{ lineHeight: 1, paddingBottom: 1 }}>{cur}</span>
      </div>

      {/* Bottom half — lower portion of current digit */}
      <div style={{ ...card, bottom: 0, height: '50%', alignItems: 'flex-start', borderRadius: '0 0 6px 6px', borderTop: '1px solid var(--flip-border, rgba(255,255,255,0.1))' }}>
        <span style={{ lineHeight: 1, paddingTop: 1 }}>{cur}</span>
      </div>

      {/* Animated flap: shows prev on front, flips to reveal cur on back */}
      {flipping && (
        <div style={{
          ...card,
          top: 0, height: '50%',
          alignItems: 'flex-end',
          borderRadius: '6px 6px 0 0',
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d',
          animation: 'flipDown 350ms cubic-bezier(0.4,0,0.6,1) forwards',
          zIndex: 10,
        }}>
          {/* Front face — old digit */}
          <span style={{ lineHeight: 1, paddingBottom: 1, position: 'absolute', backfaceVisibility: 'hidden' }}>{prev}</span>
          {/* Back face — new digit (pre-rotated 180deg) */}
          <span style={{
            lineHeight: 1, paddingBottom: 1,
            position: 'absolute',
            transform: 'rotateX(180deg) scaleY(-1)',
            backfaceVisibility: 'hidden',
          }}>{cur}</span>
        </div>
      )}

      {/* Glow border overlay */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 6, border: '1px solid var(--flip-border, rgba(255,255,255,0.12))', boxShadow: '0 0 10px var(--accent-glow)', pointerEvents: 'none' }} />
    </div>
  )
}

function FlipSep() {
  const [on, setOn] = useState(true)
  useEffect(() => { const id = setInterval(() => setOn(v => !v), 1000); return () => clearInterval(id) }, [])
  return <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', opacity: on ? 1 : 0.2, transition: 'opacity .3s', margin: '0 2px', paddingBottom: 5, textShadow: '0 0 10px var(--accent-glow)' }}>:</span>
}

export default function FlipClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])
  const h  = time.getHours()
  const hh = String(h % 12 || 12).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <FlipDigit value={hh[0]} /><FlipDigit value={hh[1]} />
      <FlipSep />
      <FlipDigit value={mm[0]} /><FlipDigit value={mm[1]} />
      <FlipSep />
      <FlipDigit value={ss[0]} /><FlipDigit value={ss[1]} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginLeft: 6 }}>{ap}</span>
    </div>
  )
}
