// srs.js — Spaced Repetition System (SM-2 algorithm)
// Same algorithm used by Anki

export function createCard(front, back, deckId) {
  return {
    id:         Math.random().toString(36).slice(2, 9),
    front,
    back,
    deckId,
    // SRS fields
    interval:   1,      // days until next review
    easeFactor: 2.5,    // how easy the card is (2.5 = default)
    repetitions:0,      // times reviewed successfully
    nextReview:  new Date().toISOString().slice(0,10),
    lastReview:  null,
  }
}

// Grade: 0=Again, 1=Hard, 2=Good, 3=Easy
export function reviewCard(card, grade) {
  const c = { ...card }
  c.lastReview = new Date().toISOString().slice(0,10)

  if (grade < 2) {
    // Failed — reset
    c.repetitions = 0
    c.interval    = 1
  } else {
    // Passed
    if (c.repetitions === 0)      c.interval = 1
    else if (c.repetitions === 1) c.interval = 6
    else c.interval = Math.round(c.interval * c.easeFactor)

    c.easeFactor = Math.max(1.3,
      c.easeFactor + 0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02)
    )
    c.repetitions++
  }

  const next = new Date()
  next.setDate(next.getDate() + c.interval)
  c.nextReview = next.toISOString().slice(0,10)
  return c
}

// Get cards due today
export function getDueCards(cards) {
  const today = new Date().toISOString().slice(0,10)
  return cards.filter(c => c.nextReview <= today)
}

// Parse "front > back" text format
export function parseCardText(text) {
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('>'))
    .map(line => {
      const idx   = line.indexOf('>')
      const front = line.slice(0, idx).trim()
      const back  = line.slice(idx + 1).trim()
      return front && back ? { front, back } : null
    })
    .filter(Boolean)
}

// Export cards to "front > back" text format
export function exportCardText(cards) {
  return cards.map(c => `${c.front} > ${c.back}`).join('\n')
}
