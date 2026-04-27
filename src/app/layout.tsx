import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "Athlete Tracker — Tournament P&L",
  description: "Know before you go. Profit from every tournament.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${robotoMono.variable} font-sans bg-background text-foreground antialiased min-h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
