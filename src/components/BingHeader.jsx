import { ImageIcon } from 'lucide-react'

export default function BingHeader({ enabled, wallpaper }) {
  if (!enabled) return null

  return (
    <div style={{
      position: 'relative', width: '100%', height: 200,
      overflow: 'hidden', flexShrink: 0, background: '#080818',
    }}>
      {wallpaper?.url && (
        <img src={wallpaper.url} alt={wallpaper.title} style={{
          position:'absolute', inset:0, width:'100%', height:'100%',
          objectFit:'cover', objectPosition:'center 35%', display:'block',
        }}/>
      )}

      {/* Gradient overlays */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`linear-gradient(to bottom,
          rgba(8,8,24,0.5) 0%, transparent 40%,
          transparent 55%, rgba(8,8,24,0.65) 100%)`,
      }}/>

      {/* Caption — bottom right, Windows-style */}
      {wallpaper?.title && (
        <div style={{ position:'absolute', bottom:14, right:20, textAlign:'right', maxWidth:360 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff',
            textShadow:'0 1px 8px rgba(0,0,0,.7)', letterSpacing:'-0.2px', lineHeight:1.3, marginBottom:2 }}>
            {wallpaper.title}
          </div>
          {wallpaper.location && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)',
              textShadow:'0 1px 6px rgba(0,0,0,.6)', fontWeight:500 }}>
              {wallpaper.location}
            </div>
          )}
        </div>
      )}

      {!wallpaper && (
        <div style={{ position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center',
          color:'rgba(255,255,255,.2)', flexDirection:'column', gap:8 }}>
          <ImageIcon size={28}/>
          <span style={{ fontSize:11 }}>Loading today's photo…</span>
        </div>
      )}
    </div>
  )
}
