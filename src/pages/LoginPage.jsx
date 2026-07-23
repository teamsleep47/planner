export default function LoginPage({ onSignIn, error, loading }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 20% 30%, var(--bg-mesh-1) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, var(--bg-mesh-2) 0%, transparent 60%), var(--bg-base)',
    }}>
      <div style={{
        background: 'var(--glass-bg-2)',
        backdropFilter: 'var(--blur)',
        WebkitBackdropFilter: 'var(--blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '52px 44px',
        width: '100%',
        maxWidth: 400,
        textAlign: 'center',
        boxShadow: 'var(--shadow)',
      }}>
        <h1 style={{fontSize:26,fontWeight:700,letterSpacing:'-0.5px',marginBottom:8}}>Assignment Planner</h1>
        <p style={{fontSize:14,color:'var(--text-2)',marginBottom:36}}>
          Your academic dashboard — sign in to continue
        </p>

        {error && (
          <div style={{background:'var(--coral-dim)',color:'var(--coral)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:13,marginBottom:20,border:'1px solid var(--coral-dim)'}}>
            Sign-in failed — please try again.
          </div>
        )}

        <button
          onClick={onSignIn}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '13px 20px',
            background: 'white',
            color: '#1f1f1f',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 16px rgba(0,0,0,.15)',
            transition: 'box-shadow .2s, transform .2s',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => { e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,.25)'; e.currentTarget.style.transform='translateY(-1px)' }}
          onMouseOut={e => { e.currentTarget.style.boxShadow='0 2px 16px rgba(0,0,0,.15)'; e.currentTarget.style.transform='none' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p style={{fontSize:12,color:'var(--text-3)',marginTop:24,lineHeight:1.6}}>
          Your data is synced privately and securely to the cloud.<br/>No sharing with anyone else.
        </p>
      </div>
    </div>
  )
}
