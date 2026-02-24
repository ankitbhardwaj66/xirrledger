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
    title: 'Download Your Ledger',
    description: 'Export your trading ledger from your broker\'s website. For Zerodha, download the CSV from Funds → View Statement. For Groww, download PDF statements for each year. For Fyers, go to Reports → Ledger and download one CSV per financial year.',
    note: 'Tip: Select the full date range — from your first investment till today — for accurate results.',
  },
  {
    icon: <FaUpload size={22} color={GOLD} />,
    title: 'Upload Files',
    description: 'Upload your ledger files to the calculator. You can upload multiple files at once — from the same broker or different brokers. Files from the same account (PAN) are automatically combined.',
    note: 'Your files are processed securely and never stored on our servers.',
  },
  {
    icon: <FaWallet size={22} color={GOLD} />,
    title: 'Enter Current Values',
    description: 'Enter the current market value of your holdings as of today — not what you originally invested. Also enter available cash in the account. Separate fields appear for each account.',
    note: 'Find today\'s holdings value on your broker\'s app under Portfolio or Positions. Do not enter the amount you invested.',
  },
  {
    icon: <FaChartLine size={22} color={GOLD} />,
    title: 'Get Your XIRR',
    description: 'View detailed analysis with XIRR calculation, Nifty 50 benchmark comparison, and all key metrics. Download a professional PDF report for your records or tax filing.',
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
                    <FaFileCsv size={13} color='#64748b' />
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>CSV Format</p>
                  </div>
                </div>
              </div>

              {[
                <>Log in to <a href="https://console.zerodha.com/" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Zerodha Console</a></>,
                <>Go to <strong style={{ color: '#e2e8f0' }}>Funds → View Statement</strong></>,
                <>Select <strong style={{ color: '#e2e8f0' }}>All Segments</strong> as category</>,
                <>Set date range <strong style={{ color: '#e2e8f0' }}>(first investment till today)</strong></>,
                <>Click the <strong style={{ color: '#e2e8f0' }}>blue arrow →</strong> then click the <strong style={{ color: '#e2e8f0' }}>CSV</strong> link</>,
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 4 ? '14px' : 0 }}>
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
                  <FaCheckCircle size={13} color='#10b981' /> File type: CSV
                </p>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCheckCircle size={13} color='#10b981' /> Password: Not required
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
                <>Log in to <strong style={{ color: '#e2e8f0' }}>Fyers</strong></>,
                <>Go to <strong style={{ color: '#e2e8f0' }}>Reports → Ledger</strong></>,
                <>Select the <strong style={{ color: '#e2e8f0' }}>Financial Year</strong></>,
                <>Click <strong style={{ color: '#e2e8f0' }}>Generate</strong></>,
                <>Click <strong style={{ color: '#e2e8f0' }}>Download CSV</strong></>,
                <><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from first investment till today</>,
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 5 ? '14px' : 0 }}>
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
                  <FaCheckCircle size={13} color='#10b981' /> Password: Not required
                </p>
                <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaExclamationTriangle size={13} color={GOLD} /> Download one CSV per year for the full period
                </p>
              </div>
            </div>

            {/* Groww — spans full width to fit 2 methods */}
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
                    <FaFilePdf size={13} color='#64748b' />
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>PDF Format · Password: your PAN (uppercase)</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                {/* Method 1 */}
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>Method 1</span>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.3)' }}>RECOMMENDED</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>— Groww Balance Statement</span>
                  </div>
                  {[
                    <>Log in to <a href="https://groww.in/" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>Groww</a></>,
                    <>Click your <strong style={{ color: '#e2e8f0' }}>profile icon</strong> (top right)</>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>Reports</strong></>,
                    <>Scroll to <strong style={{ color: '#e2e8f0' }}>Transactions → Groww Balance Statement</strong></>,
                    <>Choose format: select <strong style={{ color: '#e2e8f0' }}>PDF</strong> (not Excel)</>,
                    <>Set date range → click <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 5 ? '14px' : 0 }}>
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
                      <FaCheckCircle size={13} color='#10b981' /> All transactions in one file
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <FaExclamationTriangle size={13} color={GOLD} style={{ marginTop: 2, flexShrink: 0 }} /> As of Feb 2026, only available from 1 Apr 2023 in-app. For earlier history, contact Groww support via chat or email.
                    </p>
                  </div>
                </div>

                {/* Method 2 */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Method 2</span>
                    <span style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>ALTERNATIVE</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>— Annual Statements</span>
                  </div>
                  {[
                    <>Log in to <a href="https://groww.in/" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>Groww</a></>,
                    <>Click your <strong style={{ color: '#e2e8f0' }}>profile icon</strong> (top right corner)</>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>Stocks, F&amp;O balance</strong></>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>All Transactions</strong></>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>Download statement</strong> button (top right)</>,
                    <>Select date range (max 1 year) → click <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                    <><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from first investment till today</>,
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 6 ? '14px' : 0 }}>
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
                    <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaExclamationTriangle size={13} color={GOLD} /> Download one PDF per year — repeat for each year separately
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
          <Link href="/calculator" style={{
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
