/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optimisations pour production
  poweredByHeader: false,
  compress: true,
  // Augmenter la limite de taille pour les uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Redirection des anciennes URLs de CV vers la nouvelle API
  async rewrites() {
    return [
      {
        source: '/uploads/cv/:filename*',
        destination: '/api/cv/:filename*',
      },
    ]
  },
}

module.exports = nextConfig
