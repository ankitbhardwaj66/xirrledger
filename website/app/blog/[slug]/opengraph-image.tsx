import { ImageResponse } from 'next/og';
import { getPostBySlug, getAllPosts } from '@/lib/blog';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const title = post?.title ?? 'XIRR Ledger Blog';
  const fontSize = title.length > 65 ? '42px' : title.length > 45 ? '50px' : '58px';

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 90px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Gold accent bar */}
      <div style={{ width: '56px', height: '4px', background: '#f59e0b', borderRadius: '2px', marginBottom: '36px', display: 'flex' }} />

      {/* Badge */}
      <div style={{
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '100px',
        padding: '7px 18px',
        fontSize: '13px',
        fontWeight: 700,
        color: '#f59e0b',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '32px',
        display: 'flex',
      }}>
        XIRR LEDGER · BLOG
      </div>

      {/* Post title */}
      <div style={{
        fontSize,
        fontWeight: 800,
        color: '#ffffff',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        marginBottom: '60px',
        maxWidth: '1000px',
        display: 'flex',
      }}>
        {title}
      </div>

      {/* URL */}
      <div style={{ fontSize: '18px', color: '#f59e0b', fontWeight: 600, display: 'flex' }}>
        xirrledger.com
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
