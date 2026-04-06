import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaCheckCircle, FaUpload, FaWallet, FaChartLine, FaFileAlt } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'How to Calculate XIRR — XIRR Ledger',
  description: 'Learn how to calculate XIRR from your broker ledger. XIRR accounts for every deposit, withdrawal, charge, and the exact dates — giving you the true annualized return on your investments.',
  keywords: ['how to calculate xirr', 'xirr calculation', 'xirr formula', 'calculate xirr from broker ledger', 'xirr calculator india', 'how is xirr calculated'],
  openGraph: {
    title: 'How to Calculate XIRR — XIRR Ledger',
    description: 'XIRR is the only metric that accounts for every cash flow date. Learn how it works and how XIRRLedger calculates it automatically from your broker ledger.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/how-to-calculate-xirr/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/how-to-calculate-xirr/',
  },
};

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

const steps = [
  {
    icon: <FaFileAlt size={20} color={GOLD} />,
    title: 'Every deposit is a cash outflow',
    description: 'Each time money enters your broker account — whether a fund transfer, SIP, or lump sum — it counts as money you paid. Date and amount both matter.',
    example: 'Jan 5, 2023 → −₹50,000',
  },
  {
    icon: <FaWallet size={20} color={GOLD} />,
    title: 'Every withdrawal is a cash inflow',
    description: 'When you take money out — profits, partial redemptions, dividend payouts — that is money coming back to you. XIRR records this too.',
    example: 'Aug 12, 2024 → +₹20,000',
  },
  {
    icon: <FaChartLine size={20} color={GOLD} />,
    title: 'Current portfolio value closes the loop',
    description: 'Your holdings today are treated as if you withdrew everything right now. This includes the value of all stocks/funds you hold plus any uninvested cash sitting in your broker account. Together, this is the terminal cash inflow that completes the calculation.',
    example: 'Today → +₹1,10,000 (stocks) + ₹8,500 (idle cash) = +₹1,18,500',
  },
  {
    icon: <FaUpload size={20} color={GOLD} />,
    title: 'XIRR finds the rate that makes it all balance',
    description: 'The XIRR formula iteratively finds the single annualized rate at which all your cash flows — in and out, on their exact dates — would produce exactly the outcome you got.',
    example: 'XIRR = 21.4% per year',
  },
];

const whyLedger = [
  {
    charge: 'Brokerage',
    detail: '₹0 for equity delivery; ₹20 flat per order for intraday & F&O (Zerodha)',
    impact: 'Free delivery brokerage still doesn\'t mean free trade — other charges apply',
  },
  {
    charge: 'STT (Securities Transaction Tax)',
    detail: '0.1% on buy+sell for delivery, 0.025% on intraday sell',
    impact: 'Largest charge for most investors',
  },
  {
    charge: 'Exchange Transaction Charges',
    detail: '~0.003% of turnover (NSE/BSE)',
    impact: 'Small per trade, significant over years',
  },
  {
    charge: 'GST',
    detail: '18% on brokerage + exchange charges',
    impact: 'Government tax on your transaction costs',
  },
  {
    charge: 'Stamp Duty',
    detail: '0.015% on buy value (delivery)',
    impact: 'State government levy',
  },
  {
    charge: 'SEBI Turnover Fees',
    detail: '₹10 per crore of turnover',
    impact: 'Very small but still real',
  },
];

export default function HowToCalculateXIRR() {
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
            ✦ The Right Formula
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            How to Calculate XIRR
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
            XIRR is the only formula that accounts for the exact dates and amounts of every cash flow. Here is how it works — and how XIRRLedger does it automatically from your broker ledger.
          </p>
        </div>

        {/* ── The Formula ── */}
        <div style={{ maxWidth: '760px', margin: '0 auto 4rem' }}>
          <div style={{ ...glass, padding: '32px', borderColor: 'rgba(245,158,11,0.18)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              The XIRR Formula
            </h2>
            <div style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '20px 24px', marginBottom: '16px',
              fontFamily: 'monospace', fontSize: '0.95rem', color: '#f59e0b',
            }}>
              {'∑ [ Cᵢ / (1 + XIRR)^(dᵢ/365) ] = 0'}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
              Where <span style={{ color: '#e2e8f0' }}>Cᵢ</span> is each cash flow (negative for money in, positive for money out or current value) and <span style={{ color: '#e2e8f0' }}>dᵢ</span> is the number of days from the first transaction. XIRR finds the rate that makes this sum equal zero — your true annualized return.
            </p>
          </div>

          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
            There is no shortcut formula. XIRR is solved by iteration — a computer runs hundreds of guesses until it converges. Excel has <code style={{ color: GOLD, background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '4px' }}>=XIRR()</code> built in. So does XIRRLedger.
          </p>
        </div>

        {/* ── How cash flows work ── */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.01em' }}>
            What Goes Into the Calculation
          </h2>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: i < steps.length - 1 ? '2rem' : 0, position: 'relative' }}>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', left: '27px', top: '56px',
                    width: '2px', height: 'calc(100% + 2rem - 56px)',
                    background: 'linear-gradient(to bottom, rgba(245,158,11,0.3), transparent)',
                  }} />
                )}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {step.icon}
                  </div>
                </div>
                <div style={{ ...glass, flex: 1, padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>{step.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '12px' }}>{step.description}</p>
                  <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '8px 14px' }}>
                    <code style={{ fontSize: '0.85rem', color: GOLD }}>{step.example}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Why ledger beats stock tracking ── */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '12px', letterSpacing: '-0.01em' }}>
            Why the Ledger Is More Accurate Than Tracking Stocks
          </h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: '580px', margin: '0 auto 2.5rem', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Most people try to calculate XIRR by listing their stock purchases and sales. This misses everything your broker and the government silently deduct from your account.
          </p>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ ...glass, overflow: 'hidden', borderColor: 'rgba(245,158,11,0.15)' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                padding: '12px 20px',
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charge</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact</span>
              </div>
              {whyLedger.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '14px 20px',
                  borderBottom: i < whyLedger.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <span style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 600 }}>{row.charge}</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{row.detail}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{row.impact}</span>
                </div>
              ))}
            </div>

            <div style={{ ...glass, padding: '20px 24px', marginTop: '1.5rem', borderColor: 'rgba(16,185,129,0.2)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <FaCheckCircle size={18} color='#10b981' style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                    Your broker ledger already has all of this deducted
                  </p>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
                    Every charge listed above appears as a debit in your ledger. When XIRRLedger reads your ledger, it sees the actual rupees that left your account — including every charge, tax, and fee. No manual adjustment needed. No risk of forgetting a line item.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── How XIRRLedger does it ── */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.01em' }}>
            How XIRRLedger Calculates Your XIRR
          </h2>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { n: '01', title: 'Reads your ledger', body: 'Parses your Zerodha CSV, Groww PDF, or Fyers CSV. Extracts every fund transfer in and out — with exact dates and amounts. All broker charges are already reflected in these cash flows.' },
              { n: '02', title: 'Strips out noise', body: 'Ledger files contain hundreds of rows — stock purchases, sell proceeds, dividends, charges, quarterly settlements. XIRRLedger identifies which rows are actual cash flows into/out of your account and ignores everything else.' },
              { n: '03', title: 'Adds your current value', body: 'You enter today\'s portfolio value — the combined value of all your holdings plus any cash currently sitting idle in your broker account. This becomes the terminal cash inflow, as if you liquidated everything today. This closes the XIRR calculation.' },
              { n: '04', title: 'Runs XIRR', body: 'The algorithm runs the iterative XIRR formula on your complete cash flow timeline. The result is your true annualized return — net of all charges, on exact dates.' },
              { n: '05', title: 'Benchmarks against Nifty 50', body: 'The same cash flows are used to calculate what your return would have been if you had invested identically into Nifty 50. This tells you whether your stock picks beat the index.' },
            ].map((item, i) => (
              <div key={i} style={{ ...glass, padding: '20px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: '10px', padding: '6px 12px',
                  fontSize: '0.8rem', fontWeight: 800, color: GOLD,
                  letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {item.n}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Want to do it manually? ── */}
        <div style={{ ...glass, maxWidth: '720px', margin: '0 auto 5rem', padding: '28px 32px', borderColor: 'rgba(99,102,241,0.2)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            Want to calculate it manually in Excel?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '12px' }}>
            Read our detailed guide: <Link href="/blog/how-to-calculate-xirr-excel-vs-ledger" style={{ color: GOLD, fontWeight: 600 }}>Why Excel XIRR Gets It Wrong — and How the Ledger Method Fixes It →</Link>
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Covers the full Excel method, common mistakes, and why tracking individual stocks misses ₹000s in charges.
          </p>
        </div>

        {/* ── CTA ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '20px', padding: '56px 32px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.01em' }}>
            Skip the spreadsheet
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '32px', maxWidth: '420px', margin: '0 auto 32px' }}>
            Upload your broker ledger and get your true XIRR — including all charges — in under 2 minutes.
          </p>
          <Link href="/calculator" style={{
            background: GOLD, color: '#0a1020',
            padding: '14px 32px', borderRadius: '10px',
            fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}>
            Calculate Your XIRR Free
            <FaArrowRight size={15} />
          </Link>
        </div>

      </div>
    </div>
  );
}
