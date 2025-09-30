import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import ConvexClientProvider from "@/components/convex-client-provider";
import { NetworkStatusIndicator } from "@/components/error-display";
import { Footer } from "@/components/header/footer";
import { GlobalSearch } from "@/components/header/global-search";
import Header from "@/components/header/header";
import { ActivateSubscriptionBanner } from "@/components/payments/activate-subscription-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

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
