import { getAllPosts } from '@/lib/blog';
import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL = 'https://xirrledger.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                        lastModified: '2026-04-18' },
    { url: `${BASE_URL}/how-it-works/`,           lastModified: '2026-03-15' },
    { url: `${BASE_URL}/features/`,               lastModified: '2026-03-15' },
    { url: `${BASE_URL}/blog/`,                   lastModified: '2026-04-18' },
    { url: `${BASE_URL}/how-to-calculate-xirr/`,  lastModified: '2026-03-02' },
    { url: `${BASE_URL}/faq/`,                    lastModified: '2026-04-18' },
    { url: `${BASE_URL}/contact/`,                lastModified: '2026-02-17' },
    { url: `${BASE_URL}/about/`,                  lastModified: '2026-04-09' },
    { url: `${BASE_URL}/privacy-policy/`,         lastModified: '2026-04-09' },
    { url: `${BASE_URL}/terms-of-service/`,       lastModified: '2026-04-09' },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.lastModified,
  }));

  return [...staticPages, ...blogPages];
}
