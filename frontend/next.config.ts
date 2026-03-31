import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/:path*` : "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
