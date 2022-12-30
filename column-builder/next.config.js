/** @type {import('next').NextConfig} */
const path = require("path");

const packageSrc = (name) =>
  path.resolve(__dirname, "deps", "web-components", "packages", name, "src");

const nextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_BASE_URL,
  basePath: process.env.NEXT_PUBLIC_BASE_URL,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  webpack: (config, options) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "~": path.resolve(__dirname, "src"),
      "@macrostrat/form-components": packageSrc("form-components"),
      "@macrostrat/data-components": packageSrc("data-components"),
      "@macrostrat/ui-components": packageSrc("ui-components"),
    };

    return config;
  },
};

module.exports = nextConfig;
