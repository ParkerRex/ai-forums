"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Users, Receipt, BarChart3, FileText, Shield, ChevronLeft } from "lucide-react";
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
    description: "Manage member accounts and subscriptions"
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: Receipt,
    description: "View payment history and process refunds"
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "View membership and revenue analytics"
  },
  {
    title: "Reported Comments",
    href: "/admin/reported-comments",
    icon: FileText,
    description: "Moderate reported content"
  }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
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
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this area.</p>
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
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
        <div className="h-full flex flex-col">
          {/* Admin Header */}
          <div className="px-6 py-4 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-gray-900" />
              <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-start px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "flex-shrink-0 w-5 h-5 mr-3 mt-0.5",
                      isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  <div className="flex-1">
                    <div className={cn(
                      "block",
                      isActive ? "text-gray-900" : "text-gray-700"
                    )}>
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Back to Site */}
          <div className="px-4 py-4 border-t">
            <Link
              href="/"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Site
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  );
}