import { useState, useEffect } from 'react'

function FlipDigit({ value }) {
  return (
    <div className="flip-digit">{value}</div>
  )
}

export default function FlipClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(time.getHours()   % 12 || 12).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM'

  return (
    <div className="flip-clock" aria-label="Current time">
      <FlipDigit value={hh[0]} />
      <FlipDigit value={hh[1]} />
      <span className="flip-sep">:</span>
      <FlipDigit value={mm[0]} />
      <FlipDigit value={mm[1]} />
      <span className="flip-sep">:</span>
      <FlipDigit value={ss[0]} />
      <FlipDigit value={ss[1]} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4, fontWeight: 600 }}>{ampm}</span>
    </div>
  )
}
