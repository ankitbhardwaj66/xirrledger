import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — XIRR Ledger',
  description: 'How XIRR Ledger collects, uses, and protects your data. We process broker ledger files to calculate portfolio returns and delete uploaded files after processing.',
  alternates: {
    canonical: 'https://xirrledger.com/privacy-policy/',
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

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Last updated: April 9, 2026
          </p>
        </div>

        {/* Content */}
        <div style={{ ...glass, padding: '40px' }}>

          <div style={section}>
            <p style={pStyle}>
              XIRR Ledger (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a financial portfolio analysis tool created by Ankit Bhardwaj. This Privacy Policy explains how we collect, use, store, and protect information when you use our service at xirrledger.com.
            </p>
            <p style={pStyle}>
              By using XIRR Ledger, you agree to the practices described in this policy.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>1. Information We Collect</h2>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Broker ledger files.</strong> When you upload a ledger file (CSV, PDF, or XLSX from Zerodha, Groww, or Fyers), we temporarily store it on AWS S3 to process your XIRR calculation. The file contains your transaction history, account identifiers, and financial amounts.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Email address.</strong> Sign-in is required to use XIRR Ledger. We collect and securely store your email address to deliver your PDF report after every calculation. If you sign in with email (rather than Google), we also use it to send a one-time password (OTP) for verification. We will never use your email address for marketing, promotions, or spam — only for transactional messages directly related to your use of the tool.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Google sign-in.</strong> If you choose to sign in with Google, we receive your name and email address from Google Identity Services. We do not receive or store your Google password.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Usage data.</strong> We use Google Analytics to collect anonymised usage data (pages visited, session duration, device type). This data does not identify you personally.</p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>2. How We Use Your Data</h2>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {[
                'To calculate your portfolio XIRR from the uploaded ledger file.',
                'To generate and email you a PDF report of your results.',
                'To send a one-time password (OTP) for email verification (expires in 10 minutes).',
                'To improve the tool through anonymised usage analytics.',
              ].map((item, i) => (
                <li key={i} style={liStyle}>{item}</li>
              ))}
            </ul>
            <p style={{ ...pStyle, marginTop: '12px' }}>
              We do not use your data for advertising, profiling, or any purpose beyond providing the XIRR calculation service.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>3. Data Storage and Retention</h2>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Uploaded ledger files.</strong> Your uploaded files are stored on AWS S3 (Mumbai region) solely for the duration of processing. Files are deleted from our servers after the calculation is complete.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Generated reports.</strong> PDF reports are stored on AWS S3 and are accessible via a secure, time-limited download link sent to your email. Reports are retained to allow you to re-download them.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>OTPs.</strong> One-time passwords are stored with a 10-minute expiry and deleted automatically after use or expiry.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Session data.</strong> A session token is stored in your browser&apos;s localStorage with a 7-day expiry. It is cleared when you sign out.</p>
            <p style={pStyle}><strong style={{ color: '#cbd5e1' }}>Account data.</strong> If you register an account, your email address and sign-in method are stored in a secure database hosted in India.</p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>4. Third-Party Services</h2>
            <p style={pStyle}>We use the following third-party services to operate XIRR Ledger:</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {[
                'AWS S3 and Lambda (Mumbai, ap-south-1) — file storage and computation.',
                'AWS SES — transactional email delivery (OTPs and reports).',
                'Google Analytics — anonymised usage analytics.',
                'Google Identity Services — optional Google sign-in.',
              ].map((item, i) => (
                <li key={i} style={liStyle}>{item}</li>
              ))}
            </ul>
            <p style={{ ...pStyle, marginTop: '12px' }}>
              Each of these services has its own privacy policy. We only share the minimum data necessary for each service to function.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>5. Data Security</h2>
            <p style={pStyle}>
              All data is transmitted over HTTPS. Files are stored in private AWS S3 buckets with no public access. Access to our systems is restricted and protected by IAM policies. We do not sell, rent, or share your personal data with any third party for commercial purposes.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>6. Your Rights</h2>
            <p style={pStyle}>You have the right to:</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {[
                'Request deletion of your account and associated data.',
                'Request a copy of the data we hold about you.',
                'Withdraw consent for email communications at any time.',
              ].map((item, i) => (
                <li key={i} style={liStyle}>{item}</li>
              ))}
            </ul>
            <p style={{ ...pStyle, marginTop: '12px' }}>
              To exercise any of these rights, email us at <a href="mailto:contact@xirrledger.com" style={{ color: GOLD }}>contact@xirrledger.com</a>.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>7. Cookies</h2>
            <p style={pStyle}>
              XIRR Ledger does not use tracking cookies. Google Analytics uses anonymised cookies to measure usage. Your browser session is stored in localStorage, not cookies.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>8. Children&apos;s Privacy</h2>
            <p style={pStyle}>
              XIRR Ledger is not intended for users under the age of 18. We do not knowingly collect personal data from minors.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2Style}>9. Changes to This Policy</h2>
            <p style={pStyle}>
              We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision. Continued use of XIRR Ledger after any changes constitutes your acceptance of the updated policy.
            </p>
          </div>

          <div style={{ ...section, marginBottom: 0 }}>
            <h2 style={h2Style}>10. Contact</h2>
            <p style={pStyle}>
              If you have questions about this Privacy Policy or how we handle your data, contact us at:<br />
              <a href="mailto:contact@xirrledger.com" style={{ color: GOLD }}>contact@xirrledger.com</a><br />
              XIRR Ledger, India
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
