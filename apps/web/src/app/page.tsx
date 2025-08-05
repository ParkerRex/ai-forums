"use client";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import Testimonials from "@/components/testimonials";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="flex items-center justify-between px-6 py-4">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Link href="/" className="flex items-center" aria-label="Home">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={80}
                height={16}
                priority
              />
            </Link>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.9447 21L22.8748 11H25.7559L23.8258 21H20.9447Z" fill="white"/><path d="M18.1507 21L17.9409 19.5175H14.5982L13.857 21H10.9479L16.3884 11H19.3115L21.1577 21H18.1507ZM16.6122 15.5315L15.6052 17.5315H17.6612L17.3814 15.5315C17.3115 15.042 17.2416 14.2448 17.2416 14.2448H17.2136C17.2136 14.2448 16.85 15.042 16.6122 15.5315Z" fill="white"/><path d="M7.3007 21L6 11H8.92308L9.38462 15.6993C9.46853 16.5524 9.52448 17.6434 9.52448 17.6434H9.53846C9.53846 17.6434 9.98602 16.5524 10.3776 15.6993L12.5175 11H15.4825L10.5315 21H7.3007Z" fill="white"/></svg>`;
                navigator.clipboard.writeText(svg).then(() => {
                  toast("SVG copied to clipboard");
                });
              }}
            >
              Copy as SVG
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <nav className="space-x-6 text-sm font-medium">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
          <Link href="/prompts" className="hover:underline">
            Prompts
          </Link>
          <Link href="/members" className="hover:underline">
            Members
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-6 max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-6xl">
          Information is Power.
          <br />
          Cut the noise.
        </h1>
        <p className="mb-10 max-w-xl text-muted-foreground">
          Join a community of developers focused on signal-over-noise learning.
          Curated resources, thoughtful discussions, zero fluff.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-none bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
          >
            I already have an account
          </Link>
        </div>
      </section>
      {/* Testimonials */}
      <Testimonials />
    </main>
  );
}
