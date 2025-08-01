"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  Users,
  Receipt,
  BarChart3,
  FileText,
  Shield,
  ChevronLeft,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navItems: AdminNavItem[] = [
  {
    title: "Members",
    href: "/admin/members",
    icon: Users,
    description: "Manage member accounts and subscriptions",
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: Receipt,
    description: "View payment history and process refunds",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "View membership and revenue analytics",
  },
  {
    title: "Monitoring",
    href: "/admin/monitoring",
    icon: Activity,
    description: "Monitor webhook health and processing",
  },
  {
    title: "Reported Comments",
    href: "/admin/reported-comments",
    icon: FileText,
    description: "Moderate reported content",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);

  // Loading state
  if (isAdmin === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">
            Access Denied
          </h1>
          <p className="mb-6 text-gray-600">
            You don&apos;t have permission to access this area.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="flex h-full flex-col">
          {/* Admin Header */}
          <div className="border-b px-6 py-4">
            <Link href="/admin" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-gray-900" />
              <span className="text-lg font-semibold text-gray-900">
                Admin Panel
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-start rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 mt-0.5 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-gray-900"
                        : "text-gray-400 group-hover:text-gray-500",
                    )}
                  />
                  <div className="flex-1">
                    <div
                      className={cn(
                        "block",
                        isActive ? "text-gray-900" : "text-gray-700",
                      )}
                    >
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Back to Site */}
          <div className="border-t px-4 py-4">
            <Link
              href="/"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Site
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">{children}</main>
      </div>
    </div>
  );
}
