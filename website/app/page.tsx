import Link from 'next/link';

/* ─────────────────────────────────────────────
   Reusable glass card style
───────────────────────────────────────────── */
const glass = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

/* ─────────────────────────────────────────────
   SVG path data — simulated portfolio vs Nifty
   Y-axis: lower = higher return (SVG coords)
   X: 40 → 490, 12 data points
───────────────────────────────────────────── */
const portfolioPoints = '40,195 80,204 120,180 160,190 200,162 240,149 280,160 320,122 360,108 400,116 450,76 490,42';
const niftyPoints     = '40,195 80,198 120,185 160,195 200,176 240,171 280,183 320,167 360,154 400,159 450,140 490,116';

const portfolioPath = 'M ' + portfolioPoints.replace(/ /g, ' L ');
const niftyPath     = 'M ' + niftyPoints.replace(/ /g, ' L ');
const portfolioFill = portfolioPath + ' L 490,215 L 40,215 Z';
const niftyFill     = niftyPath     + ' L 490,215 L 40,215 Z';

export default function Home() {
  return (
    <>
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section style={{ background: '#0f172a', position: 'relative', overflow: 'hidden', paddingTop: '6rem', paddingBottom: '6rem' }}>

        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '10%', left: '-10%',
          width: '60%', height: '70%',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0', right: '-5%',
          width: '40%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <div className="container-custom relative" style={{ zIndex: 1 }}>
          <div className="grid md:grid-cols-2 gap-16 items-center">

            {/* ── Left: Copy ── */}
            <div>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '100px', padding: '5px 14px',
                fontSize: '12px', fontWeight: 600, color: '#f59e0b',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                marginBottom: '24px',
              }}>
                ✦ Ledger-Based Accuracy
              </div>

              <h1 style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                fontWeight: 800, lineHeight: 1.12,
                color: '#ffffff', marginBottom: '1.25rem',
                letterSpacing: '-0.02em',
              }}>
                Know Your{' '}
                <span style={{ color: '#f59e0b' }}>True</span>{' '}
                Portfolio Returns
              </h1>

              <p style={{
                fontSize: '1.1rem', color: '#94a3b8',
                lineHeight: 1.75, marginBottom: '2rem',
                maxWidth: '480px',
              }}>
                Upload your broker ledger and get your precise XIRR — including all charges, idle cash, and timing. Compare against Nifty 50 instantly. Currently supports Zerodha, Groww &amp; Fyers — more brokers coming soon.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <Link href="/calculator" style={{
                  background: '#f59e0b', color: '#0a1020',
                  padding: '13px 28px', borderRadius: '10px',
                  fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}>
                  Calculate Free
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a href="/sample_report.pdf" download style={{
                  background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                  padding: '13px 28px', borderRadius: '10px',
                  fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}>
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Sample Report
                </a>
              </div>

              {/* Trust */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                <span>✓ Free to use</span>
                <span>✓ No registration</span>
                <span>✓ Privacy-first</span>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '8px', padding: '7px 12px', fontSize: '12px', color: '#86efac',
              }}>
                <svg style={{ width: '13px', height: '13px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 00-8 0v4M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z" />
                </svg>
                We never store your financial data.
              </div>
            </div>

            {/* ── Right: Animated Chart Card ── */}
            <div className="hidden md:block">
              <div style={{ ...glass, padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.08)' }}>

                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Your Portfolio</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>18.45%</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>XIRR (annualized)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Nifty 50</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748b', lineHeight: 1 }}>14.23%</div>
                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>benchmark</div>
                  </div>
                </div>

                {/* SVG Chart */}
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 530 225" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="slateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#475569" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#475569" stopOpacity="0" />
                      </linearGradient>
                      <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[55, 105, 155, 205].map(y => (
                      <line key={y} x1="40" y1={y} x2="500" y2={y}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}

                    {/* Y-axis labels */}
                    <text x="36" y="58"  fill="#334155" fontSize="10" textAnchor="end">+84%</text>
                    <text x="36" y="108" fill="#334155" fontSize="10" textAnchor="end">+60%</text>
                    <text x="36" y="158" fill="#334155" fontSize="10" textAnchor="end">+30%</text>
                    <text x="36" y="208" fill="#334155" fontSize="10" textAnchor="end">0%</text>

                    {/* Nifty fill */}
                    <path d={niftyFill} fill="url(#slateGrad)" />
                    {/* Portfolio fill */}
                    <path d={portfolioFill} fill="url(#goldGrad)" />

                    {/* Nifty line — animates in */}
                    <path
                      d={niftyPath}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.5"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400,
                        animation: 'drawLine 2.2s cubic-bezier(0.4,0,0.2,1) 0.6s forwards',
                      }}
                    />

                    {/* Portfolio line — animates in first */}
                    <path
                      d={portfolioPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      filter="url(#lineGlow)"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400,
                        animation: 'drawLine 2s cubic-bezier(0.4,0,0.2,1) 0.2s forwards',
                      }}
                    />

                    {/* End dot — portfolio (gold, pulsing ring) */}
                    <circle cx="490" cy="42" r="12" fill="#f59e0b" fillOpacity="0.15"
                      style={{ animation: 'glowPulse 2.5s ease-in-out 2.4s infinite' }} />
                    <circle cx="490" cy="42" r="5" fill="#f59e0b"
                      style={{ animation: 'dotFade 0.4s ease-out 2.3s both' }} />

                    {/* End dot — Nifty */}
                    <circle cx="490" cy="116" r="4" fill="#475569"
                      style={{ animation: 'dotFade 0.4s ease-out 2.8s both' }} />

                    {/* End labels */}
                    <text x="500" y="46" fill="#f59e0b" fontSize="11" fontWeight="700"
                      style={{ animation: 'dotFade 0.4s ease-out 2.3s both' }}>+84%</text>
                    <text x="500" y="120" fill="#64748b" fontSize="10"
                      style={{ animation: 'dotFade 0.4s ease-out 2.8s both' }}>+60%</text>

                    {/* X-axis labels */}
                    {[
                      { x: 40,  label: "Jan'22" },
                      { x: 160, label: "Jan'23" },
                      { x: 280, label: "Jan'24" },
                      { x: 410, label: "Jan'25" },
                    ].map(({ x, label }) => (
                      <text key={label} x={x} y="222" fill="#334155" fontSize="10" textAnchor="middle">{label}</text>
                    ))}
                  </svg>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '22px', height: '2.5px', background: '#f59e0b', borderRadius: '2px' }} />
                    <span style={{ color: '#94a3b8' }}>Your Portfolio</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '22px', height: '2px', background: '#475569', borderRadius: '2px' }} />
                    <span style={{ color: '#64748b' }}>Nifty 50</span>
                  </div>
                </div>

                {/* Insight strip */}
                <div style={{
                  marginTop: '16px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px', color: '#10b981', textAlign: 'center',
                  fontWeight: 600,
                }}>
                  ✦ You beat Nifty 50 by +24.2% over 3 years
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ WHY OTHER CALCULATORS FAIL ═══════════════ */}
      <section style={{ background: '#131f35', padding: '5rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-custom">
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Why Other Calculators Show Inflated Returns
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1.05rem', marginBottom: '3.5rem', maxWidth: '580px', margin: '0 auto 3.5rem' }}>
            Traditional tools only look at what you bought — not what you actually paid. Your ledger captures every rupee.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">

            {/* Traditional */}
            <div style={{ ...glass, padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#ef4444' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                  </svg>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#e2e8f0' }}>Traditional Calculators</h3>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Brokerage, STT & taxes not included',
                  'Idle cash in broker account ignored',
                  'Returns can be 2–3% higher than reality',
                  'Breaks with multiple deposits & withdrawals',
                  'No multi-account or multi-broker support',
                  'No benchmark to judge performance',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    <span style={{ color: '#64748b', fontSize: '0.95rem' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* XIRR Ledger */}
            <div style={{
              ...glass,
              padding: '32px',
              border: '1px solid rgba(245,158,11,0.2)',
              boxShadow: '0 0 40px rgba(245,158,11,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(245,158,11,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b' }}>XIRR Ledger</h3>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Every charge auto-captured from your ledger',
                  'Idle cash & timing factored in from day one',
                  'True returns after all costs — no surprises',
                  'Handles deposits, withdrawals & dividends',
                  'Multi-account & multi-broker support',
                  'Compare your returns vs Nifty 50',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0, marginTop: '2px' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section style={{ background: '#0f172a', padding: '5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container-custom">
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Three Steps to Your True Returns
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1.05rem', marginBottom: '3.5rem' }}>
            No spreadsheets. No manual entry. Just your broker file.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto" style={{ position: 'relative' }}>
            {[
              {
                step: '01',
                icon: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>,
                title: 'Upload Ledger',
                desc: 'Drag & drop your Zerodha CSV or Groww PDF ledger. We auto-detect the broker — no manual setup needed.',
              },
              {
                step: '02',
                icon: <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>,
                title: 'Get Your XIRR',
                desc: 'Our engine processes every transaction — charges, idle cash, dividends — and calculates precise annualised returns.',
              },
              {
                step: '03',
                icon: <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>,
                title: 'Download Report',
                desc: 'Get a professional PDF report with XIRR, Nifty 50 comparison, and portfolio timeline emailed directly to you.',
              },
            ].map(({ step, icon, title, desc }, i) => (
              <div key={i} style={{ ...glass, padding: '28px', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: '24px', right: '24px',
                  fontSize: '3rem', fontWeight: 900, color: 'rgba(245,158,11,0.25)',
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>
                  {step}
                </div>
                <div style={{
                  width: '44px', height: '44px',
                  background: 'rgba(245,158,11,0.12)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <svg style={{ width: '22px', height: '22px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#e2e8f0', marginBottom: '8px' }}>{title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/how-it-works" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: '#f59e0b', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
            }}>
              See detailed guide
              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES GRID ═══════════════════ */}
      <section style={{ background: '#131f35', padding: '5rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-custom">
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Powerful Features for Serious Investors
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1.05rem', marginBottom: '3.5rem' }}>
            Everything you need to accurately track portfolio performance
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>,
                title: 'Upload Ledger Files',
                desc: 'Simply upload your broker ledger files (CSV or PDF). No manual transaction entry required.',
              },
              {
                icon: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>,
                title: 'Multi-Broker Support',
                desc: 'Works with Zerodha and Groww. Combine accounts from different brokers for consolidated analysis.',
              },
              {
                icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>,
                title: 'Multi-Account Analysis',
                desc: 'Analyze multiple accounts simultaneously with individual and combined portfolio XIRR.',
              },
              {
                icon: <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>,
                title: 'Nifty 50 Benchmark',
                desc: "Compare your portfolio against Nifty 50 to see if you're beating the market — with exact numbers.",
              },
              {
                icon: <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>,
                title: 'PDF Reports',
                desc: 'Generate professional PDF reports with all metrics — perfect for tax filing or your financial advisor.',
              },
              {
                icon: <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>,
                title: '100% Private & Secure',
                desc: 'Files processed on secure servers, deleted within 24 hours. No registration or account needed.',
              },
            ].map(({ icon, title, desc }, i) => (
              <div key={i} className="feature-card" style={{ ...glass, padding: '24px' }}>
                <div style={{
                  width: '42px', height: '42px',
                  background: 'rgba(245,158,11,0.1)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '14px',
                }}>
                  <svg style={{ width: '20px', height: '20px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e8f0', marginBottom: '6px' }}>{title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/features" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              color: '#f59e0b', padding: '10px 24px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            }}>
              View All Features
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SAMPLE REPORT ═══════════════════ */}
      <section style={{ background: '#0f172a', padding: '4rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container-custom">
          <div style={{
            ...glass,
            maxWidth: '700px',
            margin: '0 auto',
            padding: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: '56px', height: '56px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg style={{ width: '28px', height: '28px', color: '#ef4444' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#ffffff', marginBottom: '6px' }}>See a Sample Report</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Download a sample PDF to see exactly what analysis and metrics you get — before you try it.
              </p>
            </div>
            <a
              href="/sample_report.pdf"
              download="XIRR_Sample_Report.pdf"
              style={{
                background: '#ef4444', color: '#ffffff',
                padding: '11px 22px', borderRadius: '8px',
                fontWeight: 600, fontSize: '0.9rem',
                textDecoration: 'none', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                flexShrink: 0,
              }}
            >
              <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Sample PDF
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1a0a 0%, #1c1500 40%, #0f172a 100%)',
        borderTop: '1px solid rgba(245,158,11,0.15)',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 60%)',
        }} />
        <div className="container-custom relative" style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '100px', padding: '4px 14px',
            fontSize: '12px', fontWeight: 600, color: '#f59e0b',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            ✦ Free · No registration · Private
          </div>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 800, color: '#ffffff',
            marginBottom: '1rem', letterSpacing: '-0.02em',
          }}>
            Ready to See Your Real Returns?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
            Upload your ledger and get precise XIRR in minutes.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/calculator" style={{
              background: '#f59e0b', color: '#0a1020',
              padding: '14px 32px', borderRadius: '10px',
              fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
              Launch Calculator Now
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/contact" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', padding: '14px 32px', borderRadius: '10px',
              fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
            }}>
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
