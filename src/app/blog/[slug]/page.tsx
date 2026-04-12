import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/components/blog/markdownComponents';
import ChatCTA from '@/components/blog/ChatCTA';
import TableOfContents from '@/components/blog/TableOfContents';
import AuthorProfile from '@/components/blog/AuthorProfile';
import RelatedArticles from '@/components/blog/RelatedArticles';
import Breadcrumb, { ShareButtons } from '@/components/blog/Breadcrumb';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

type BlogPost = { id: number; slug: string; title: string; description: string | null; content: string | null; category: string | null; tags: string[] | null; published_at: string | null };

async function getPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('published', true).single();
  if (error || !data) return null;
  return data as BlogPost;
}

async function getRelatedPosts(): Promise<{ slug: string; title: string }[]> {
  const { data } = await supabase.from('blog_posts').select('slug, title').eq('published', true).order('published_at', { ascending: false }).limit(10);
  return (data ?? []) as { slug: string; title: string }[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: '記事が見つかりません' };
  return { title: post.title, description: post.description ?? undefined };
}

const CATEGORY_LABELS: Record<string, string> = { ranking: 'ランキング', comparison: '比較', deep_dive: '移住ガイド', simulation: 'シミュレーション', howto: 'ハウツー', column: 'コラム' };

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([getPost(slug), getRelatedPosts()]);
  if (!post) notFound();
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const postUrl = `https://www.ijyu-data.com/blog/${slug}`;
  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#F7F5F2' }}>
      <header style={{ background: '#454034', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#A19679', fontSize: 13, textDecoration: 'none' }}>移住DB</Link>
          <span style={{ color: '#6B6457' }}>/</span>
          <Link href="/blog" style={{ color: '#A19679', fontSize: 13, textDecoration: 'none' }}>コラム</Link>
        </div>
      </header>
      <article style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <Breadcrumb title={post.title} />
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          {post.category && <span style={{ fontSize: 11, color: '#F7F5F2', fontWeight: 700, background: '#D46B3A', padding: '3px 10px', borderRadius: 999 }}>{CATEGORY_LABELS[post.category] ?? post.category}</span>}
          {date && <span style={{ fontSize: 12, color: '#9E9488' }}>{date}</span>}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1814', lineHeight: 1.5, margin: '0 0 20px', fontFamily: "'Shippori Mincho', serif" }}>{post.title}</h1>
        {post.description && <p style={{ fontSize: 15, color: '#6B6457', lineHeight: 1.9, margin: '0 0 24px', padding: '16px 20px', background: '#F2F0EC', borderRadius: 8, borderLeft: '4px solid #D46B3A' }}>{post.description}</p>}
        <TableOfContents />
        {post.content ? (
          <div style={{ fontSize: 15, lineHeight: 1.9, color: '#454034', letterSpacing: '0.03em' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{post.content}</ReactMarkdown>
            <ChatCTA />
            <ShareButtons url={postUrl} title={post.title} />
            <AuthorProfile />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9E9488' }}><div style={{ fontSize: 16 }}>記事を準備中です</div></div>
        )}
        {post.tags && post.tags.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E8E4DF', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {post.tags.map(tag => <span key={tag} style={{ fontSize: 12, background: '#F2F0EC', color: '#6B6457', padding: '4px 10px', borderRadius: 999 }}>#{tag}</span>)}
          </div>
        )}
        <RelatedArticles currentSlug={slug} articles={allPosts} />
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E8E4DF' }}>
          <Link href="/blog" style={{ fontSize: 13, color: '#D46B3A', textDecoration: 'none' }}>← コラム一覧に戻る</Link>
        </div>
      </article>
    </div>
  );
}
