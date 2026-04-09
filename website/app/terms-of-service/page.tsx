import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — XIRR Ledger',
  description: 'Terms of Service for XIRR Ledger. By using our XIRR calculator, you agree to these terms. Results are for informational purposes only and not investment advice.',
  alternates: {
    canonical: 'https://xirrledger.com/terms-of-service/',
  },
  robots: { index: true, follow: true },
};

const NAVY = '#0f172a';
const GOLD = '#f59e0b';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

const section = {
  marginBottom: '2.5rem',
} as const;

const h2Style = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: '12px',
  letterSpacing: '-0.01em',
} as const;

const pStyle = {
  color: '#94a3b8',
  fontSize: '0.95rem',
  lineHeight: 1.8,
  marginBottom: '12px',
} as const;

const liStyle = {
  color: '#94a3b8',
  fontSize: '0.95rem',
  lineHeight: 1.8,
  marginBottom: '6px',
  paddingLeft: '4px',
} as const;

export default function TermsOfService() {
  return (
    <div style={{ background: NAVY, minHeight: '100vh', paddingTop: '5rem', paddingBottom: '6rem' }}>
      <div className="container-custom" style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '100px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 600, color: GOLD,
            letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            Legal
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Terms of Service
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Last updated: April 9, 2026
          </p>
        </div>

        {/* Content */}
        <div style={{ ...glass, padding: '40px' }}>

          <div style={section}>
            <p style={pStyle}>
              These Terms of Service (&quot;Terms&quot;) govern your use of XIRR Ledger, a portfolio returns calculator operated by Ankit Bhardwaj (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), accessible at xirrledger.com.
            </p>
            <p style={pStyle}>
              By accessing or using XIRR Ledger, you agree to be bound by these Terms. If you do not agree, do not use the service.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>1. Description of Service</h2>
            <p style={pStyle}>
              XIRR Ledger is a free online tool that calculates the Extended Internal Rate of Return (XIRR) of your investment portfolio by analysing broker ledger files you upload. The tool supports ledger exports from Zerodha, Groww, and Fyers. Results include your portfolio XIRR and a Nifty 50 benchmark comparison.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>2. Not Investment Advice</h2>
            <p style={{ ...pStyle, color: '#cbd5e1', fontWeight: 500 }}>
              XIRR Ledger provides portfolio performance calculations for informational purposes only. Nothing on this website constitutes financial, investment, tax, or legal advice. Past returns calculated by this tool do not indicate future performance.
            </p>
            <p style={pStyle}>
              You should consult a qualified financial advisor before making any investment decisions. We are not a SEBI-registered investment advisor.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>3. Your Responsibilities</h2>
            <p style={pStyle}>By using XIRR Ledger, you agree to:</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {[
                'Upload only your own broker ledger files. Do not upload files belonging to another person without their explicit consent.',
                'Provide accurate information when signing in or requesting a report.',
                'Use the service for lawful purposes only.',
                'Not attempt to reverse-engineer, scrape, or exploit any part of the service.',
                'Not upload files containing malicious code or content.',
              ].map((item, i) => (
                <li key={i} style={liStyle}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={section}>
            <h2 style={h2Style}>4. Accuracy of Results</h2>
            <p style={pStyle}>
              XIRR Ledger calculates returns based on the cash flows present in the ledger file you provide. The accuracy of your results depends on the completeness and correctness of the uploaded file. We are not responsible for errors arising from incomplete, corrupted, or incorrectly formatted ledger files.
            </p>
            <p style={pStyle}>
              Charge rates (STT, exchange fees, etc.) used in calculations reflect publicly known rates at the time of development and may not reflect recent regulatory changes. Always verify significant figures with your broker.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>5. Intellectual Property</h2>
            <p style={pStyle}>
              All content on xirrledger.com — including the software, design, text, and reports generated by the tool — is the intellectual property of Ankit Bhardwaj unless stated otherwise. You may not reproduce, distribute, or create derivative works from any part of this service without prior written permission.
            </p>
            <p style={pStyle}>
              The PDF reports generated for your portfolio are yours to use for personal purposes.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>6. Disclaimer of Warranties</h2>
            <p style={pStyle}>
              XIRR Ledger is provided &quot;as is&quot; without warranty of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses. We make no guarantees about the accuracy, completeness, or timeliness of the results.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>7. Limitation of Liability</h2>
            <p style={pStyle}>
              To the fullest extent permitted by applicable law, Ankit Bhardwaj and XIRR Ledger shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, this service — including but not limited to investment decisions made based on the results.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>8. Privacy</h2>
            <p style={pStyle}>
              Your use of XIRR Ledger is also governed by our{' '}
              <a href="/privacy-policy/" style={{ color: GOLD, textDecoration: 'underline' }}>Privacy Policy</a>,
              which is incorporated into these Terms by reference.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>9. Modifications to the Service</h2>
            <p style={pStyle}>
              We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice. We may also update these Terms — the &quot;Last updated&quot; date at the top of this page will reflect any changes. Continued use after changes constitutes acceptance of the revised Terms.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>10. Governing Law</h2>
            <p style={pStyle}>
              These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of XIRR Ledger shall be subject to the exclusive jurisdiction of the courts of India.
            </p>
          </div>

          <div style={{ ...section, marginBottom: 0 }}>
            <h2 style={h2Style}>11. Contact</h2>
            <p style={pStyle}>
              For questions about these Terms, contact us at:<br />
              <a href="mailto:contact@xirrledger.com" style={{ color: GOLD }}>contact@xirrledger.com</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
