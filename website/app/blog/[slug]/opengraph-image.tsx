import { ImageResponse } from 'next/og';
import { getPostBySlug, getAllPosts } from '@/lib/blog';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const portfolioPoints = '40,195 80,204 120,180 160,190 200,162 240,149 280,160 320,122 360,108 400,116 450,76 490,42';
const niftyPoints     = '40,195 80,198 120,185 160,195 200,176 240,171 280,183 320,167 360,154 400,159 450,140 490,116';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const title = post?.title ?? 'XIRR Ledger Blog';
  const fontSize = title.length > 65 ? '52px' : title.length > 45 ? '62px' : '72px';

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: '#0f172a',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {/* ── Full-screen chart background ── */}
      <svg
        width="1200"
        height="630"
        viewBox="0 30 530 175"
        style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px' }}
      >
        <line x1="0" y1="80"  x2="530" y2="80"  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="120" x2="530" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="160" x2="530" y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="200" x2="530" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        <polyline
          points={niftyPoints}
          fill="none"
          stroke="rgba(129,140,248,0.65)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={portfolioPoints}
          fill="none"
          stroke="rgba(245,158,11,0.75)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Centered text on frosted panel ── */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        background: 'rgba(15,23,42,0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '28px',
        padding: '52px 88px',
      }}>
        {/* Badge */}
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: '100px',
          padding: '7px 20px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#f59e0b',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '28px',
          display: 'flex',
        }}>
          XIRR LEDGER · BLOG
        </div>

        {/* Post title */}
        <div style={{
          fontSize,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          marginBottom: '36px',
          display: 'flex',
          textAlign: 'center',
        }}>
          {title}
        </div>

        {/* URL */}
        <div style={{ fontSize: '20px', color: '#f59e0b', fontWeight: 600, display: 'flex' }}>
          xirrledger.com
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
