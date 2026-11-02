import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rafax01",
  description: "Portfolio rafax01 — web and Android projects on GitHub.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
