"use client";
import { OnlineUsers } from "./online-users";
import { SidebarRoadmapComponent } from "./sidebar-roadmap-component";

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
