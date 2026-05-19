// timeFormat.js — relative time formatting for due dates

const TIME_NAMES = {
  0: 'midnight', 12: 'noon',
}

function formatHour(h) {
  if (TIME_NAMES[h]) return TIME_NAMES[h]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:00 ${ampm}`
}

export function formatRelativeDue(dateStr, timeStr) {
  if (!dateStr) return null

  // Build the due datetime
  let due
  if (timeStr) {
    due = new Date(`${dateStr}T${timeStr}`)
  } else {
    // No time set — treat as end of day (11:59 PM)
    due = new Date(`${dateStr}T23:59:00`)
  }

  if (isNaN(due)) return null

  const now      = new Date()
  const diffMs   = due - now
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs  = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const dayName  = due.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel= due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const h        = due.getHours()
  const timeLabel= formatHour(h)

  // Overdue
  if (diffMs < 0) {
    const ago = Math.abs(diffMins)
    if (ago < 60)  return { label: `Overdue ${ago}m ago`,               color: 'var(--coral)', urgent: true }
    if (ago < 1440)return { label: `Overdue ${Math.floor(ago/60)}h ago`, color: 'var(--coral)', urgent: true }
    return               { label: `Overdue ${Math.abs(diffDays)}d ago`,  color: 'var(--coral)', urgent: true }
  }

  // Due very soon
  if (diffMins < 60)  return { label: `Due in ${diffMins}m`,            color: '#ef4444', urgent: true  }
  if (diffHrs  < 3)   return { label: `Due in ${diffHrs}h`,             color: 'var(--coral)', urgent: true }
  if (diffHrs  < 24)  return { label: `Due today by ${timeLabel}`,      color: 'var(--coral)', urgent: false }

  // Tomorrow
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1)
  if (due.toDateString() === tomorrow.toDateString()) {
    return { label: `Due tomorrow${timeStr ? ` by ${timeLabel}` : ''}`, color: 'var(--amber)', urgent: false }
  }

  // This week (2-6 days)
  if (diffDays < 7) {
    return { label: `Due ${dayName}${timeStr ? ` by ${timeLabel}` : ''}`, color: 'var(--amber)', urgent: false }
  }

  // Further out
  return { label: `Due ${dateLabel}${timeStr ? ` by ${timeLabel}` : ''}`, color: 'var(--text-3)', urgent: false }
}
