import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { CLOSED_BETA_LABEL, PRODUCT_NAME } from "@/lib/product/beta";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} - ${CLOSED_BETA_LABEL}`,
  description:
    "Cohost AI closed beta control plane for Hostify-backed guest messaging, runtime routing, and operator visibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-grid-soft flex flex-col">{children}</body>
    </html>
  );
}
