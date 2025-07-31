import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/web/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/web/components/header/header";
import { Toaster } from "@/web/components/ui/sonner";
import { NetworkStatusIndicator } from "@/web/components/error-display";
import { ThemeProvider } from "@/web/components/theme-provider";
import { GlobalSearch } from "@/web/components/header/global-search";
import { Footer } from "@/web/components/header/footer";
import { ActivateSubscriptionBanner } from "@/web/components/payments/activate-subscription-banner";

import localFont from "next/font/local";

const myFont = localFont({
  src: "../public/fonts/MonaspaceArgon-Regular.otf",
});

export const metadata: Metadata = {
  title: "The Place AI Engineers Hang Out and Learn",
  description:
    "The Best Place to Learn Alongside Engineers from companies like Google and Microsoft",
  icons: {
    icon: "/vai.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${myFont.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider dynamic>
            <ConvexClientProvider>
              <ActivateSubscriptionBanner />
              <Header />
              <div className="pb-[24px]">{children}</div>
              <Footer />
              <GlobalSearch />
              <Toaster />
              <NetworkStatusIndicator />
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
