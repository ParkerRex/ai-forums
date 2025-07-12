import type { Metadata } from "next";
import { Mona_Sans, DM_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatusIndicator } from "@/components/error-display";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalSearch } from "@/components/global-search";
import { Footer } from "@/components/footer";
import { ReactivateBannerTop } from "@/components/reactivate-banner-top";
import { PaymentReminderBanner } from "@/components/payment-reminder-banner";

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

// Local font for code
const monaspaceArgon = localFont({
  src: "../public/fonts/MonaspaceArgon-Regular.otf",
  variable: "--font-monaspace-argon",
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
      <body
        className={`${dmMono.variable} ${monaSans.variable} ${monaspaceArgon.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider dynamic>
            <ConvexClientProvider>
              <ReactivateBannerTop />
              <PaymentReminderBanner />
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
