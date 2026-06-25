import { ImageResponse } from 'next/og'

export const alt = 'gm-ai — AI operator for brewpub & beerhall managers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Default share card in the warm editorial palette (hex approximations of the
// app's oklch tokens, since next/og can't resolve CSS variables). Any page
// without its own opengraph-image inherits this one.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#F6F5F1',
        color: '#26241F',
        padding: '72px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: '#26241F',
            color: '#F6F5F1',
            fontSize: '32px',
            fontWeight: 700,
          }}
        >
          G
        </div>
        <div style={{ fontSize: '30px', fontWeight: 600 }}>gm-ai</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{ fontSize: '68px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Your AI operator for the brewpub.
        </div>
        <div style={{ fontSize: '30px', color: '#6B675E', maxWidth: '900px', lineHeight: 1.3 }}>
          Today’s margin, tonight’s labour, last week’s cellar log. One chat, grounded in your POS
          and your own SOPs.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '24px',
          color: '#6B675E',
        }}
      >
        <div
          style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#6E8B5B' }}
        />
        Square-grounded · built with a brewpub operator
      </div>
    </div>,
    size,
  )
}
