// app/layout.tsx
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Main from "@/components/layout/main";
import Header from "@/components/layout/header";
import GlobalReloadSplash from "@/components/layout/global-reload-splash";

import "@/styles/globals.css";
import "@/styles/fonts.css";

import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/context/theme-provider";
import { ViewModeProvider } from "@/components/context/view-mode-context";
import { SettingsProvider } from "@/components/context/settings-context";
import { BreadcrumbProvider } from "@/components/context/breadcrumb-provider";
import Footer from "@/components/layout/footer";
import { CookieConsentWrapper } from "@/components/layout/cookie-consent-wrapper";

export const metadata: Metadata = {
  title: "Lotusflare",
  description: "An MTG inventory and deckbuilding tool by JFA",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <BreadcrumbProvider>
            <SettingsProvider>
              <ViewModeProvider>
                <NuqsAdapter>
                  <GlobalReloadSplash />
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <Main>{children}</Main>
                    <Footer />
                  </div>
                  <Toaster richColors position="bottom-right" />
                  <CookieConsentWrapper />
                  <NextTopLoader
                    color="#07b9bc"
                    initialPosition={0.08}
                    height={3}
                    showSpinner={false}
                  />
                </NuqsAdapter>
              </ViewModeProvider>
            </SettingsProvider>
          </BreadcrumbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
