import type { Metadata } from "next";
import "./globals.css";

// Note: no next/font/google here on purpose. Google Fonts fetch fails in
// this build environment, so fonts come from Fontshare CSS (Clash Display /
// General Sans) with system fallbacks, which also keeps the build offline-safe.
export const metadata: Metadata = {
  title: "rafax01 — Creative Developer",
  description:
    "rafax01 builds finished web and Android products, from idea to shipped. Next.js, React, TypeScript, and motion-first interfaces.",
  metadataBase: new URL("https://rafax01.dev"),
  openGraph: {
    title: "rafax01 — Creative Developer",
    description: "Finished products, not just pages. Web + Android, from idea to shipped.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "rafax01 — Creative Developer" }],
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0F] text-[#FAFAFA] antialiased">{children}</body>
    </html>
  );
}
