import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — XIRR Ledger',
  description: 'XIRR Ledger was built by Ankit Bhardwaj, a developer and retail equity investor who got tired of brokers showing inflated XIRR numbers that ignored charges and idle cash.',
  alternates: {
    canonical: 'https://xirrledger.com/about/',
  },
};

const NAVY = '#0f172a';
const GOLD = '#f59e0b';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

export default function About() {
  return (
    <div style={{ background: NAVY, minHeight: '100vh', paddingTop: '5rem', paddingBottom: '6rem' }}>
      <div className="container-custom" style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '100px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 600, color: GOLD,
            letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            The Story
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            About XIRR Ledger
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.7 }}>
            Built by a developer who wanted to know his real returns.
          </p>
        </div>

        {/* Origin story */}
        <div style={{ ...glass, padding: '40px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Why I Built This</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.97rem', lineHeight: 1.85, marginBottom: '16px' }}>
            I&apos;ve been investing in Indian equities through Zerodha for a few years. Every time I opened the dashboard and looked for my XIRR, I saw the same thing — a dash. Not a number. Not an error. Just a dash, as if the field didn&apos;t apply to me.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.97rem', lineHeight: 1.85, marginBottom: '16px' }}>
            It turns out Zerodha&apos;s XIRR has been broken for years. They know. Their community forum has threads about it going back years. The feature simply doesn&apos;t work for most accounts.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.97rem', lineHeight: 1.85, marginBottom: '16px' }}>
            So I calculated it myself — from the actual ledger — including every fund transfer, every STT deduction, every DP charge, and every day my money sat idle before I deployed it. That number told a very different story than the one I&apos;d been assuming.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.97rem', lineHeight: 1.85 }}>
            I wanted one honest number — one I could trust. So I built the tool to calculate it from the ledger, the way it should be done.
          </p>
        </div>

        {/* Who I am */}
        <div style={{ ...glass, padding: '40px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', fontWeight: 800, color: GOLD,
            }}>
              A
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>Ankit Bhardwaj</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '14px' }}>Developer · Retail investor · Creator of XIRR Ledger</p>
              <p style={{ color: '#94a3b8', fontSize: '0.93rem', lineHeight: 1.8, marginBottom: '14px' }}>
                I&apos;m a software engineer who invests in Indian equities. I built XIRR Ledger as a side project to solve a problem I had — and kept improving it because the problem turned out to be common.
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.93rem', lineHeight: 1.8 }}>
                The tool is free because the calculation shouldn&apos;t cost you anything. If it helps you understand your real returns, that&apos;s enough.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                <a href="https://ankitbhardwaj.in" target="_blank" rel="noopener noreferrer" style={{
                  color: GOLD, fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  padding: '7px 14px', borderRadius: '8px',
                }}>
                  Personal site →
                </a>
                <a href="mailto:contact@xirrledger.com" style={{
                  color: '#94a3b8', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                  padding: '7px 14px', borderRadius: '8px',
                }}>
                  contact@xirrledger.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* What the tool does */}
        <div style={{ ...glass, padding: '40px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>What XIRR Ledger Does Differently</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                title: 'Reads your actual ledger',
                body: 'Not trade history. Not stock prices. The raw cash ledger — where every rupee in and out is already recorded with exact dates, including all charges.',
              },
              {
                title: 'Counts idle cash',
                body: 'Money transferred to your broker but not yet invested is a real cost. We start the clock from the fund transfer date, not the trade date.',
              },
              {
                title: 'Includes every charge',
                body: 'STT, DP charges, brokerage, GST, SEBI fees, stamp duty — all are already reflected in your ledger balance. No manual adjustment needed.',
              },
              {
                title: 'Combines all your accounts',
                body: 'Upload files from Zerodha, Groww, and Fyers in one session. Get individual XIRR per account and a single combined number.',
              },
              {
                title: 'Benchmarks against Nifty 50 fairly',
                body: 'The Nifty comparison uses the exact same cash flows and dates as your actual investments — same money, same timing, different asset.',
              },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: GOLD, flexShrink: 0, marginTop: '7px',
                }} />
                <div>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>{item.title} — </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.93rem', lineHeight: 1.75 }}>{item.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '20px' }}>
            The tool is free. No subscription, no credit card.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/calculator" style={{
              background: GOLD, color: '#0a1020',
              padding: '12px 26px', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
            }}>
              Calculate Your XIRR Free
            </Link>
            <Link href="/contact" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#94a3b8', padding: '12px 26px', borderRadius: '10px',
              fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
            }}>
              Get in Touch
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
