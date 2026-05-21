/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Headroom for longer voice memos (a ~10-min recording can approach 10mb).
      bodySizeLimit: "25mb",
    },
  },
  // sharp uses native bindings — tell Next.js not to try to bundle it
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile photos
      },
    ],
  },
};

export default nextConfig;
