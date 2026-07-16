import { ImageResponse } from 'next/og'

export const alt = 'AI-GM — the AI operator for hospitality'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Default share card in the "Publican's Ledger" palette (hex literals — next/og
// can't resolve CSS variables). Any page without its own opengraph-image
// inherits this one. Ledger-rule stripes + brass wordmark tag + serif headline.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#F5EFE3',
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0px, transparent 47px, rgba(143,107,31,0.09) 47px, rgba(143,107,31,0.09) 48px)',
        color: '#201A12',
        padding: '72px',
        fontFamily: 'serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 800,
            letterSpacing: '-3px',
            fontFamily: 'sans-serif',
          }}
        >
          GM
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '6px',
            padding: '6px 8px',
            borderRadius: '5px',
            background: '#8F6B1F',
            color: '#F5EFE3',
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: 'monospace',
          }}
        >
          AI
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: '78px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          <span>Last night&apos;s&nbsp;</span>
          <span style={{ fontStyle: 'italic', color: '#8F6B1F' }}>margin,</span>
          <span>&nbsp;this morning.</span>
        </div>
        <div
          style={{
            fontSize: '30px',
            color: '#5C5340',
            maxWidth: '920px',
            lineHeight: 1.35,
            fontFamily: 'sans-serif',
          }}
        >
          Ask in plain English. AI-GM answers from your till, your labour and your own operating
          docs — every claim cited back to its source.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '22px',
          color: '#8A7D63',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            background: '#8F6B1F',
            transform: 'rotate(45deg)',
          }}
        />
        read-only · venue-scoped · cited
      </div>
    </div>,
    size,
  )
}
