'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: '#0a1020', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="container-custom" style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px',
                background: 'rgba(245,158,11,0.15)',
                borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg style={{ width: '16px', height: '16px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}>XIRR Ledger</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.7 }}>
              The only ledger-based XIRR calculator for accurate portfolio returns. Built by investors, for investors.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="mailto:contact@xirrledger.com"
                style={{
                  width: '36px', height: '36px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.2s',
                }}
                title="Email"
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <svg style={{ width: '16px', height: '16px', color: '#64748b' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/916239618150"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '36px', height: '36px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.2s',
                }}
                title="WhatsApp"
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <svg style={{ width: '16px', height: '16px', color: '#64748b' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Quick Links</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/', label: 'Home' },
                { href: '/features', label: 'Features' },
                { href: '/how-it-works', label: 'How It Works' },
                { href: '/faq', label: 'FAQ' },
                { href: '/about', label: 'About' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Resources</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/calculator', label: 'Launch Calculator' },
                { href: '/blog', label: 'Blog' },
                { href: '/faq#what-is-xirr', label: 'What is XIRR?' },
                { href: '/how-it-works#zerodha', label: 'Zerodha Guide' },
                { href: '/how-it-works#groww', label: 'Groww Guide' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coming Soon */}
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Coming Soon</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Angel One Support', 'Upstox Integration', 'Sensex Comparison', 'Sector Analysis', 'Risk Metrics'].map(item => (
                <li key={item} style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#475569', fontSize: '10px' }}>●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <p style={{ color: '#3d4f66', fontSize: '0.78rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
            Results provided by XIRR Ledger are for informational purposes only and do not constitute financial, investment, or legal advice. Past returns do not indicate future performance.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            © {currentYear} XIRR Ledger by{' '}
            <a href="https://ankitbhardwaj.in" target="_blank" rel="noopener noreferrer"
              style={{ color: '#94a3b8', textDecoration: 'underline', textDecorationColor: 'rgba(148,163,184,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.textDecorationColor = 'rgba(245,158,11,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.textDecorationColor = 'rgba(148,163,184,0.4)'; }}
            >
              Ankit Bhardwaj
            </a>
            . All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/privacy-policy" style={{ color: '#475569', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" style={{ color: '#475569', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
