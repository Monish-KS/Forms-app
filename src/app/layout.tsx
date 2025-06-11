import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collaborative Forms",
  description: "Real-time collaborative form filling system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
