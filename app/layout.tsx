import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rafax01 · Pixels change. Taste stays.",
  description: "rafax01 — Pixels change. Taste stays.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Pixelify+Sans:wght@600;700&family=Plus+Jakarta+Sans:wght@700;800;900&family=Silkscreen:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
