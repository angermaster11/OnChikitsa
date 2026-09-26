/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor loads a static build from the `out/` folder.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
