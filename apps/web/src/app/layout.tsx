import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titres. Variable distincte du token Tailwind --font-display (voir globals.css).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// Applique le thème mémorisé avant le premier rendu (évite le flash clair/sombre).
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://qr.nscreative.cg"),
  title: "link.cg — Liens courts et générateur de QR code gratuit",
  description: "Raccourcissez vos liens et créez des QR codes à votre image, gratuitement et sans inscription. Liens et QR modifiables après impression, avec leurs statistiques.",
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
    title: "link.cg — Liens courts et QR codes",
    description: "Raccourcissez vos liens et créez des QR codes à votre image. Gratuit, sans inscription ; modifiables après impression avec un compte.",
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://qr.nscreative.cg",
  },
  twitter: {
    card: "summary_large_image",
    title: "link.cg — Liens courts et QR codes",
    description: "Raccourcissez vos liens et créez des QR codes à votre image. Gratuit, sans inscription ; modifiables après impression avec un compte.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
