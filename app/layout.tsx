import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bhoomisetu — Digital Land Records & Transfer Platform",
  description: "A hierarchical, role-based digital land-record and land-transfer platform for the Indian revenue administration. View land records on GIS maps, manage transfers, and track applications through the revenue officer chain.",
  keywords: ["land records", "land transfer", "Bhoomisetu", "revenue", "GIS", "Assam", "digital land"],
  authors: [{ name: "Bhoomisetu Platform" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          href="https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">{children}</body>
    </html>
  );
}
