import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { ClerkProvider } from '@clerk/nextjs'

import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import ConvexClientProvider from "../components/convex-client-provider"


export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${defaultFont.className} font-sans antialiased`}>
      <ClerkProvider>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ConvexClientProvider>
            <Toaster />
            <div className="pb-[24px]">{children}</div>
          </ConvexClientProvider>
        </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
