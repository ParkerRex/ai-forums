"use client";

import { Bell, User } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const settingsNav = [
  { name: "Notifications", icon: Bell },
  { name: "Account", icon: User },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState("Notifications");

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
            <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
              <div className="flex w-full items-center gap-2 px-4">
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

                <div className="ml-auto flex gap-1 md:hidden">
                  {settingsNav.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => setActiveSection(item.name)}
                      className={`rounded-md p-2 transition-colors ${
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
              <div className="flex flex-1 items-center justify-center">
                <div className="space-y-4 text-center">
                  <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                    {activeSection === "Notifications" && (
                      <Bell className="text-muted-foreground h-8 w-8" />
                    )}
                    {activeSection === "Account" && (
                      <User className="text-muted-foreground h-8 w-8" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{activeSection}</h3>
                    <Badge variant="secondary" className="text-xs">
                      Coming soon
                    </Badge>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      {activeSection === "Notifications" &&
                        "Customize how and when you receive notifications."}
                      {activeSection === "Account" &&
                        "Update your account information and preferences."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
