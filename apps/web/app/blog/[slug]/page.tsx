import { notFound } from "next/navigation";
import { getPostBySlug, getAllPostSlugs } from "@/lib/blog";
import { compileMDX } from "next-mdx-remote/rsc";
import Link from "next/link";
import { HTMLAttributes, AnchorHTMLAttributes } from "react";
import { CodeBlock, InlineCode } from "@/web/components/mdx/code-block";
import { YouTubeEmbed } from "@/web/components/mdx/youtube-embed";
import { LinkPreview } from "@/web/components/ui/link-preview";
import rehypePrettyCode from "rehype-pretty-code";
import type { Element } from "hast";
import "@/styles/highlight-overrides.css";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = HTMLAttributes<HTMLParagraphElement>;
type ListProps = HTMLAttributes<HTMLUListElement | HTMLOListElement>;
type ListItemProps = HTMLAttributes<HTMLLIElement>;
type BlockquoteProps = HTMLAttributes<HTMLQuoteElement>;
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

// Custom components for MDX
const components = {
  h1: (props: HeadingProps) => (
    <h1 className="mb-4 mt-8 text-3xl font-bold" {...props} />
  ),
  h2: (props: HeadingProps) => (
    <h2 className="mb-3 mt-6 text-2xl font-bold" {...props} />
  ),
  h3: (props: HeadingProps) => (
    <h3 className="mb-2 mt-4 text-xl font-bold" {...props} />
  ),
  p: (props: ParagraphProps) => <p className="mb-4 leading-7" {...props} />,
  ul: (props: ListProps) => (
    <ul className="mb-4 list-inside list-disc space-y-1" {...props} />
  ),
  ol: (props: ListProps) => (
    <ol className="mb-4 list-inside list-decimal space-y-1" {...props} />
  ),
  li: (props: ListItemProps) => <li className="ml-4" {...props} />,
  code: InlineCode,
  pre: CodeBlock,
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className="border-border mb-4 border-l-4 pl-4 italic"
      {...props}
    />
  ),
  a: (props: AnchorProps) => (
    <a className="text-primary hover:underline" {...props} />
  ),
  LinkPreview,
  YouTubeEmbed,
};

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { content } = await compileMDX({
    source: post.content,
    components,
    options: {
      mdxOptions: {
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: {
                dark: "dark-plus",
                light: "github-light",
              },
              keepBackground: false,
              defaultLang: {
                block: "plaintext",
                inline: "plaintext",
              },
              grid: false,
              transformers: [
                {
                  name: "copy-button",
                  pre(node: Element) {
                    // Add copy button container class
                    node.properties = node.properties || {};
                    const existingClasses = node.properties.className;
                    if (Array.isArray(existingClasses)) {
                      node.properties.className = [
                        ...existingClasses,
                        "group",
                        "relative",
                      ];
                    } else if (typeof existingClasses === "string") {
                      node.properties.className = [
                        existingClasses,
                        "group",
                        "relative",
                      ];
                    } else {
                      node.properties.className = ["group", "relative"];
                    }
                  },
                },
              ],
            },
          ],
        ],
      },
    },
  });

  return (
    <article className="prose prose-gray dark:prose-invert mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center text-sm no-underline"
      >
        ← Back to Blog
      </Link>

      <header className="mb-8">
        <h1 className="mb-4 text-4xl font-bold">{post.title}</h1>
        <p className="text-muted-foreground">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div>{content}</div>
    </article>
  );
}
