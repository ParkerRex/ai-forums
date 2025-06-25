import { notFound } from "next/navigation";
import PostDetail from "@/components/post-detail";
import PostSidebar from "@/components/post-sidebar";
import PostHeader from "@/components/post-header";

// TODO: Update with real data from Db
const posts = [
  {
    id: 1,
    title:
      "What's your favorite debugging technique that most developers don't know about?",
    author: "debugmaster",
    community: "programming",
    timeAgo: "2h",
    votes: 127,
    comments: 43,
    content:
      "I've been coding for 10+ years and recently discovered rubber duck debugging. Game changer. What are your hidden gems?\n\nFor those who don't know, rubber duck debugging is when you explain your code line by line to a rubber duck (or any inanimate object). The act of verbalizing your logic often helps you spot the bug.\n\nWhat debugging techniques have saved you hours of frustration?",
    submittedDate: "Jan 15 2025",
    upvotePercentage: 89,
  },
  {
    id: 2,
    title:
      "Built a CLI tool to automatically generate API documentation from TypeScript interfaces",
    author: "parkerrex",
    community: "typescript",
    timeAgo: "4h",
    votes: 89,
    comments: 21,
    content:
      "Tired of maintaining docs manually? This tool parses your TS files and generates markdown docs. Open source and looking for feedback!\n\nI'm trying to self-host this tool on my development server (16GB RAM, ARM architecture) but running into compatibility issues, especially with some dependencies that seem designed for x86.\n\nHas anyone successfully set this up on ARM? Could you share any workarounds or guides for ARM compatibility? I'd appreciate any advice, documentation, or video tutorials you've found helpful. Thanks in advance!",
    submittedDate: "Jan 15 2025",
    upvotePercentage: 92,
  },
];

interface PageProps {
  params: { id: string };
}

export default function PostPage({ params }: PageProps) {
  const post = posts.find((p) => p.id === Number.parseInt(params.id));

  if (!post) {
    notFound();
  }

  return (
    <div className="font-mono min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PostHeader />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <PostDetail post={post} />
          </div>
          <div className="lg:col-span-1">
            <PostSidebar post={post} />
          </div>
        </div>
      </div>
    </div>
  );
}
