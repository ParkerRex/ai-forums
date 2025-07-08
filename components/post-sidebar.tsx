"use client";
import { OnlineUsers } from "./online-users";
import { SidebarRoadmapComponent } from "./sidebar-roadmap-component";
import { NewsFeedWidget } from "./news/news-feed-widget";

export default function PostSidebar() {
  return (
    <div className="space-y-2">
      {/* AI News Feed */}
      <NewsFeedWidget />

      {/* Online Users */}
      <OnlineUsers />

      {/* Roadmap */}
      <SidebarRoadmapComponent />

      {/* About VAI Card */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">About VAI</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A community platform for AI professionals to share workflows, prompts, insights, and connect with like-minded practitioners.
        </p>
      </div>
    </div>
  );
}
