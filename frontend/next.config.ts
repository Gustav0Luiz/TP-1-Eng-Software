// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Faz o Turbopack observar só este projeto (a pasta "frontend")
    root: __dirname,
  },
};

export default nextConfig;
