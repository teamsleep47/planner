import { useState, useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'
import BottomSheet from './BottomSheet.jsx'

const IS_MOBILE = () => window.innerWidth <= 768

export default function InlineNotes({ value, onChange, placeholder = 'Add notes…', title = 'Notes' }) {
  const [expanded,  setExpanded]  = useState(false)
  const [sheet,     setSheet]     = useState(false)
  const [draft,     setDraft]     = useState(value || '')
  const textareaRef = useRef(null)
  const wrapRef     = useRef(null)

  // Keep draft in sync with external value
  useEffect(() => { setDraft(value || '') }, [value])

  // Auto-focus when expanding
  useEffect(() => {
    if (expanded && textareaRef.current) textareaRef.current.focus()
  }, [expanded])

  // Click outside to save and collapse
  useEffect(() => {
    if (!expanded) return
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onChange(draft)
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded, draft, onChange])

  const save = () => { onChange(draft); setExpanded(false) }
  const saveSheet = () => { onChange(draft); setSheet(false) }

  const handleClick = () => {
    if (IS_MOBILE()) setSheet(true)
    else setExpanded(true)
  }

  const preview = value?.trim()
    ? value.trim().slice(0, 60) + (value.trim().length > 60 ? '…' : '')
    : null

  return (
    <>
      {/* Collapsed preview */}
      {!expanded && (
        <div ref={wrapRef} onClick={handleClick} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '7px 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          cursor: 'text',
          transition: 'border-color .15s',
          minHeight: 34,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
        >
          <FileText size={13} style={{ color: preview ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, marginTop: 1 }}/>
          <span style={{ fontSize: 12, color: preview ? 'var(--text-2)' : 'var(--text-3)', lineHeight: 1.5, flex: 1 }}>
            {preview || placeholder}
          </span>
        </div>
      )}

      {/* Expanded textarea (desktop) */}
      {expanded && (
        <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="inline-input"
            style={{ fontSize: 12, resize: 'vertical', lineHeight: 1.6 }}
            onKeyDown={e => { if (e.key === 'Escape') save() }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 11, padding: '5px 12px' }}>Save</button>
            <button className="btn btn-ghost" onClick={() => { setDraft(value||''); setExpanded(false) }} style={{ fontSize: 11, padding: '5px 12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      <BottomSheet open={sheet} onClose={saveSheet} title={title}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className="inline-input"
          style={{ fontSize: 14, resize: 'none', lineHeight: 1.7, width: '100%' }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={saveSheet} style={{ flex: 1 }}>Save notes</button>
          <button className="btn btn-ghost" onClick={() => { setDraft(value||''); setSheet(false) }}>Cancel</button>
        </div>
      </BottomSheet>
    </>
  )
}
