import { ThemeProvider } from "../components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import { ConvexClientProvider } from "./convex-client-provider";
import Header from "../components/header/header";
import { NetworkStatusIndicator } from "../components/error-display";
import { GlobalSearch } from "../components/header/global-search";
import { Footer } from "../components/header/footer";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ConvexClientProvider>
            <Analytics />
            <Toaster />

            <div className="pb-[24px]">{children}</div>
            <Script
              src="https://cdn.databuddy.cc/databuddy.js"
              data-client-id="cKQTB8wgJ9fpU28ml8Zdv"
              data-enable-batching="true"
              crossOrigin="anonymous"
              async
            />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
