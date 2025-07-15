import type { Metadata } from "next";
import { Mona_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/header/header";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatusIndicator } from "@/components/error-display";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalSearch } from "@/components/header/global-search";
import { Footer } from "@/components/header/footer";
import { ActivateSubscriptionBanner } from "@/components/payments/activate-subscription-banner";

// Google fonts
const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Including multiple weights
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono-sans",
  subsets: ["latin"],
  weight: "500", // DM Mono has 300, 400, 500 weights
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Place AI Engineers Build Together",
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
      <body className={`${dmMono.variable} ${monaSans.variable} antialiased`}>
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
