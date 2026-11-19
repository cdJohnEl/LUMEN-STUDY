/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: { serverComponentsExternalPackages: ["firebase-admin"] },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
