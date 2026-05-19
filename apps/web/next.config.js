import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:8000/trpc/:path*",
      },
    ];
  },
};

export default nextConfig;
