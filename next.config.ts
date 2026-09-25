import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Required to enable the 'use cache' directive and Cache Components (PPR)
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '24mb',
    },
    proxyClientMaxBodySize: '24mb',
  },
  images: {
    remotePatterns: [
      {
        // Wildcard: Blob store hostnames change when the store/token rotates
        // (e.g. wgpce2xm9p68d2cx... vs tosysoik0rjt4ojn...). Pinning one host
        // crashes every next/image avatar the moment uploads land elsewhere.
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/faculty/my-section/:path*',
        destination: '/faculty/my-sections/:path*',
        permanent: true,
      },
      {
        source: '/faculty/coordinators/:path*',
        destination: '/faculty/section-management/:path*',
        permanent: true,
      },
      {
        source: '/faculty/sections/:path*',
        destination: '/faculty/section-management/:path*',
        permanent: true,
      },
      {
        source: '/faculty/my-section',
        destination: '/faculty/my-sections',
        permanent: true,
      },
      {
        source: '/faculty/coordinators',
        destination: '/faculty/section-management',
        permanent: true,
      },
      {
        source: '/faculty/sections',
        destination: '/faculty/section-management',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
