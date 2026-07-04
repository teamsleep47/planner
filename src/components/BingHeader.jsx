import { ImageIcon } from 'lucide-react'

export default function BingHeader({ enabled, wallpaper }) {
  if (!enabled) return null

  return (
    <div style={{
      position: 'relative', width: '100%', height: 120,
      overflow: 'hidden', flexShrink: 0, background: '#080818',
    }}>
      {wallpaper?.url && (
        <img src={wallpaper.url} alt={wallpaper.title || 'Bing daily photo'} style={{
          position:'absolute', inset:0, width:'100%', height:'100%',
          objectFit:'cover', objectPosition:'center 35%', display:'block',
        }}/>
      )}

      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`linear-gradient(to bottom,
          rgba(8,8,24,0.25) 0%, transparent 40%,
          rgba(8,8,24,0.85) 100%)`,
      }}/>

      {wallpaper?.title && (
        <div style={{ position:'absolute', bottom:10, right:16, textAlign:'right', maxWidth:340 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,.8)', lineHeight:1.3 }}>
            {wallpaper.title}
          </div>
          {wallpaper.location && wallpaper.location !== wallpaper.title && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', textShadow:'0 1px 4px rgba(0,0,0,.7)' }}>
              {wallpaper.location}
            </div>
          )}
        </div>
      )}

      {!wallpaper && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.2)', flexDirection:'column', gap:6 }}>
          <ImageIcon size={22}/>
          <span style={{ fontSize:11 }}>Loading today's photo…</span>
        </div>
      )}
    </div>
  )
}
