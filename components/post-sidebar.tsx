"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnlineUsers } from "./online-users";
import { SidebarRoadmapComponent } from "./sidebar-roadmap-component";
import { NewsFeedWidget } from "./news/news-feed-widget";

export default function PostSidebar() {
  return (
    <div className="space-y-6">
      {/* AI News Feed */}
      <NewsFeedWidget />

      {/* Online Users */}
      <OnlineUsers />

      {/* Roadmap */}
      <SidebarRoadmapComponent />

      {/* About VAI Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About VAI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A community platform for AI professionals to share workflows, prompts, insights, and connect with like-minded practitioners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
