import type { NextConfig } from "next";

// GitHub Pages deploy (Netlify cancelled by user 2026-11-02):
// static export produces out/ which Pages can serve directly.
// basePath is set at build time via NEXT_BASE_PATH, e.g.
// NEXT_BASE_PATH=/rafax01-portfolio for a project site, or empty for a
// root user site (Rafax01x.github.io).
const basePath = process.env.NEXT_BASE_PATH ?? "";
const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
