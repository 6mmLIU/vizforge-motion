/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    outputFileTracingIncludes: {
      "/api/v1/render": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"]
    }
  }
};

export default nextConfig;
