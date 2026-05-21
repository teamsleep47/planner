// BingHeader.jsx — Bing daily photo hero banner
// Only rendered when theme === 'bing'. Sits between the TopBar and Routes.

import { useBingWallpaper } from '../hooks/useBingWallpaper.js'
import { ImageIcon } from 'lucide-react'

export default function BingHeader({ enabled }) {
  const { wallpaper, loading } = useBingWallpaper(enabled)

  if (!enabled) return null

  return (
    <div className="bing-header" style={{
      position: 'relative',
      width: '100%',
      height: 220,
      overflow: 'hidden',
      flexShrink: 0,
      background: '#0a0a1a',
    }}>
      {/* Photo */}
      {wallpaper?.url && (
        <img
          src={wallpaper.url}
          alt={wallpaper.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 35%',
            display: 'block',
          }}
        />
      )}

      {/* Loading shimmer when no image yet */}
      {loading && !wallpaper && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #0f0a2e 0%, #1a1040 50%, #0f0a2e 100%)',
          backgroundSize: '200% 100%',
          animation: 'bingShimmer 1.6s infinite',
        }}/>
      )}

      {/* Gradient overlays — top fade matches sidebar glass, bottom lifts text */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          linear-gradient(to bottom,
            rgba(8,8,24,0.55) 0%,
            transparent 40%,
            transparent 55%,
            rgba(8,8,24,0.70) 100%
          )
        `,
        pointerEvents: 'none',
      }}/>

      {/* Caption overlay — bottom-right, Windows-style */}
      {wallpaper && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 24,
          textAlign: 'right',
          maxWidth: 360,
        }}>
          {wallpaper.title && (
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 1px 8px rgba(0,0,0,0.7)',
              letterSpacing: '-0.2px',
              lineHeight: 1.3,
              marginBottom: 3,
            }}>
              {wallpaper.title}
            </div>
          )}
          {wallpaper.location && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.75)',
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}>
              {wallpaper.location}
            </div>
          )}
        </div>
      )}

      {/* "No image" fallback icon */}
      {!loading && !wallpaper && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.2)',
          flexDirection: 'column', gap: 8,
        }}>
          <ImageIcon size={32}/>
          <span style={{ fontSize: 12 }}>Loading today's photo…</span>
        </div>
      )}
    </div>
  )
}
