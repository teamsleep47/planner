import { useState, useEffect, useRef } from 'react'

function FlipDigit({ value }) {
  const [current,  setCurrent]  = useState(value)
  const [previous, setPrevious] = useState(value)
  const [flipping, setFlipping] = useState(false)
  const prevVal = useRef(value)

  useEffect(() => {
    if (value !== prevVal.current) {
      setPrevious(prevVal.current)
      setFlipping(true)
      const t = setTimeout(() => {
        setCurrent(value)
        setFlipping(false)
        prevVal.current = value
      }, 300)
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <div className="flip-digit-wrap">
      {/* Static bottom half showing current */}
      <div className="flip-card flip-card-lower">
        <span>{current}</span>
      </div>
      {/* Static top half showing current */}
      <div className="flip-card flip-card-upper">
        <span>{current}</span>
      </div>
      {/* Animated flap */}
      {flipping && (
        <>
          {/* Top flap flips down (shows previous on front, current on back) */}
          <div className="flip-card flip-card-flap-top flip-anim-top">
            <span className="flip-front">{previous}</span>
            <span className="flip-back">{current}</span>
          </div>
        </>
      )}
    </div>
  )
}

function FlipSep() {
  const [bright, setBright] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setBright(b => !b), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="flip-sep" style={{ opacity: bright ? 1 : 0.3, transition: 'opacity .2s' }}>:</span>
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
    <div className="flip-clock" aria-label="Current time">
      <FlipDigit value={hh[0]} />
      <FlipDigit value={hh[1]} />
      <FlipSep />
      <FlipDigit value={mm[0]} />
      <FlipDigit value={mm[1]} />
      <FlipSep />
      <FlipDigit value={ss[0]} />
      <FlipDigit value={ss[1]} />
      <span className="flip-ampm">{ap}</span>
    </div>
  )
}
