import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: '記事が見つかりません' };
  return {
    title: post.title,
    description: post.description ?? undefined,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  ranking: 'ランキング',
  comparison: '比較',
  deep_dive: '移住ガイド',
  simulation: 'シミュレーション',
  howto: 'ハウツー',
  column: 'コラム',
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center' }}>
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
          <div style={{ fontSize: 15, lineHeight: 1.9, color: '#1e293b' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: () => null,
                h2: ({children}) => <h2 style={{fontSize:22, fontWeight:700, color:'#0f172a', margin:'32px 0 12px', paddingBottom:8, borderBottom:'2px solid #e2e8f0'}}>{children}</h2>,
                h3: ({children}) => <h3 style={{fontSize:18, fontWeight:600, color:'#1e293b', margin:'24px 0 8px'}}>{children}</h3>,
                table: ({children}) => <div style={{overflowX:'auto', margin:'16px 0'}}><table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>{children}</table></div>,
                th: ({children}) => <th style={{background:'#f1f5f9', padding:'8px 12px', textAlign:'left', borderBottom:'2px solid #e2e8f0', fontWeight:600}}>{children}</th>,
                td: ({children}) => <td style={{padding:'8px 12px', borderBottom:'1px solid #f1f5f9'}}>{children}</td>,
                blockquote: ({children}) => <blockquote style={{borderLeft:'4px solid #0f172a', paddingLeft:16, margin:'16px 0', color:'#475569', background:'#f8fafc', padding:'12px 16px', borderRadius:'0 8px 8px 0'}}>{children}</blockquote>,
                strong: ({children}) => <strong style={{fontWeight:700, color:'#0f172a'}}>{children}</strong>,
              }}
            >{post.content}</ReactMarkdown>
          </div>
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
