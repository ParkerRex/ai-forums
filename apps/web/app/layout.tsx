import { ThemeProvider } from "@/web/components/theme-provider";
import { Analytics } from "@vercel/analytics/react"
import Script from "next/script"
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetadata } from "./metadata";
import { defaultFont } from "../lib/font-config";
import ConvexClientProvider from "@/web/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "../components/header/header";
import { NetworkStatusIndicator } from "@/web/components/error-display";
import { GlobalSearch } from "../components/header/global-search";
import { Footer } from "../components/header/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
        <head>
          <BotIdClient protect={protectedRoutes} />
        </head>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ClerkProvider dynamic>
            <ConvexClientProvider>
              <Analytics />
              <Toaster />
              <Header />

              <div className="pb-[24px]">{children}</div>
              <Footer />
              <GlobalSearch />
              <NetworkStatusIndicator />
              <Script
    src="https://cdn.databuddy.cc/databuddy.js"
    data-client-id="cKQTB8wgJ9fpU28ml8Zdv"
    data-enable-batching="true"
    crossOrigin="anonymous"
    async
  ></Script>
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
