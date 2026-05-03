import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/layout/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Class Action Sentinel",
  description: "Track and analyze class action settlements with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex flex-col min-h-screen bg-bg-primary">
          <Nav />
          <main className="flex-1 w-full max-w-7xl mx-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
