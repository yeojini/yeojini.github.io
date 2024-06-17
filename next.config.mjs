/** @type {import('next').NextConfig} */

const debug = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  assetPrefix: !debug ? `https://yeojini.github.io/` : "",
  output: 'export',
};

export default nextConfig;
