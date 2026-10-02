/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.loca.lt'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
