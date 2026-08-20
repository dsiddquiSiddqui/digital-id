import path from 'node:path'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    return [
      { source: '/staff', destination: '/v2/staff', permanent: true },
      { source: '/staff/new', destination: '/v2/staff/new', permanent: true },
      { source: '/staff/:id/edit', destination: '/v2/staff/:id/edit', permanent: true },
      { source: '/staff/:id/issue-id', destination: '/v2/staff/:id/issue-id', permanent: true },
      { source: '/staff/:id/password', destination: '/v2/staff/:id/password', permanent: true },
      { source: '/staff/:id', destination: '/v2/staff/:id', permanent: true },
      { source: '/staff-ids/:id/edit', destination: '/v2/staff-ids/:id/edit', permanent: true },
    ]
  },
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
