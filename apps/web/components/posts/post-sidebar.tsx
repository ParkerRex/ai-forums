"use client";
import { OnlineUsers } from "@/web/components/online-users";
import { SidebarRoadmapComponent } from "@/web/components/sidebar-roadmap-component";

export default function PostSidebar() {
  return (
    <div className="space-y-2">
      {/* Online Users */}
      <OnlineUsers />

      {/* Roadmap */}
      <SidebarRoadmapComponent />
    </div>
  );
}
