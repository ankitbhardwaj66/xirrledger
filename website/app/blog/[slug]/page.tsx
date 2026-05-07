import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { FaArrowLeft, FaDownload, FaArrowRight } from 'react-icons/fa';
import remarkGfm from 'remark-gfm';

const GOLD = '#f59e0b';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const url = `https://xirrledger.com/blog/${slug}/`;

  return {
    title: `${post.title} | XIRR Ledger Blog`,
    description: post.excerpt,
    authors: [{ name: 'Ankit Bhardwaj', url: 'https://ankitbhardwaj.in' }],
    keywords: post.keywords.length > 0
      ? post.keywords
      : ['XIRR calculator', 'portfolio returns', 'trading ledger', 'investment returns', 'ledger-based XIRR'],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      siteName: 'XIRR Ledger',
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.lastModified,
      authors: ['Ankit Bhardwaj'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: { canonical: url },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.lastModified,
    author: {
      '@type': 'Person',
      '@id': 'https://xirrledger.com/#author',
      name: 'Ankit Bhardwaj',
      url: 'https://ankitbhardwaj.in',
    },
    image: `https://xirrledger.com/blog/${slug}.webp`,
    publisher: { '@id': 'https://xirrledger.com/#organization' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://xirrledger.com/blog/${slug}/`,
    },
    inLanguage: 'en-IN',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://xirrledger.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://xirrledger.com/blog/' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://xirrledger.com/blog/${slug}/` },
    ],
  };

  return (
    <article style={{ background: '#0f172a', minHeight: '100vh', paddingTop: '4rem', paddingBottom: '6rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <div className="container-custom">

        {/* ── Back button ── */}
        <Link href="/blog" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          color: '#475569', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
          marginBottom: '2.5rem',
        }}>
          <FaArrowLeft size={13} /> Back to Blog
        </Link>

        {/* ── Article Header ── */}
        <header style={{ maxWidth: '760px', margin: '0 auto 3rem' }}>
          <time style={{
            display: 'inline-block',
            fontSize: '12px', fontWeight: 600,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            color: GOLD, padding: '3px 12px', borderRadius: '100px',
            marginBottom: '20px',
          }}>
            {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800,
            color: '#ffffff', lineHeight: 1.2, marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.75 }}>
              {post.excerpt}
            </p>
          )}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginTop: '2rem' }} />
        </header>

        {/* ── Article Content ── */}
        <div
          className="max-w-[760px] mx-auto prose prose-invert prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-li:text-slate-300 prose-p:text-slate-300 prose-headings:text-white prose-pre:bg-slate-800 prose-pre:text-gray-100 prose-blockquote:border-amber-500 prose-blockquote:text-slate-400 prose-table:w-full prose-thead:border-b prose-thead:border-slate-700 prose-th:text-amber-400 prose-th:font-semibold prose-th:py-2 prose-th:px-3 prose-th:text-left prose-td:py-2 prose-td:px-3 prose-td:text-slate-300 prose-tr:border-b prose-tr:border-slate-800"
        >
          <MDXRemote source={post.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ maxWidth: '760px', margin: '3rem auto 0' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#475569', fontSize: '0.75rem', lineHeight: 1.3, marginTop: '1px', flexShrink: 0 }}>ℹ</span>
            <p style={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#64748b', fontWeight: 600 }}>Disclaimer:</strong> This article is for informational purposes only and does not constitute financial, investment, tax, or legal advice. Past returns do not indicate future performance. Please consult a qualified financial advisor before making investment decisions.
            </p>
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ maxWidth: '760px', margin: '4rem auto 0' }}>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '3rem' }} />
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.03) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px', letterSpacing: '-0.01em' }}>
              Ready to Calculate Your True XIRR?
            </h2>
            <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.95rem' }}>
              Upload your ledger and get accurate returns in minutes
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/calculator/" style={{
                background: GOLD, color: '#0a1020',
                padding: '12px 26px', borderRadius: '10px',
                fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                Calculate Free <FaArrowRight size={13} />
              </Link>
              <a href="/sample_report.pdf" download="XIRR_Sample_Report.pdf" style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', padding: '12px 26px', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                <FaDownload size={13} /> Sample Report
              </a>
            </div>
          </div>
        </div>

        {/* ── Back to Blog ── */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/blog" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            color: '#94a3b8', padding: '10px 22px', borderRadius: '8px',
            fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none',
          }}>
            <FaArrowLeft size={13} /> Back to All Posts
          </Link>
        </div>

      </div>
    </article>
  );
}
