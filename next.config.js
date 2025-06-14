/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `process` being defined
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve('process/browser')
      };
      
      config.plugins.push(
        new (require('webpack')).ProvidePlugin({
          process: 'process/browser',
        }),
      );
    }
    
    return config;
  },
}

module.exports = nextConfig 