import { Wallet } from 'lucide-react'

export default function Finance() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Finance</div>
          <div className="page-subtitle">Budget and tuition tracker</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Wallet size={36} style={{ margin: '0 auto 12px', opacity: .4 }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Coming soon</div>
          <div style={{ fontSize: 13 }}>Finance tracker coming in a later sprint.</div>
        </div>
      </div>
    </>
  )
}
