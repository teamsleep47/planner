import { StickyNote } from 'lucide-react'

export default function Notes() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Notes</div>
          <div className="page-subtitle">Quick capture, saved to Google Drive</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <StickyNote size={36} style={{ margin: '0 auto 12px', opacity: .4 }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Coming soon</div>
          <div style={{ fontSize: 13 }}>Notes will sync to a Drive folder as markdown files once Drive is connected.</div>
        </div>
      </div>
    </>
  )
}
