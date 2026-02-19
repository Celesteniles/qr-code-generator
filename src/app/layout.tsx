import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://qr.nscreative.cg"),
  title: "Générateur de QR Code",
  description: "Générateur de QR code gratuit — personnalisez les couleurs, les formes et téléchargez en PNG ou SVG. Sans inscription.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "android-chrome", url: "/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
  openGraph: {
    title: "Générateur de QR Code",
    description: "Générateur de QR code gratuit — personnalisez les couleurs, les formes et téléchargez en PNG ou SVG. Sans inscription.",
    type: "website",
    images: [{ url: "/logo.png", alt: "Générateur de QR Code" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Générateur de QR Code",
    description: "Générateur de QR code gratuit — personnalisez les couleurs, les formes et téléchargez en PNG ou SVG. Sans inscription.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
