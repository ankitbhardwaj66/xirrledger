import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export interface Post {
  slug: string;
  title: string;
  date: string;
  lastModified: string;
  excerpt: string;
  keywords: string[];
  content: string;
}

export async function getAllPosts(): Promise<Post[]> {
  // Check if content directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      const date = data.date || new Date().toISOString().split('T')[0];
      return {
        slug,
        title: data.title || slug,
        date,
        lastModified: data.lastModified || date,
        excerpt: data.excerpt || '',
        keywords: data.keywords || [],
        content,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const date = data.date || new Date().toISOString().split('T')[0];
  return {
    slug,
    title: data.title || slug,
    date,
    lastModified: data.lastModified || date,
    excerpt: data.excerpt || '',
    keywords: data.keywords || [],
    content,
  };
}
