import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — XIRR Ledger | 4 Simple Steps',
  description: 'Learn how XIRR Ledger calculates your portfolio returns in 4 steps: download your broker ledger, upload files, enter current holdings value, and get your XIRR with Nifty 50 comparison.',
  keywords: ['how XIRR calculator works', 'download Zerodha ledger', 'upload broker ledger', 'calculate portfolio XIRR', 'XIRR steps India'],
  openGraph: {
    title: 'How It Works — XIRR Ledger | 4 Simple Steps',
    description: 'Download your broker ledger, upload it, enter current holdings, and get accurate XIRR with Nifty 50 benchmark comparison.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/how-it-works/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/how-it-works/',
  },
};

import Link from 'next/link';
import { FaDownload, FaUpload, FaWallet, FaChartLine, FaCheckCircle, FaExclamationTriangle, FaArrowRight, FaFileCsv, FaFilePdf } from 'react-icons/fa';

const INDIGO = '#818cf8';

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

const steps = [
  {
    icon: <FaDownload size={22} color={GOLD} />,
    title: 'Download Your Statement',
    description: 'Export your statement from your broker. Zerodha: download the ledger XLSX (All Segments). Groww: download the Stocks - Order history XLSX and/or Mutual Funds - Order history XLSX. Fyers: download the ledger CSV for each financial year.',
    note: 'Tip: Select the full date range — from your first investment till today — for accurate results.',
  },
  {
    icon: <FaUpload size={22} color={GOLD} />,
    title: 'Upload Files',
    description: 'Follow the guided wizard — select your broker, choose what you trade (Stocks/F&O or Mutual Funds), and upload the right files. You can add multiple accounts from different brokers in one session for a combined XIRR.',
    note: 'Your files are processed securely and never stored permanently.',
  },
  {
    icon: <FaWallet size={22} color={GOLD} />,
    title: 'Enter Current Values',
    description: 'Enter the current market value of your holdings as of today — not what you invested. Also enter any available cash in the account. Separate fields appear for each account.',
    note: 'Find today\'s value on your broker\'s app under Portfolio or Positions. Do not enter the amount you invested.',
  },
  {
    icon: <FaChartLine size={22} color={GOLD} />,
    title: 'Get Your XIRR',
    description: 'View your annualised XIRR, Nifty 50 benchmark comparison, and a full portfolio breakdown. Download a professional PDF report. You can edit your holdings value and recalculate instantly without re-uploading.',
    note: 'PDF reports are perfect for sharing with financial advisors or CAs.',
  },
];

export default function HowItWorks() {
  return (
    <div style={{ background: NAVY, minHeight: '100vh', paddingTop: '5rem', paddingBottom: '6rem' }}>
      <div className="container-custom">

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '100px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 600, color: GOLD,
            letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            ✦ Simple & Fast
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            How It Works
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Calculate your portfolio XIRR in 4 simple steps. Takes less than 5 minutes.
          </p>
        </div>

        {/* ── Steps ── */}
        <div style={{ maxWidth: '760px', margin: '0 auto 5rem' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', marginBottom: i < steps.length - 1 ? '2.5rem' : 0, position: 'relative' }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', left: '27px', top: '56px',
                  width: '2px', height: 'calc(100% + 2.5rem - 56px)',
                  background: 'linear-gradient(to bottom, rgba(245,158,11,0.3), transparent)',
                }} />
              )}
              {/* Icon circle */}
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.icon}
                </div>
              </div>
              {/* Content */}
              <div style={{ ...glass, flex: 1, padding: '22px 24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: step.note ? '12px' : 0 }}>{step.description}</p>
                {step.note && (
                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0 }}>
                      <span style={{ color: GOLD, fontWeight: 600 }}>✦ </span>{step.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Broker Guides ── */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.01em' }}>
            Broker-Specific Guides
          </h2>

          <div className="grid md:grid-cols-2 gap-8">

            {/* Zerodha */}
            <div style={{ ...glass, padding: '28px', borderColor: 'rgba(245,158,11,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 800, color: GOLD,
                }}>Z</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Zerodha</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>XLSX Format</p>
                  </div>
                </div>
              </div>

              {([
                <><a href="https://console.zerodha.com/funds/statement?segment=equity&src=kiteweb" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700 }}>Open Zerodha Statement →</a> (logs in automatically if you&apos;re signed in)</>,
                <>Select <strong style={{ color: '#e2e8f0' }}>All Segments</strong> as category</>,
                <>Set date range — <strong style={{ color: '#e2e8f0' }}>from your first investment till today</strong></>,
                <>Click the <strong style={{ color: '#e2e8f0' }}>blue arrow →</strong> then click <strong style={{ color: '#e2e8f0' }}>XLSX</strong> to download</>,
              ] as React.ReactNode[]).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 3 ? '14px' : 0 }}>
                  <span style={{
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                    color: GOLD, width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                  }}>{i + 1}</span>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{item}</p>
                </div>
              ))}

              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheckCircle size={13} color='#10b981' /> File type: XLSX
                </p>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheckCircle size={13} color='#10b981' /> One file covers all your history
                </p>
              </div>
            </div>

            {/* Fyers */}
            <div style={{ ...glass, padding: '28px', borderColor: 'rgba(99,102,241,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 800, color: INDIGO,
                }}>F</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Fyers</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <FaFileCsv size={13} color='#64748b' />
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>CSV Format</p>
                  </div>
                </div>
              </div>

              {[
                <><a href="https://fyers.in/web/reports/ledger" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontWeight: 700 }}>Open Fyers Ledger →</a> (logs in automatically if you&apos;re signed in)</>,
                <>Select the <strong style={{ color: '#e2e8f0' }}>Financial Year</strong></>,
                <>Click <strong style={{ color: '#e2e8f0' }}>Generate</strong></>,
                <>Click <strong style={{ color: '#e2e8f0' }}>Download CSV</strong></>,
                <><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from first investment till today</>,
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 4 ? '14px' : 0 }}>
                  <span style={{
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                    color: INDIGO, width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                  }}>{i + 1}</span>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{item}</p>
                </div>
              ))}

              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheckCircle size={13} color='#10b981' /> File type: CSV
                </p>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheckCircle size={13} color='#10b981' /> One file covers all your history
                </p>
                <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaExclamationTriangle size={13} color={GOLD} /> Download one CSV per year for the full period
                </p>
              </div>
            </div>

            {/* Groww — spans full width to fit 2 sections */}
            <div style={{ ...glass, padding: '28px', borderColor: 'rgba(16,185,129,0.18)' }} className="md:col-span-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 800, color: '#10b981',
                }}>G</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Groww</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>XLSX Format</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                {/* Stocks */}
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>Stocks</span>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.3)' }}>XLSX</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>— Order History</span>
                  </div>
                  {([
                    <><a href="https://groww.in/user/profile/report" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 700 }}>Open Groww Reports →</a></>,
                    <>Scroll to <strong style={{ color: '#e2e8f0' }}>Transactions → Stocks - Order history</strong></>,
                    <>Set date range from before your first purchase to today → click <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                  ] as React.ReactNode[]).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
                      <span style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        color: '#10b981', width: '24px', height: '24px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                      }}>{i + 1}</span>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{item}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaCheckCircle size={13} color='#10b981' /> One file covers your full history
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <FaExclamationTriangle size={13} color={GOLD} style={{ marginTop: 2, flexShrink: 0 }} /> Note: brokerage charges and STT are not included in this report. XIRR will be slightly optimistic.
                    </p>
                  </div>
                </div>

                {/* Mutual Funds */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Mutual Funds</span>
                    <span style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>XLSX</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>— Order History</span>
                  </div>
                  {([
                    <><a href="https://groww.in/user/profile/report" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 700 }}>Open Groww Reports →</a></>,
                    <>Scroll to <strong style={{ color: '#e2e8f0' }}>Transactions → Mutual Funds - Order history</strong></>,
                    <>Select <strong style={{ color: '#e2e8f0' }}>Custom Date</strong>, set From to your first ever MF purchase, To today → click <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                  ] as React.ReactNode[]).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#64748b', width: '24px', height: '24px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                      }}>{i + 1}</span>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{item}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaCheckCircle size={13} color='#10b981' /> One file covers your full MF history
                    </p>
                  </div>
                </div>

              </div>
            </div>


          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '20px', padding: '56px 32px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.01em' }}>
            Ready to Get Started?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '32px' }}>
            Follow the steps above and calculate your true portfolio XIRR now.
          </p>
          <Link href="/calculator/" style={{
            background: GOLD, color: '#0a1020',
            padding: '14px 32px', borderRadius: '10px',
            fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}>
            Calculate Free
            <FaArrowRight size={15} />
          </Link>
        </div>

      </div>
    </div>
  );
}
