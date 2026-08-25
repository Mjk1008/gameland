/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Static sponsor proposal at /proposal (files in public/proposal/)
      { source: '/proposal', destination: '/proposal/index.html' },
      { source: '/proposal/', destination: '/proposal/index.html' },
    ]
  },
}
export default nextConfig
