import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — XIRR Ledger | XIRR, Returns & Portfolio Analysis',
  description: 'Articles on XIRR calculations, comparing XIRR vs CAGR, beating Nifty 50, broker ledger tips, and how to truly measure your portfolio returns.',
  keywords: ['XIRR blog', 'portfolio returns India', 'XIRR vs CAGR', 'beating Nifty 50', 'broker ledger tips', 'investment returns blog'],
  openGraph: {
    title: 'Blog — XIRR Ledger | XIRR, Returns & Portfolio Analysis',
    description: 'Articles on XIRR, CAGR, Nifty 50 benchmarks, broker ledger tips, and measuring true portfolio returns.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/blog/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/blog/',
  },
};

import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { FaArrowRight } from 'react-icons/fa';

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

export default async function BlogPage() {
  const posts = await getAllPosts();

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
            ✦ Insights & Updates
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Blog & Updates
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Latest news, features, and tips for using XIRR Ledger
          </p>
        </div>

        {posts.length === 0 ? (
          <div style={{ ...glass, maxWidth: '520px', margin: '0 auto', padding: '56px 32px', textAlign: 'center' }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#334155', display: 'block' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No posts yet</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
              We&apos;re working on creating valuable content for you. Check back soon!
            </p>
            <Link href="/" style={{
              background: GOLD, color: '#0a1020',
              padding: '11px 24px', borderRadius: '8px',
              fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              display: 'inline-block',
            }}>
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  ...glass,
                  padding: '28px',
                  height: '100%',
                  transition: 'border-color 0.2s, transform 0.2s',
                  cursor: 'pointer',
                }}>
                  {/* Date + arrow row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <time style={{
                      fontSize: '12px', fontWeight: 600,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      color: GOLD, padding: '3px 10px', borderRadius: '100px',
                    }}>
                      {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </time>
                    <FaArrowRight size={14} color='#334155' />
                  </div>

                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px', lineHeight: 1.5 }}>
                    {post.title}
                  </h2>

                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '20px' }}>
                    {post.excerpt}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: GOLD, fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>Read Article</span>
                    <FaArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
