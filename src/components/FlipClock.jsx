import { useState, useEffect } from 'react'

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
    <div className="flip-clock">
      {[...hh, ':', ...mm, ':', ...ss].map((c, i) =>
        c === ':' ? <span key={i} className="flip-sep">:</span>
                  : <div key={i} className="flip-digit">{c}</div>
      )}
      <span className="flip-ampm">{ap}</span>
    </div>
  )
}
