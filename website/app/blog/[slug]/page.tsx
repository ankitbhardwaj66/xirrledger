import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';

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
    return {
      title: 'Post Not Found',
    };
  }

  const url = `https://xirrledger.com/blog/${slug}`;

  return {
    title: `${post.title} | XIRR Ledger Blog`,
    description: post.excerpt,
    authors: [{ name: 'XIRR Ledger Team' }],
    keywords: ['XIRR calculator', 'portfolio returns', 'trading ledger', 'investment returns', 'brokerage charges', 'ledger-based XIRR'],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: url,
      siteName: 'XIRR Ledger',
      type: 'article',
      publishedTime: post.date,
      authors: ['XIRR Ledger Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="py-16">
      <div className="container-custom">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="max-w-4xl mx-auto mb-12">
          <div className="text-sm text-gray-500 mb-4">{post.date}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-xl text-gray-600 leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto prose prose-lg prose-blue prose-headings:font-bold prose-a:no-underline prose-a:font-semibold hover:prose-a:underline prose-pre:bg-gray-900 prose-pre:text-gray-100">
          <MDXRemote source={post.content} />
        </div>

        {/* Call to Action */}
        <div className="max-w-4xl mx-auto mt-16 pt-12 border-t-2 border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Calculate Your True XIRR?</h2>
            <p className="text-lg text-gray-700 mb-6">
              Upload your ledger and get accurate returns in minutes
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://xirrcalculatorr.streamlit.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 rounded-lg font-bold text-lg transition"
                style={{ backgroundColor: '#1f77b4', color: '#ffffff' }}
              >
                Try Calculator Now
              </a>
              <a
                href="/sample_report.pdf"
                download="XIRR_Sample_Report.pdf"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-bold text-lg transition border-2"
                style={{ borderColor: '#1f77b4', color: '#1f77b4' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Sample Report
              </a>
            </div>
          </div>
        </div>

        {/* Back to Blog */}
        <div className="text-center mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition"
            style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Posts
          </Link>
        </div>
      </div>
    </article>
  );
}
