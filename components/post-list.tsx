import PostCard from "@/components/post-card";
import PostHeader from "./post-header";

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
      "I've been coding for 10+ years and recently discovered rubber duck debugging. Game changer. What are your hidden gems?",
  },
  {
    id: 2,
    title:
      "Built a CLI tool to automatically generate API documentation from TypeScript interfaces",
    author: "typescriptdev",
    community: "typescript",
    timeAgo: "4h",
    votes: 89,
    comments: 21,
    content:
      "Tired of maintaining docs manually? This tool parses your TS files and generates markdown docs. Open source and looking for feedback!",
  },
  {
    id: 3,
    title: "Why I switched from React to Svelte for my side projects",
    author: "frontend_explorer",
    community: "webdev",
    timeAgo: "6h",
    votes: 156,
    comments: 78,
    content:
      "After 3 years with React, I gave Svelte a try. Here's what I learned and why I'm not going back for personal projects.",
  },
  {
    id: 4,
    title: "Docker vs Podman in 2024: A practical comparison",
    author: "containerdev",
    community: "devops",
    timeAgo: "8h",
    votes: 203,
    comments: 92,
    content:
      "Spent the last month migrating our infrastructure. Here's a detailed breakdown of the differences that actually matter.",
  },
  {
    id: 5,
    title: "The hidden costs of microservices nobody talks about",
    author: "architect_thoughts",
    community: "architecture",
    timeAgo: "12h",
    votes: 341,
    comments: 134,
    content:
      "Everyone talks about the benefits, but here are the real challenges we faced after 2 years of microservices in production.",
  },
];

export default function PostList() {
  return (
    <div className="space-y-4">
      <PostHeader />
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
