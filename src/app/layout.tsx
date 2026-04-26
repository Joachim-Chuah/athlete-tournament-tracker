import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Athlete Tracker — Tournament P&L",
  description: "Know before you go. Profit from every tournament.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.variable} font-sans bg-zinc-950 text-white antialiased min-h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
