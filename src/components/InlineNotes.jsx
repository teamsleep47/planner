import { useState, useRef, useEffect } from 'react'
import BottomSheet from './BottomSheet.jsx'

const IS_MOBILE = () => window.innerWidth <= 768

export default function InlineNotes({ value, onChange, placeholder = 'Add notes…', title = 'Notes' }) {
  const [draft,  setDraft]  = useState(value || '')
  const [sheet,  setSheet]  = useState(false)
  const mobile = IS_MOBILE()

  useEffect(() => { setDraft(value || '') }, [value])

  const saveSheet = () => { onChange(draft); setSheet(false) }

  // Desktop — always-visible textarea, saves on blur
  if (!mobile) {
    return (
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => onChange(draft)}
        placeholder={placeholder}
        rows={2}
        className="inline-input"
        style={{ fontSize:12, resize:'vertical', lineHeight:1.6, width:'100%' }}
      />
    )
  }

  // Mobile — preview tap to open bottom sheet
  const preview = value?.trim()
    ? value.trim().slice(0, 50) + (value.trim().length > 50 ? '…' : '')
    : null

  return (
    <>
      <div onClick={() => setSheet(true)} style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'8px 10px', borderRadius:'var(--radius-md)',
        background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
        cursor:'text', minHeight:36,
      }}>
        <span style={{ fontSize:12, color: preview ? 'var(--text-2)' : 'var(--text-3)', flex:1 }}>
          {preview || placeholder}
        </span>
        <span style={{ fontSize:10, color:'var(--accent)', fontWeight:600, flexShrink:0 }}>
          {preview ? 'Edit' : '+ Add'}
        </span>
      </div>

      <BottomSheet open={sheet} onClose={saveSheet} title={title}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className="inline-input"
          style={{ fontSize:14, resize:'none', lineHeight:1.7, width:'100%' }}
          autoFocus
        />
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <button className="btn btn-primary" onClick={saveSheet} style={{ flex:1 }}>Save</button>
          <button className="btn btn-ghost" onClick={() => { setDraft(value||''); setSheet(false) }}>Cancel</button>
        </div>
      </BottomSheet>
    </>
  )
}
