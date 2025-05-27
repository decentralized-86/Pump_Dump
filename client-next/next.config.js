/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow Telegram's domain for images
  images: {
    domains: ['t.me', 'telegram.org'],
  },
  // Required for Telegram Web App
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://t.me https://*.telegram.org https://telegram.org;"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 