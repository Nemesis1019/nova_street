import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecommerce/shared', '@ecommerce/ui', '@ecommerce/api-client'],
};

export default nextConfig;
