/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (agreement PDFs, avatars, etc.)
      { protocol: "https", hostname: "*.supabase.co" },
      // Leaflet/OSM tiles
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
