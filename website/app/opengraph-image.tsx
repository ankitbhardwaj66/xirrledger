import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 90px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Gold accent bar */}
      <div style={{ width: '56px', height: '4px', background: '#f59e0b', borderRadius: '2px', marginBottom: '36px', display: 'flex' }} />

      {/* Badge */}
      <div style={{
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '100px',
        padding: '7px 18px',
        fontSize: '13px',
        fontWeight: 700,
        color: '#f59e0b',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '28px',
        display: 'flex',
      }}>
        XIRR LEDGER
      </div>

      {/* Headline */}
      <div style={{
        fontSize: '66px',
        fontWeight: 800,
        color: '#ffffff',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <span>The Only Ledger-Based</span>
        <span style={{ color: '#f59e0b' }}>XIRR Calculator</span>
      </div>

      {/* Subtext */}
      <div style={{
        fontSize: '24px',
        color: '#64748b',
        lineHeight: 1.5,
        marginBottom: '60px',
        display: 'flex',
      }}>
        Accurate portfolio returns from your broker ledger. Free.
      </div>

      {/* URL */}
      <div style={{ fontSize: '18px', color: '#f59e0b', fontWeight: 600, display: 'flex' }}>
        xirrledger.com
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
