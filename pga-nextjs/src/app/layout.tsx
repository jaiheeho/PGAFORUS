import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/ui";
import { NextAuthProvider } from "@/lib/nextauth-context";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PGA FOR US - AI-Powered Golf Betting Insights",
  description: "Fantasy golf betting platform with real-time PGA Tour leaderboards and point calculations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextAuthProvider>
          <Layout>
            {children}
          </Layout>
        </NextAuthProvider>
      </body>
    </html>
  );
}
