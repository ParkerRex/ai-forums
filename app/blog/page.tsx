import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold mb-4">Blog</h1>
      </div>

      {/* Minimalist table design inspired by neil.computer */}
      <div className="font-mono text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-8 font-normal text-muted-foreground">Date</th>
              <th className="text-left py-2 font-normal text-muted-foreground">Title</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr
                key={post.slug}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 pr-8 text-muted-foreground whitespace-nowrap">
                  {new Date(post.date)
                    .toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })
                    .replace(/\//g, "-")}
                </td>
                <td className="py-3">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    {post.title}
                    <span className="text-muted-foreground">→</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
