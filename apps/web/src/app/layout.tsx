import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import PWAInstall from "@/components/PWAInstall";

export const metadata: Metadata = {
  title: "OffMess - Campus Food Pre-Order",
  description: "Pre-order meals from campus canteens and skip the queue",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OffMess",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white dark:bg-neutral-950">
        <ThemeProvider>
          <AuthProvider>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 pb-20 md:pb-4 sm:gap-6 sm:px-6 sm:py-6 lg:gap-8 lg:px-6 lg:py-8">
              <NavBar />
              <main className="flex-1">{children}</main>
            </div>
            <BottomNav />
            <PWAInstall />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
