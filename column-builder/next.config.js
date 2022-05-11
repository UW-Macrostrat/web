/** @type {import('next').NextConfig} */
const path = require("path");

const packageSrc = (name) =>
  path.resolve(__dirname, "deps", "ui-components", "packages", name, "src");

const nextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_BASE_URL,
  basePath: process.env.NEXT_PUBLIC_BASE_URL,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  webpack: (config, options) => {
    (config.resolve.alias["~"] = path.resolve(__dirname, "src")),
      (config.resolve.alias["@macrostrat/form-components"] =
        packageSrc("form-components")),
      (config.resolve.alias["@macrostrat/data-components"] =
        packageSrc("data-components")),
      (config.resolve.alias["@macrostrat/ui-components"] =
        packageSrc("ui-components")),
      (config.resolve.alias["react"] = path.resolve("./node_modules/react")),
      (config.resolve.alias["@macrostrat/hyper"] = path.resolve(
        "./node_modules/@macrostrat/hyper"
      ));

    return config;
  },
};

module.exports = nextConfig;
