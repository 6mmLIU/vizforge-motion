/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    outputFileTracingIncludes: {
      "/api/v1/render": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*", "./fonts/**/*"]
    }
  }
};

export default nextConfig;
