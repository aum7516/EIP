import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit | EIP - Enterprise Intelligence Platform",
  description: "One core. Every business function. Backtesting, DataMart Analytics, and AI Assistant in one unified platform.",
  openGraph: {
    title: "Orbit | EIP",
    description: "Enterprise Intelligence Platform — Backtesting, DataMart & AI Assistant",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
