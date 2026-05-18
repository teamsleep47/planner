import { useState, useEffect, useRef } from 'react'

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
    const t = setTimeout(() => { setCur(value); setFlipping(false) }, 320)
    return () => clearTimeout(t)
  }, [value])

  const W = 36, H = 52, HALF = H / 2
  const digitStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 26, fontWeight: 700,
    color: 'var(--text-1)',
    width: W, lineHeight: `${H}px`,
    textAlign: 'center',
    display: 'block',
  }

  return (
    <div style={{ position:'relative', width:W, height:H, borderRadius:7, overflow:'hidden', boxShadow:'0 0 10px var(--accent-glow)', border:'1px solid var(--flip-border,rgba(255,255,255,0.12))' }}>
      {/* Card background */}
      <div style={{ position:'absolute', inset:0, background:'var(--flip-bg,rgba(255,255,255,0.07))' }}/>
      {/* Center divider */}
      <div style={{ position:'absolute', left:0, right:0, top:HALF-0.5, height:1, background:'var(--flip-border,rgba(255,255,255,0.15))', zIndex:5 }}/>

      {/* Bottom half — clips top of digit, shows bottom portion */}
      <div style={{ position:'absolute', left:0, right:0, bottom:0, height:HALF, overflow:'hidden' }}>
        <span style={{ ...digitStyle, position:'absolute', bottom:0, left:0 }}>{cur}</span>
      </div>

      {/* Top half — clips bottom of digit, shows top portion */}
      <div style={{ position:'absolute', left:0, right:0, top:0, height:HALF, overflow:'hidden' }}>
        <span style={{ ...digitStyle, position:'absolute', top:0, left:0 }}>{cur}</span>
      </div>

      {/* Flap — animates on change, sits on top half position */}
      {flipping && (
        <div style={{
          position:'absolute', left:0, right:0, top:0, height:HALF,
          overflow:'hidden',
          transformOrigin:'bottom center',
          transformStyle:'preserve-3d',
          animation:'flipDown 320ms cubic-bezier(0.4,0,0.2,1) forwards',
          zIndex:10,
          borderRadius:'7px 7px 0 0',
        }}>
          {/* Front — shows prev digit top half */}
          <div style={{ position:'absolute', inset:0, overflow:'hidden', backfaceVisibility:'hidden', background:'var(--flip-bg,rgba(255,255,255,0.07))' }}>
            <span style={{ ...digitStyle, position:'absolute', top:0, left:0 }}>{prev}</span>
          </div>
          {/* Back — shows cur digit top half, pre-rotated */}
          <div style={{ position:'absolute', inset:0, overflow:'hidden', backfaceVisibility:'hidden', background:'var(--flip-bg,rgba(255,255,255,0.07))', transform:'rotateX(180deg)' }}>
            <span style={{ ...digitStyle, position:'absolute', top:0, left:0, transform:'scaleY(-1)' }}>{cur}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function FlipSep() {
  const [on, setOn] = useState(true)
  useEffect(() => { const id = setInterval(()=>setOn(v=>!v), 1000); return ()=>clearInterval(id) }, [])
  return <span style={{ fontSize:22, fontWeight:900, color:'var(--accent)', opacity:on?1:0.2, transition:'opacity .3s', margin:'0 2px', paddingBottom:4, textShadow:'0 0 10px var(--accent-glow)', flexShrink:0 }}>:</span>
}

export default function FlipClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const id = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(id) }, [])
  const h  = time.getHours()
  const hh = String(h%12||12).padStart(2,'0')
  const mm = String(time.getMinutes()).padStart(2,'0')
  const ss = String(time.getSeconds()).padStart(2,'0')
  const ap = h>=12?'PM':'AM'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      <FlipDigit value={hh[0]}/><FlipDigit value={hh[1]}/>
      <FlipSep/>
      <FlipDigit value={mm[0]}/><FlipDigit value={mm[1]}/>
      <FlipSep/>
      <FlipDigit value={ss[0]}/><FlipDigit value={ss[1]}/>
      <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:700, marginLeft:5 }}>{ap}</span>
    </div>
  )
}
