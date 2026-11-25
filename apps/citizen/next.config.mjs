/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1';
// Automatically use /citizen basePath on Vercel when deployed under Services
const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
  ? process.env.NEXT_PUBLIC_BASE_PATH
  : (isVercel ? '/citizen' : '');

const nextConfig = {
  basePath: basePath,
};

export default nextConfig;

