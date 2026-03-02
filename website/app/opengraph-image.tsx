import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const portfolioPoints = '40,195 80,204 120,180 160,190 200,162 240,149 280,160 320,122 360,108 400,116 450,76 490,42';
const niftyPoints     = '40,195 80,198 120,185 160,195 200,176 240,171 280,183 320,167 360,154 400,159 450,140 490,116';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: '#0f172a',
        display: 'flex',
        fontFamily: 'sans-serif',
      }}
    >
      {/* ── Left panel — text ── */}
      <div style={{
        width: '580px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '70px 56px',
      }}>
        {/* Gold bar */}
        <div style={{ width: '48px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '30px', display: 'flex' }} />

        {/* Badge */}
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '100px',
          padding: '6px 16px',
          fontSize: '12px',
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
          fontSize: '54px',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span>Free Ledger-Based</span>
          <span style={{ color: '#f59e0b' }}>XIRR Calculator</span>
        </div>

        {/* Subtext */}
        <div style={{
          fontSize: '21px',
          color: '#64748b',
          lineHeight: 1.5,
          marginBottom: '48px',
          display: 'flex',
        }}>
          Compare your returns with Nifty 50
        </div>

        {/* URL */}
        <div style={{ fontSize: '17px', color: '#f59e0b', fontWeight: 600, display: 'flex' }}>
          xirrledger.com
        </div>
      </div>

      {/* ── Right panel — chart ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 52px 48px 16px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '28px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', paddingLeft: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: '#f59e0b', display: 'flex' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Your Portfolio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: '#818cf8', display: 'flex' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Nifty 50</span>
            </div>
          </div>

          {/* Chart */}
          <svg
            width="490"
            height="210"
            viewBox="30 30 470 180"
          >
            {/* Grid lines */}
            <line x1="40" y1="60"  x2="490" y2="60"  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="40" y1="100" x2="490" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="40" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="40" y1="180" x2="490" y2="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Nifty line */}
            <polyline
              points={niftyPoints}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Portfolio line */}
            <polyline
              points={portfolioPoints}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* End dots */}
            <circle cx="490" cy="42"  r="5" fill="#f59e0b" />
            <circle cx="490" cy="116" r="5" fill="#818cf8" />
          </svg>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
