import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPostSlugs } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Custom components for MDX
const components = {
  h1: (props: any) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
  p: (props: any) => <p className="mb-4 leading-7" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
  li: (props: any) => <li className="ml-4" {...props} />,
  code: (props: any) => {
    const { children, ...rest } = props;
    return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>{children}</code>;
  },
  pre: (props: any) => (
    <pre className="bg-muted p-4 rounded-none overflow-x-auto mb-4 text-sm" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-border pl-4 italic mb-4" {...props} />
  ),
  a: (props: any) => (
    <a className="text-primary hover:underline" {...props} />
  ),
};

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }
  
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Navigation */}
      <div className="mb-8 font-mono text-sm">
        <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Back to blog
        </Link>
      </div>
      
      {/* Post header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4 font-mono">{post.title}</h1>
        <div className="text-sm text-muted-foreground font-mono">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </header>
      
      {/* Post content */}
      <div className="prose prose-neutral max-w-none">
        <MDXRemote 
          source={post.content} 
          components={components}
          options={{
            mdxOptions: {
              rehypePlugins: [rehypeHighlight],
            },
          }}
        />
      </div>
    </article>
  );
}