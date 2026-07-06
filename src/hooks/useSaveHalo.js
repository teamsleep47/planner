import { useCallback, useRef } from 'react'

/**
 * useSaveHalo — adds a pulsing green/red ring to any element after save/error
 *
 * Usage:
 *   const { haloRef, triggerHalo } = useSaveHalo()
 *   <div ref={haloRef}>...</div>
 *   // After save: triggerHalo('green')
 *   // After error: triggerHalo('red')
 */
export function useSaveHalo() {
  const haloRef = useRef(null)

  const triggerHalo = useCallback((type = 'green') => {
    const el = haloRef.current
    if (!el) return
    const cls = type === 'green' ? 'save-halo-green' : 'save-halo-red'
    el.classList.remove('save-halo-green', 'save-halo-red')
    // Force reflow so animation restarts
    void el.offsetWidth
    el.classList.add(cls)
    setTimeout(() => el.classList.remove(cls), 1000)
  }, [])

  return { haloRef, triggerHalo }
}
