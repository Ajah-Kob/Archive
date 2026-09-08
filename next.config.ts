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
        protocol: 'https',
        hostname: 'tosysoik0rjt4ojn.public.blob.vercel-storage.com',
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
        destination: '/faculty/sections/:path*',
        permanent: true,
      },
      {
        source: '/faculty/my-section',
        destination: '/faculty/my-sections',
        permanent: true,
      },
      {
        source: '/faculty/coordinators',
        destination: '/faculty/sections',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
