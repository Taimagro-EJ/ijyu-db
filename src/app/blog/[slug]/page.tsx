// src/app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
};

async function getPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !data) return null;
  return data as BlogPost;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: '記事が見つかりません' };
  return {
    title: post.title,
    description: post.description ?? undefined,
    openGraph: {
      title: post.title,
      description: post.description ?? undefined,
      url: `https://www.ijyu-data.com/blog/${post.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('published', true);
  return (data ?? []).map(p => ({ slug: p.slug }));
}

const CATEGORY_LABELS: Record<string, string> = {
  ranking: 'ランキング',
  comparison: '比較',
  deep_dive: '移住ガイド',
  simulation: 'シミュレーション',
  howto: 'ハウツー',
  column: 'コラム',
};

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 16 }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>移住DB</Link>
          <span style={{ color: '#475569' }}>/</span>
          <Link href="/blog" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>コラム</Link>
        </div>
      </header>

      <article style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          {post.category && (
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
          )}
          {date && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 12 }}>{date}</span>}
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.4, margin: '0 0 16px' }}>
          {post.title}
        </h1>

        {post.description && (
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: '0 0 32px', padding: '16px', background: '#f1f5f9', borderRadius: 8, borderLeft: '4px solid #0f172a' }}>
            {post.description}
          </p>
        )}

        {post.content ? (
          <div
            style={{ fontSize: 15, lineHeight: 1.9, color: '#1e293b' }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 16 }}>記事を準備中です</div>
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 999 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
          <Link href="/blog" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
            ← コラム一覧に戻る
          </Link>
        </div>
      </article>
    </div>
  );
}
