/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server for Docker deploys.
  output: "standalone",
};

export default nextConfig;
