import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.etegram.com"),
  title: {
    default: "Etegram Docs",
    template: "%s | Etegram Docs",
  },
  description:
    "Official Etegram documentation for plugins, SDKs, webhook, and authentication flows.",
  openGraph: {
    title: "Etegram Docs",
    description:
      "Production integration guides for WordPress, WooCommerce, JavaScript, Go, Flutter, React Native, Kotlin, Swift, and Python.",
    siteName: "Etegram Docs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Etegram Docs",
    description: "Production integration guides for Etegram plugins and SDKs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
