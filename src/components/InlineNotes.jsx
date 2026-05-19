import { useState, useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'
import BottomSheet from './BottomSheet.jsx'

const IS_MOBILE = () => window.innerWidth <= 768

export default function InlineNotes({ value, onChange, placeholder = 'Add notes…', title = 'Notes' }) {
  const [expanded, setExpanded] = useState(false)
  const [draft,    setDraft]    = useState(value || '')
  const [sheet,    setSheet]    = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => { setDraft(value || '') }, [value])

  // Auto-resize when expanded
  useEffect(() => {
    if (expanded && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 64) + 'px'
      el.focus()
    }
  }, [expanded])

  const save   = () => { onChange(draft); setExpanded(false) }
  const cancel = () => { setDraft(value || ''); setExpanded(false) }
  const saveSheet = () => { onChange(draft); setSheet(false) }
  const cancelSheet = () => { setDraft(value || ''); setSheet(false) }

  const preview = value?.trim()
    ? value.trim().slice(0, 80) + (value.trim().length > 80 ? '…' : '')
    : null

  // ── Mobile: button only, opens bottom sheet ──────
  if (IS_MOBILE()) {
    return (
      <>
        <button onClick={() => { setDraft(value || ''); setSheet(true) }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px',
          background: preview ? 'var(--glass-bg-2)' : 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer', textAlign: 'left',
          transition: 'border-color .15s',
        }}>
          <FileText size={13} style={{ color: preview ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }}/>
          <span style={{ fontSize: 12, color: preview ? 'var(--text-2)' : 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview || placeholder}
          </span>
          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
            {preview ? 'Edit ›' : 'Add ›'}
          </span>
        </button>

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
            <button className="btn btn-ghost" onClick={cancelSheet}>Cancel</button>
          </div>
        </BottomSheet>
      </>
    )
  }

  // ── Desktop: click preview to expand inline ───────
  if (!expanded) {
    return (
      <div onClick={() => { setDraft(value || ''); setExpanded(true) }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 10px', borderRadius: 'var(--radius-md)',
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          cursor: 'text', minHeight: 34, transition: 'border-color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
      >
        <FileText size={13} style={{ color: preview ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, marginTop: 1 }}/>
        <span style={{ fontSize: 12, color: preview ? 'var(--text-2)' : 'var(--text-3)', flex: 1, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {preview || placeholder}
        </span>
        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, flexShrink: 0, marginTop: 1 }}>
          {preview ? 'Edit' : '+ Add'}
        </span>
      </div>
    )
  }

  // Desktop expanded
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = Math.max(e.target.scrollHeight, 64) + 'px'
        }}
        placeholder={placeholder}
        className="inline-input"
        style={{ fontSize: 12, resize: 'none', lineHeight: 1.6, width: '100%', overflow: 'hidden', minHeight: 64 }}
        onKeyDown={e => { if (e.key === 'Escape') cancel() }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={save} style={{ fontSize: 11, padding: '5px 12px' }}>Save</button>
        <button className="btn btn-ghost" onClick={cancel} style={{ fontSize: 11, padding: '5px 12px' }}>Cancel</button>
      </div>
    </div>
  )
}
