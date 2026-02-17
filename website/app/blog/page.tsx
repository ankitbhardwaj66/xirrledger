import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="py-16">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Blog & Updates</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Latest news, features, and tips for using XIRR Ledger
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-gray-50 rounded-2xl p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <h2 className="text-2xl font-bold mb-2">No posts yet</h2>
            <p className="text-gray-600 mb-6">
              We're working on creating valuable content for you. Check back soon!
            </p>
            <Link href="/" className="inline-block px-6 py-3 rounded-lg font-semibold transition" style={{ backgroundColor: '#1f77b4', color: '#ffffff' }}>
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <time className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#e3f2fd', color: '#1f77b4' }}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </time>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" style={{ color: '#1f77b4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  <h2 className="text-xl font-bold mb-3 text-gray-900 leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-gray-600 leading-relaxed mb-6" style={{ fontSize: '0.95rem' }}>
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: '#1f77b4' }}>
                    <span>Read Article</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
