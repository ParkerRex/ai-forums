"use client"

import * as React from "react"
import {
  Bell,
  CreditCard,
  User,
  ExternalLink,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { subscriptionAnalytics } from "@/lib/analytics"
import { formatTierName } from "@/lib/format"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

const settingsNav = [
  { name: "Notifications", icon: Bell },
  { name: "Billing", icon: CreditCard },
  { name: "Account", icon: User },
]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState("Notifications")
  const [isSubscriptionLoading, setIsSubscriptionLoading] = React.useState(false)
  const router = useRouter()
  const { user } = useUser()
  const member = useQuery(api.members.getMemberByEmail, {
    email: user?.emailAddresses[0]?.emailAddress || "",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your account settings and preferences.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsNav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.name)}
                          isActive={item.name === activeSection}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4 w-full">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                
                {/* Mobile navigation */}
                <div className="flex gap-1 ml-auto md:hidden">
                  {settingsNav.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => setActiveSection(item.name)}
                      className={`p-2 rounded-md transition-colors ${
                        item.name === activeSection
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                      aria-label={item.name}
                    >
                      <item.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col p-4 pt-0">
              {activeSection === "Billing" && member && member.tier !== "free" ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Subscription</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You are currently on the <span className="font-medium">{formatTierName(member.tier || "free")}</span> plan.
                    </p>
                    <Button
                      onClick={() => {
                        subscriptionAnalytics.manageClicked(member.tier || "free");
                        setIsSubscriptionLoading(true);
                        onOpenChange(false);
                        router.push("/settings/billing");
                      }}
                      disabled={isSubscriptionLoading}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Subscription
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                      {activeSection === "Notifications" && <Bell className="h-8 w-8 text-muted-foreground" />}
                      {activeSection === "Billing" && <CreditCard className="h-8 w-8 text-muted-foreground" />}
                      {activeSection === "Account" && <User className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">{activeSection}</h3>
                      {activeSection === "Billing" && member?.tier === "free" ? (
                        <p className="text-sm text-muted-foreground max-w-sm">
                          You are on the free plan. Upgrade to access premium features.
                        </p>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            Coming soon
                          </Badge>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            {activeSection === "Notifications" && "Customize how and when you receive notifications."}
                            {activeSection === "Billing" && "Manage your subscription and payment methods."}
                            {activeSection === "Account" && "Update your account information and preferences."}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}