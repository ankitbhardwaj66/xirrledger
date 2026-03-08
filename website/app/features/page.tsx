import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — XIRR Ledger | Ledger-Based XIRR Calculator',
  description: 'Explore XIRR Ledger features: ledger-based calculation, multi-broker support (Zerodha, Groww, Fyers), Nifty 50 benchmark, multi-account analysis, and professional PDF reports.',
  keywords: ['XIRR calculator features', 'ledger based XIRR', 'multi-broker XIRR', 'Nifty 50 benchmark', 'portfolio PDF report', 'Zerodha Groww XIRR'],
  openGraph: {
    title: 'Features — XIRR Ledger | Ledger-Based XIRR Calculator',
    description: 'Ledger-based XIRR calculation, multi-broker support, Nifty 50 benchmark, and professional PDF reports — all in one free tool.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/features/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/features/',
  },
};

import {
  FaFileAlt, FaExchangeAlt, FaUsers, FaChartLine,
  FaFilePdf, FaChartBar, FaShieldAlt, FaMagic, FaLock,
  FaPlus, FaChartPie, FaLayerGroup, FaTachometerAlt, FaHistory, FaPercent,
} from 'react-icons/fa';

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

const currentFeatures = [
  {
    icon: <FaFileAlt size={24} color={GOLD} />,
    title: 'Ledger-Based Calculation',
    description: 'The only calculator that works directly with your broker ledger files. Upload CSV or PDF files for 100% accurate XIRR calculations without manual data entry.',
    badge: 'Core Feature',
  },
  {
    icon: <FaExchangeAlt size={24} color={GOLD} />,
    title: 'Multi-Broker Support',
    description: 'Currently supports Zerodha (CSV) and Groww (PDF). Combine ledgers from different brokers for consolidated portfolio analysis.',
    badge: 'Popular',
  },
  {
    icon: <FaUsers size={24} color={GOLD} />,
    title: 'Multi-Account Analysis',
    description: 'Manage multiple trading accounts effortlessly. Get individual XIRR for each account plus combined portfolio metrics in one comprehensive report.',
  },
  {
    icon: <FaChartLine size={24} color={GOLD} />,
    title: 'Nifty 50 Benchmark',
    description: 'Automatically compare your portfolio performance against Nifty 50 index. See if you\'re beating the market with detailed comparison metrics.',
    badge: 'Essential',
  },
  {
    icon: <FaFilePdf size={24} color={GOLD} />,
    title: 'PDF Report Generation',
    description: 'Download professional PDF reports with all metrics, perfect for tax filing, financial advisors, or personal record keeping.',
  },
  {
    icon: <FaChartBar size={24} color={GOLD} />,
    title: 'Comprehensive Metrics',
    description: 'Track total invested, withdrawn, current value, net gain/loss, simple returns, annualized XIRR, and investment period — all in one place.',
  },
  {
    icon: <FaShieldAlt size={24} color={GOLD} />,
    title: 'Privacy & Security',
    description: 'Your financial data is never stored on our servers. Reports are auto-deleted 15 minutes after creation. No registration required.',
  },
  {
    icon: <FaMagic size={24} color={GOLD} />,
    title: 'Automatic Transaction Detection',
    description: 'Smart parsing of your ledger files automatically identifies deposits, withdrawals, payouts, and quarterly settlements.',
  },
  {
    icon: <FaLock size={24} color={GOLD} />,
    title: 'Password-Protected PDFs',
    description: 'Support for password-protected Groww PDFs. Securely process encrypted files with your PAN number as password.',
  },
];

const roadmapFeatures = [
  { icon: <FaPlus size={18} color={GOLD} />, title: 'More Brokers', description: 'Adding support for Angel One, Upstox, ICICI Direct, and other popular Indian brokers.' },
  { icon: <FaChartPie size={18} color={GOLD} />, title: 'More Indexes', description: 'Compare against Sensex, Midcap 150, Smallcap 250, and sector-specific indexes.' },
  { icon: <FaLayerGroup size={18} color={GOLD} />, title: 'Sector Analysis', description: 'Detailed breakdown of returns by sectors to understand which areas of your portfolio are performing best.' },
  { icon: <FaTachometerAlt size={18} color={GOLD} />, title: 'Risk Metrics', description: 'Advanced risk analysis including Sharpe ratio, max drawdown, volatility, and more.' },
  { icon: <FaHistory size={18} color={GOLD} />, title: 'Historical Tracking', description: 'Track your XIRR over time and visualize performance trends with interactive charts.' },
  { icon: <FaPercent size={18} color={GOLD} />, title: 'Tax Optimizer', description: 'Smart suggestions for tax-loss harvesting and capital gains optimization.' },
];

export default function Features() {
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
            ✦ Built for Accuracy
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Comprehensive Features
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need for accurate portfolio analysis and performance tracking.
          </p>
        </div>

        {/* ── Current Features ── */}
        <section style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.01em' }}>
            Current Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentFeatures.map((feature, i) => (
              <div key={i} style={{ ...glass, padding: '24px', transition: 'border-color 0.2s' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  {feature.icon}
                </div>
                {feature.badge && (
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981', fontSize: '11px', fontWeight: 600,
                    padding: '3px 10px', borderRadius: '100px', marginBottom: '10px',
                    letterSpacing: '0.03em',
                  }}>
                    {feature.badge}
                  </span>
                )}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Roadmap ── */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 100%)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: '20px', padding: '48px 36px',
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Coming Soon
          </h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
            We&apos;re constantly improving. Here&apos;s what&apos;s next:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {roadmapFeatures.map((feature, i) => (
              <div key={i} style={{ ...glass, padding: '20px 22px', borderColor: 'rgba(245,158,11,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {feature.icon}
                  </div>
                  <span style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    color: GOLD, fontSize: '11px', fontWeight: 600,
                    padding: '2px 9px', borderRadius: '100px', letterSpacing: '0.03em',
                  }}>
                    Soon
                  </span>
                </div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.65, margin: 0 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
