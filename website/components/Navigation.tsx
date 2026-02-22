'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav style={{
      background: '#0a1020',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'rgba(245,158,11,0.15)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg style={{ width: '18px', height: '18px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b', letterSpacing: '-0.01em' }}>
              XIRR Ledger
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center" style={{ gap: '2rem' }}>
            {[
              { href: '/', label: 'Home' },
              { href: '/features', label: 'Features' },
              { href: '/how-it-works', label: 'How It Works' },
              { href: '/blog', label: 'Blog' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} style={{
                  color: active ? '#f59e0b' : '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                  transition: 'color 0.2s',
                  position: 'relative',
                  paddingBottom: '2px',
                  borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
                >
                  {label}
                </Link>
              );
            })}
            <a
              href="/calculator"
              style={{
                background: '#f59e0b',
                color: '#0a1020',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fbbf24')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f59e0b')}
            >
              Launch Calculator
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            className="md:hidden"
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div style={{
            padding: '12px 0 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
            className="md:hidden"
          >
            {[
              { href: '/', label: 'Home' },
              { href: '/features', label: 'Features' },
              { href: '/how-it-works', label: 'How It Works' },
              { href: '/blog', label: 'Blog' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setIsOpen(false)} style={{
                  color: active ? '#f59e0b' : '#94a3b8',
                  textDecoration: 'none',
                  padding: '8px 0',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.95rem',
                  borderLeft: active ? '3px solid #f59e0b' : '3px solid transparent',
                  paddingLeft: '10px',
                }}>
                  {label}
                </Link>
              );
            })}
            <a
              href="/calculator"
              onClick={() => setIsOpen(false)}
              style={{
                marginTop: '8px',
                background: '#f59e0b',
                color: '#0a1020',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Launch Calculator
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
