import path from 'node:path'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  /* config options here */
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'duxcekjqmyynvmswmgwu.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
};

export default nextConfig;
